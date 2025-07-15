import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  sequence: number[] = [];
  userSequence: number[] = [];
isPlayerTurn = false;
  isWaiting = true;
  isShowingSequence = false;
  gameColors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF'];
  activeSegment: number | null = null;
  gameState: any = null;
  isPlayer1 = false;
  currentRound = 0;
  maxRounds = 5;
  isLoading = true;
  error: string | null = null;
  gameInterval: any;
  syncSubscription: Subscription | null = null;
  gameStateKey: string = '';
  gameInitialized = false;
  lastColorShown = false;
  isAddingNewColor = false;
  playerLeftGame = false;
  beforeUnloadListener: any;
  colorAddedThisTurn = false; // Indica si ya se agregó un color en este turno

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomId = params['id'];
      const gameData = JSON.parse(localStorage.getItem('current_game') || '{}');
      this.roomName = gameData.name;
      this.colorCount = gameData.colorCount;
      this.currentUser = this.roomService.getCurrentUserInfo();
      this.gameStateKey = `game_state_${this.roomId}`;

      if (!this.currentUser || !this.roomId) {
        this.router.navigate(['/rooms']);
        return;
      }

      this.checkPlayerTurn();
      this.startSyncing();
      this.setupPlayerLeaveDetection();
    });
  }

  ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    
    // Notificar que el jugador salió del juego
    if (!this.playerLeftGame) {
      this.notifyPlayerLeft();
    }
    
    // Remover el listener de beforeunload
    if (this.beforeUnloadListener) {
      window.removeEventListener('beforeunload', this.beforeUnloadListener);
    }
  }

checkPlayerTurn(): void {
    const gameData = JSON.parse(localStorage.getItem('current_game') || '{}');
    this.isPlayer1 = this.currentUser.id === gameData.player1Id;
    this.isLoading = false;
    
    // Inicializar el estado del juego si es el jugador 1
    if (this.isPlayer1) {
      this.initializeGameState();
    }
  }

  startSyncing(): void {
    this.syncSubscription = interval(1500)
      .pipe(
        switchMap(() => this.roomService.getGameState(this.roomId!))
      )
      .subscribe({
        next: (response) => {
          this.syncGameState(response.data);
        },
        error: (error) => {
          console.error('Error syncing game state:', error);
        }
      });
  }

  initializeGameState(): void {
    // Inicializar el estado del juego en el backend
    const initialState = {
      sequence: [],
      currentRound: 0,
      isShowingSequence: false,
      currentPlayerTurn: 1,
      status: 'playing',
      player1Score: 0,
      player2Score: 0,
      player1Finished: false,
      player2Finished: false
    };
    
    this.roomService.updateGameState(this.roomId!, initialState).subscribe({
      next: (response) => {
        console.log('Game state initialized:', response);
        this.startGame();
      },
      error: (error) => {
        console.error('Error initializing game state:', error);
      }
    });
  }

  syncGameState(gameState: any): void {
    if (!gameState) return;
    
    // Guardar estado completo del juego
    this.gameState = gameState;
    
    // Actualizar estado local
    this.sequence = gameState.sequence || [];
    this.currentRound = gameState.currentRound || 0;
    this.isShowingSequence = gameState.isShowingSequence || false;
    
    // Determinar turno
    this.isPlayerTurn = (this.isPlayer1 && gameState.currentPlayerTurn === 1) || 
                      (!this.isPlayer1 && gameState.currentPlayerTurn === 2);
    this.isWaiting = !this.isPlayerTurn && !this.isShowingSequence;
    
    // Verificar fin de juego
    if (gameState.status === 'finished' && gameState.winnerId) {
      console.log('Game ended detected in sync:', gameState.winnerId);
      this.handleGameEnd(gameState.winnerId);
    }
    
    // Verificar si un jugador abandonó el juego
    if (gameState.playerLeft) {
      console.log('Player left detected:', gameState.playerLeft);
      const winner = gameState.playerLeft === 1 ? 2 : 1;
      this.handlePlayerLeft(winner);
    }

    // Mostrar último color cuando cambia al turno del jugador 2 (solo una vez)
    if (this.isPlayerTurn && !this.isPlayer1 && this.sequence.length > 0 && !this.lastColorShown) {
      this.lastColorShown = true;
      setTimeout(() => {
        const lastColor = this.sequence[this.sequence.length - 1];
        this.highlightColor(lastColor);
        console.log('Showing last color for player 2:', lastColor);
      }, 500);
    }
    
    // Mostrar último color al jugador 1 cuando es su turno (solo una vez)
    if (this.isPlayerTurn && this.isPlayer1 && this.sequence.length > 0 && !this.lastColorShown) {
      this.lastColorShown = true;
      setTimeout(() => {
        const lastColor = this.sequence[this.sequence.length - 1];
        this.highlightColor(lastColor);
        console.log('Showing last color for player 1:', lastColor);
      }, 500);
    }
    
    // Resetear la bandera cuando cambia el turno
    if (!this.isPlayerTurn) {
      this.lastColorShown = false;
    }
  }

  updateGameState(updates: any): void {
    // Este método ya no es necesario, todas las actualizaciones se hacen via API
    // Se mantiene para compatibilidad pero no hace nada
    console.log('updateGameState called with:', updates);
  }

  startGame(): void {
    if (this.isPlayer1 && !this.gameInitialized) {
      this.gameInitialized = true;
      // El jugador 1 debe elegir el primer color
      this.currentRound = 1;
      this.sequence = [];
      this.userSequence = [];
      this.isPlayerTurn = true;
      this.isShowingSequence = false;
      
      // Actualizar estado inicial
      const updateData = {
        sequence: [],
        currentRound: 1,
        isShowingSequence: false,
        currentPlayerTurn: 1
      };
      
      this.roomService.updateGameState(this.roomId!, updateData).subscribe({
        next: (response) => {
          console.log('Game initialized, player 1 can choose first color');
        },
        error: (error) => {
          console.error('Error initializing game:', error);
        }
      });
    }
  }

  nextSequence(): void {
    if (!this.isPlayer1) return;
    
    this.currentRound++;
    this.userSequence = [];
    
    // Generar un nuevo color aleatorio
    const newColor = this.generateRandomColor();
    this.sequence.push(newColor);
    
    console.log('New color generated:', newColor, 'Full sequence:', this.sequence);
    
    // Actualizar estado en el backend
    const updateData = {
      sequence: this.sequence,
      currentRound: this.currentRound,
      isShowingSequence: false,
      currentPlayerTurn: 1
    };
    
    this.roomService.updateGameState(this.roomId!, updateData).subscribe({
      next: (response) => {
        console.log('Game state updated:', response);
        // Mostrar toda la secuencia la primera vez
        this.showSequence();
      },
      error: (error) => {
        console.error('Error updating game state:', error);
      }
    });
  }

  showSequence(): void {
    let index = 0;
    this.isPlayerTurn = false;
    this.isShowingSequence = true;
    
    this.gameInterval = setInterval(() => {
      this.highlightColor(this.sequence[index]);
      index++;
      if (index >= this.sequence.length) {
        clearInterval(this.gameInterval);
        
        // Actualizar estado en el backend: fin de secuencia, turno del jugador 1
        const updateData = {
          isShowingSequence: false,
          currentPlayerTurn: 1
        };
        
        this.roomService.updateGameState(this.roomId!, updateData).subscribe({
          next: (response) => {
            console.log('Sequence finished, game state updated:', response);
          },
          error: (error) => {
            console.error('Error updating game state after sequence:', error);
          }
        });
      }
    }, 500);
  }

highlightColor(colorIndex: number): void {
    this.activeSegment = colorIndex;
    setTimeout(() => {
      this.activeSegment = null;
    }, 600);
  }

  enhanceDesign(): void {
    const buttons = document.getElementsByClassName('color-button');
    const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange'];
    for (let i = 0; i < buttons.length; i++) {
      (buttons[i] as HTMLElement).style.backgroundColor = colors[i % colors.length];
    }
  }

  handleUserInput(colorIndex: number): void {
    if (!this.isPlayerTurn) return;
    
    // Resaltar el color presionado
    this.highlightColor(colorIndex);

    console.log(`Player ${this.isPlayer1 ? 1 : 2} pressed color ${colorIndex}`);
    console.log(`Current sequence: [${this.sequence.join(', ')}]`);
    console.log(`User sequence so far: [${this.userSequence.join(', ')}]`);
    console.log(`Is adding new color: ${this.isAddingNewColor}`);

    // Si es el primer turno (secuencia vacía) o el jugador debe agregar un nuevo color
    if (this.sequence.length === 0 || this.isAddingNewColor) {
      // Verificar si ya se agregó un color en este turno
      if (this.colorAddedThisTurn) {
        console.log('Color already added this turn, ignoring click');
        return;
      }
      
      // Marcar que se agregó un color en este turno
      this.colorAddedThisTurn = true;
      
      this.sequence.push(colorIndex);
      this.userSequence = [];
      this.isAddingNewColor = false;
      console.log(`Player ${this.isPlayer1 ? 1 : 2} added color ${colorIndex} to sequence`);
      console.log(`New sequence: [${this.sequence.join(', ')}]`);
      
      // Cambiar turno al otro jugador
      this.changePlayerTurn();
      return;
    }

    // Jugador está repitiendo la secuencia
    this.userSequence.push(colorIndex);
    console.log(`User sequence now: [${this.userSequence.join(', ')}]`);

    // Verificar si el movimiento es correcto
    if (!this.isCorrectSequenceSoFar()) {
      console.log('Wrong move! Game Over');
      const winner = this.isPlayer1 ? 2 : 1;
      
      // Actualizar estado del juego como terminado
      const gameEndData = {
        status: 'finished',
        winnerId: winner,
        gameOver: true
      };
      
      this.roomService.updateGameState(this.roomId!, gameEndData).subscribe({
        next: (response) => {
          console.log('Game ended:', response);
          this.handleGameEnd(winner);
        },
        error: (error) => {
          console.error('Error ending game:', error);
          this.handleGameEnd(winner); // Manejar el fin del juego de todos modos
        }
      });
      return;
    }

    // Si completó la secuencia correctamente
    if (this.userSequence.length === this.sequence.length) {
      console.log('Player completed sequence correctly!');
      
      // Ahora el jugador debe agregar un nuevo color
      console.log('Player can now add a new color to the sequence');
      
      // Marcar que el jugador completó la secuencia
      this.userSequence = [];
      
      // El próximo click agregará un nuevo color
      this.isAddingNewColor = true;
      return;
    }
  }

  isCorrectSequenceSoFar(): boolean {
    for (let i = 0; i < this.userSequence.length; i++) {
      if (this.userSequence[i] !== this.sequence[i]) {
        return false;
      }
    }
    return true;
  }

  handleGameEnd(winner: number): void {
    // Limpiar intervalos
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    
    // Mostrar mensaje apropiado
    const isCurrentPlayerWinner = (this.isPlayer1 && winner === 1) || (!this.isPlayer1 && winner === 2);
    
    if (isCurrentPlayerWinner) {
      alert('¡Felicidades! ¡Has ganado!');
    } else {
      alert('¡Perdiste! El otro jugador fue mejor.');
    }
    
    // Limpiar estado del juego
    localStorage.removeItem(this.gameStateKey);
    
    // Redirigir a rooms después del alert - TODOS los jugadores
    setTimeout(() => {
      this.router.navigate(['/rooms']);
    }, 2000);
  }

  getColors(): string[] {
    return this.gameColors.slice(0, this.colorCount || 4);
  }

  resetGame(): void {
    if (this.isPlayer1) {
      this.sequence = [];
      this.userSequence = [];
      this.currentRound = 0;
      this.isPlayerTurn = false;
      this.isShowingSequence = false;
      this.initializeGameState();
    }
  }

  getDifficultyText(): string {
    const difficultyMap: { [key: number]: string } = {
      2: 'Modo Fácil - 2 Colores',
      3: 'Modo Intermedio - 3 Colores',
      4: 'Modo Difícil - 4 Colores',
      5: 'Modo Muy Difícil - 5 Colores',
      6: 'Modo Extremo - 6 Colores'
    };
    return difficultyMap[this.colorCount || 4] || 'Modo Personalizado';
  }

  getSegmentNumbers(): number[] {
    return Array.from({ length: this.colorCount || 4 }, (_, i) => i);
  }

  getScore(): number {
    if (!this.gameState) return 0;
    
    if (this.isPlayer1) {
      return this.gameState.player1Score || 0;
    } else {
      return this.gameState.player2Score || 0;
    }
  }

  backToRooms(): void {
    console.log('Back to rooms button clicked');
    
    // Verificar si ya se notificó previamente
    if (!this.playerLeftGame) {
      // Notificar inmediatamente al backend antes de marcar la bandera
      this.notifyPlayerLeft();
      
      // Pequeño delay para asegurar que la notificación se envíe
      setTimeout(() => {
        console.log('Navigating back to /rooms');
        this.router.navigate(['/rooms']);
      }, 100);
    } else {
      console.log('Already notified, navigating directly');
      // Si ya se notificó, navegar directo
      this.router.navigate(['/rooms']);
    }
  }
  
  setupPlayerLeaveDetection(): void {
    // Detectar cuando el jugador cierra la pestaña o navega hacia atrás
    this.beforeUnloadListener = (event: BeforeUnloadEvent) => {
      this.notifyPlayerLeft();
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadListener);
    
    // Detectar navegación hacia atrás
    window.addEventListener('popstate', () => {
      this.notifyPlayerLeft();
    });
  }
  
  notifyPlayerLeft(): void {
    // Evitar múltiples notificaciones
    if (this.playerLeftGame) {
      console.log('Player left already notified, skipping...');
      return;
    }
    
    this.playerLeftGame = true;
    const playerNumber = this.isPlayer1 ? 1 : 2;
    
    console.log(`Player ${playerNumber} is leaving the game`);
    
    // Solo notificar si tenemos roomId
    if (!this.roomId) {
      console.log('No roomId available, skipping notification');
      return;
    }
    
    // Notificar al backend que el jugador abandonó
    const gameEndData = {
      status: 'finished',
      playerLeft: playerNumber,
      winnerId: this.isPlayer1 ? 2 : 1, // El otro jugador gana
      gameOver: true
    };
    
    console.log('Sending player left notification:', gameEndData);
    
    this.roomService.updateGameState(this.roomId!, gameEndData).subscribe({
      next: (response) => {
        console.log('Player left notification sent successfully:', response);
      },
      error: (error) => {
        console.error('Error notifying player left:', error);
      }
    });
  }
  
  handlePlayerLeft(winner: number): void {
    // Limpiar intervalos
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    
    // Mostrar mensaje apropiado
    const isCurrentPlayerWinner = (this.isPlayer1 && winner === 1) || (!this.isPlayer1 && winner === 2);
    
    if (isCurrentPlayerWinner) {
      alert('¡Felicidades! El otro jugador abandonó el juego. ¡Has ganado!');
    } else {
      alert('Has abandonado el juego. El otro jugador ganó.');
    }
    
    // Limpiar estado del juego
    localStorage.removeItem(this.gameStateKey);
    
    // Redirigir a rooms después del alert
    setTimeout(() => {
      this.router.navigate(['/rooms']);
    }, 2000);
  }

  generateRandomColor(): number {
    // Usar crypto.getRandomValues para mejor aleatoriedad si está disponible
    const maxColors = this.colorCount || 4;
    
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % maxColors;
    } else {
      // Fallback a Math.random con mejor distribución
      return Math.floor(Math.random() * maxColors);
    }
  }

  changePlayerTurn(): void {
    const nextPlayer = this.isPlayer1 ? 2 : 1;
    console.log(`Changing turn to player ${nextPlayer}`);
    
    this.lastColorShown = false; // Resetear para el siguiente jugador
    this.colorAddedThisTurn = false; // Resetear bandera para el siguiente turno
    
    const updateData = {
      sequence: this.sequence,
      currentPlayerTurn: nextPlayer,
      isShowingSequence: false,
      currentRound: this.currentRound
    };
    
    this.roomService.updateGameState(this.roomId!, updateData).subscribe({
      next: (response) => {
        console.log(`Turn changed to player ${nextPlayer}:`, response);
      },
      error: (error) => {
        console.error('Error changing turn:', error);
      }
    });
  }

  // Este método ya no es necesario con la nueva mecánica
  // startNewRound(): void { ... }
}
