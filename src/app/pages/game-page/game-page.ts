import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { GameService, GameState, Color } from '../../services/game.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-game-page',
  imports: [CommonModule],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css'
})
export class GamePage implements OnInit, OnDestroy {
  roomId: string | null = null;
  roomName: string | null = null;
  colorCount: number | null = null;
  currentUser: any = null;
  isLoading = true;
  error: string | null = null;
  
  // Estado del juego
  gameState: GameState | null = null;
  availableColors: Color[] = [];
  selectedColors: string[] = [];
  currentSequence: string[] = [];
  playerSequence: string[] = [];
  showingSequence = false;
  waitingForPlayer = false;
  gameStarted = false;
  isPlayerTurn = false;
  
  // Suscripciones
  private gamePollingSubscription: Subscription | null = null;
  private sequenceSubscription: Subscription | null = null;
  
  // Configuración
  private readonly POLLING_INTERVAL = 2000; // 2 segundos
  private readonly SEQUENCE_SPEED = 1000; // 1 segundo por color

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService,
    private gameService: GameService
  ) {}

  ngOnInit(): void {
    // Obtener parámetros de la ruta
    this.route.params.subscribe(params => {
      this.roomId = params['roomId'];
      
      console.log('Room ID de parámetros:', this.roomId);
      
      if (!this.roomId) {
        this.error = 'ID de partida no válido';
        return;
      }
      
      this.initializeGame();
    });
  }
  
  ngOnDestroy(): void {
    this.stopGamePolling();
    if (this.sequenceSubscription) {
      this.sequenceSubscription.unsubscribe();
    }
    this.gameService.clearGameState();
  }

  private async initializeGame(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Obtener información del usuario
      this.currentUser = this.roomService.getCurrentUserInfo();
      if (!this.currentUser) {
        this.router.navigate(['/login']);
        return;
      }
      
      // Obtener detalles de la sala
      await this.loadRoomDetails();
      
      // Inicializar estado del juego
      await this.loadGameState();
      
      // Iniciar polling del estado del juego
      this.startGamePolling();
      
      this.isLoading = false;
    } catch (error) {
      console.error('Error inicializando juego:', error);
      this.error = 'Error al cargar el juego';
      this.isLoading = false;
    }
  }

  private async loadRoomDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomService.getRoomDetails(this.roomId!).subscribe({
        next: (response) => {
          const room = response.data;
          this.roomName = room.name;
          this.colorCount = room.colorCount;
          this.selectedColors = room.selectedColors || [];
          
          console.log('Detalles de la sala recibidos:', {
            roomId: room.id,
            name: room.name,
            colorCount: room.colorCount,
            selectedColors: room.selectedColors,
            rawResponse: response
          });
          
          // Convertir nombres de colores en objetos Color
          this.availableColors = this.gameService.getColorObjects(this.selectedColors);
          
          console.log('Colores procesados:', {
            selectedColors: this.selectedColors,
            availableColors: this.availableColors
          });
          
          resolve();
        },
        error: (error) => {
          console.error('Error cargando detalles de la sala:', error);
          reject(error);
        }
      });
    });
  }

  private async loadGameState(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gameService.getGameState(this.roomId!).subscribe({
        next: (response) => {
          this.gameState = response.data;
          this.currentSequence = this.gameState?.sequence || [];
          this.gameStarted = this.gameState?.status === 'playing';
          this.showingSequence = this.gameState?.showingSequence || false;
          
          // Determinar si es el turno del jugador actual
          this.updatePlayerTurn();
          
          console.log('Estado del juego cargado:', this.gameState);
          resolve();
        },
        error: (error) => {
          console.error('Error cargando estado del juego:', error);
          // Si no hay estado del juego, crear uno nuevo
          this.gameState = {
            roomId: this.roomId!,
            sequence: [],
            currentRound: 0,
            currentPlayerTurn: 1,
            showingSequence: false,
            status: 'waiting',
            player1Score: 0,
            player2Score: 0,
            player1Finished: false,
            player2Finished: false
          };
          resolve();
        }
      });
    });
  }

  private startGamePolling(): void {
    this.gamePollingSubscription = interval(this.POLLING_INTERVAL)
      .pipe(
        switchMap(() => this.gameService.getGameState(this.roomId!)),
        catchError((error) => {
          console.error('Error en polling del juego:', error);
          return of({ data: this.gameState });
        })
      )
      .subscribe({
        next: (response) => {
          const newGameState = response.data;
          if (newGameState && JSON.stringify(newGameState) !== JSON.stringify(this.gameState)) {
            this.gameState = newGameState;
            this.currentSequence = this.gameState.sequence || [];
            this.gameStarted = this.gameState.status === 'playing';
            this.showingSequence = this.gameState.showingSequence || false;
            this.updatePlayerTurn();
            
            // Si se está mostrando la secuencia, reproducirla
            if (this.showingSequence && !this.sequenceSubscription) {
              this.playSequence();
            }
          }
        }
      });
  }

  private stopGamePolling(): void {
    if (this.gamePollingSubscription) {
      this.gamePollingSubscription.unsubscribe();
      this.gamePollingSubscription = null;
    }
  }

  private updatePlayerTurn(): void {
    if (!this.gameState || !this.currentUser) return;
    
    // Determinar si es el turno del jugador actual
    const isPlayer1 = this.currentUser.id === this.gameState.player1Id;
    const currentPlayerTurn = this.gameState.currentPlayerTurn;
    
    this.isPlayerTurn = (isPlayer1 && currentPlayerTurn === 1) || (!isPlayer1 && currentPlayerTurn === 2);
  }

  /**
   * Inicia el juego (solo el primer jugador puede hacerlo)
   */
  startGame(): void {
    if (!this.gameState || !this.currentUser) return;
    
    const updatedState: Partial<GameState> = {
      status: 'playing',
      currentRound: 1,
      sequence: this.generateNextSequenceStep([]),
      showingSequence: true,
      currentPlayerTurn: 1
    };
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('Juego iniciado');
      },
      error: (error) => {
        console.error('Error iniciando juego:', error);
        this.error = 'Error al iniciar el juego';
      }
    });
  }

  /**
   * Genera el siguiente paso en la secuencia
   */
  private generateNextSequenceStep(currentSequence: string[]): string[] {
    if (this.selectedColors.length === 0) return currentSequence;
    
    const randomIndex = Math.floor(Math.random() * this.selectedColors.length);
    const randomColor = this.selectedColors[randomIndex];
    return [...currentSequence, randomColor];
  }

  /**
   * Reproduce la secuencia de colores
   */
  private playSequence(): void {
    if (this.currentSequence.length === 0) return;
    
    let currentIndex = 0;
    this.playerSequence = [];
    
    const playNext = () => {
      if (currentIndex < this.currentSequence.length) {
        // Resaltar el color actual
        this.highlightColor(this.currentSequence[currentIndex]);
        
        setTimeout(() => {
          currentIndex++;
          playNext();
        }, this.SEQUENCE_SPEED);
      } else {
        // Secuencia terminada, es turno del jugador
        if (this.isPlayerTurn) {
          this.showingSequence = false;
          this.waitingForPlayer = true;
        }
      }
    };
    
    playNext();
  }

  /**
   * Resalta visualmente un color
   */
  private highlightColor(colorName: string): void {
    const colorElement = document.getElementById(`color-${colorName}`);
    if (colorElement) {
      colorElement.classList.add('active');
      setTimeout(() => {
        colorElement.classList.remove('active');
      }, this.SEQUENCE_SPEED * 0.8);
    }
  }

  /**
   * Maneja el clic en un color
   */
  onColorClick(color: Color): void {
    if (!this.isPlayerTurn || this.showingSequence || !this.waitingForPlayer) {
      return;
    }
    
    // Agregar color a la secuencia del jugador
    this.playerSequence.push(color.name);
    
    // Verificar si la secuencia es correcta
    const isCorrect = this.playerSequence.every((colorName, index) => 
      colorName === this.currentSequence[index]
    );
    
    if (!isCorrect) {
      // Secuencia incorrecta - fin del juego
      this.handleIncorrectSequence();
      return;
    }
    
    // Si completó la secuencia correctamente
    if (this.playerSequence.length === this.currentSequence.length) {
      this.handleCorrectSequence();
    }
    
    // Resaltar el color clickeado
    this.highlightColor(color.name);
  }

  private handleCorrectSequence(): void {
    console.log('¡Secuencia correcta!');
    
    // Incrementar puntuación
    const isPlayer1 = this.currentUser.id === this.gameState?.player1Id;
    const updatedState: Partial<GameState> = {
      currentRound: (this.gameState?.currentRound || 0) + 1,
      sequence: this.generateNextSequenceStep(this.currentSequence),
      showingSequence: true,
      currentPlayerTurn: isPlayer1 ? 2 : 1, // Cambiar turno
      player1Score: isPlayer1 ? (this.gameState?.player1Score || 0) + 1 : this.gameState?.player1Score,
      player2Score: !isPlayer1 ? (this.gameState?.player2Score || 0) + 1 : this.gameState?.player2Score
    };
    
    this.waitingForPlayer = false;
    this.playerSequence = [];
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('Estado actualizado después de secuencia correcta');
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
      }
    });
  }

  private handleIncorrectSequence(): void {
    console.log('Secuencia incorrecta - fin del juego');
    
    const isPlayer1 = this.currentUser.id === this.gameState?.player1Id;
    const winnerId = isPlayer1 ? this.gameState?.player2Id : this.gameState?.player1Id;
    
    const updatedState: Partial<GameState> = {
      status: 'finished',
      winnerId: winnerId,
      showingSequence: false
    };
    
    this.waitingForPlayer = false;
    this.gameStarted = false;
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('Juego terminado');
      },
      error: (error) => {
        console.error('Error terminando juego:', error);
      }
    });
  }

  /**
   * Obtiene el color de fondo para un color
   */
  getColorStyle(color: Color): any {
    return {
      'background-color': color.hexColor,
      'border': `3px solid ${this.darkenColor(color.hexColor, 20)}`
    };
  }

  /**
   * Oscurece un color hexadecimal
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Volver a la página de salas
   */
  backToRooms(): void {
    this.gameService.clearGameState();
    this.router.navigate(['/rooms']);
  }

  /**
   * Obtiene el estado actual del juego como texto
   */
  getGameStatusText(): string {
    if (!this.gameState) return 'Cargando...';
    
    switch (this.gameState.status) {
      case 'waiting':
        return 'Esperando a que inicie el juego';
      case 'playing':
        if (this.showingSequence) {
          return 'Memoriza la secuencia';
        } else if (this.isPlayerTurn) {
          return '¡Tu turno! Repite la secuencia';
        } else {
          return 'Esperando al otro jugador';
        }
      case 'finished':
        const isWinner = this.gameState.winnerId === this.currentUser?.id;
        return isWinner ? '¡Ganaste!' : 'Perdiste';
      default:
        return 'Estado desconocido';
    }
  }

  /**
   * Obtiene un color por su nombre
   */
  getColorByName(colorName: string): Color | undefined {
    return this.availableColors.find(color => color.name === colorName);
  }

  /**
   * TrackBy function para optimizar el rendimiento del *ngFor
   */
  trackByColorName(index: number, color: Color): string {
    return color.name;
  }
}
