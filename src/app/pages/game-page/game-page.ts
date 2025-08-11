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
  colorCount: number = 4;
  selectedColors: string[] = [];
  currentUser: any = null;
  sequence: number[] = [];
  userSequence: number[] = [];
  isPlayerTurn = false;
  isWaiting = true;
  isShowingSequence = false;
  gameColors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF'];
  
  colorNameToHex: { [key: string]: string } = {
    'red': '#FF4444',
    'blue': '#4444FF', 
    'green': '#44FF44',
    'yellow': '#FFFF44',
    'orange': '#FF8844',
    'purple': '#FF44FF',
    'pink': '#FF88BB',
    'cyan': '#44FFFF',
    'lime': '#88FF44',
    'indigo': '#4444AA'
  };
  
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
  colorAddedThisTurn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomId = params['id'];
      
      // FIXED: Cargar datos inmediatamente y de forma más robusta
      this.loadGameDataRobust();
      
      this.currentUser = this.roomService.getCurrentUserInfo();
      this.gameStateKey = `game_state_${this.roomId}`;

      console.log('🎮 GAME INIT - Initial data:', {
        roomId: this.roomId,
        colorCount: this.colorCount,
        selectedColors: this.selectedColors,
        currentUser: this.currentUser
      });

      if (!this.currentUser || !this.roomId) {
        this.router.navigate(['/rooms']);
        return;
      }

      this.checkPlayerTurn();
      this.startSyncing();
      this.setupPlayerLeaveDetection();
    });
  }

  /**
   * FIXED: Método más robusto para cargar datos del juego
   */
  private loadGameDataRobust(): void {
    const gameData = JSON.parse(localStorage.getItem('current_game') || '{}');
    
    console.log('🔍 RAW localStorage data:', gameData);
    
    this.roomName = gameData.name || 'Partida Sin Nombre';
    this.colorCount = gameData.colorCount || 4;
    
    // FIXED: Asegurar que siempre tengamos colores válidos
    if (gameData.selectedColors && Array.isArray(gameData.selectedColors) && gameData.selectedColors.length > 0) {
      this.selectedColors = [...gameData.selectedColors];
      console.log('✅ Colors loaded from localStorage:', this.selectedColors);
    } else {
      // Fallback a colores por defecto basados en colorCount
      const defaultColors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];
      this.selectedColors = defaultColors.slice(0, this.colorCount);
      console.log('⚠️ No colors in localStorage, using defaults:', this.selectedColors);
    }
    
    console.log('🎮 Final game data loaded:', {
      roomName: this.roomName,
      colorCount: this.colorCount,
      selectedColors: this.selectedColors
    });
  }

  ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    
    if (!this.playerLeftGame) {
      this.notifyPlayerLeft();
    }
    
    if (this.beforeUnloadListener) {
      window.removeEventListener('beforeunload', this.beforeUnloadListener);
    }
  }

  checkPlayerTurn(): void {
    const gameData = JSON.parse(localStorage.getItem('current_game') || '{}');
    this.isPlayer1 = this.currentUser.id === gameData.player1Id;
    this.isLoading = false;
    
    console.log(`🎮 Player identification: isPlayer1=${this.isPlayer1}, userId=${this.currentUser.id}, player1Id=${gameData.player1Id}`);
    
    if (this.isPlayer1) {
      console.log('🎮 Player 1 initializing game...');
      this.initializeGameState();
    } else {
      console.log('🎮 Player 2 waiting for game state...');
      // FIXED: Para el jugador 2, esperar un poco antes de intentar obtener el estado
      setTimeout(() => {
        this.forceColorSync();
      }, 2000);
    }
  }

  /**
   * FIXED: Método para forzar la sincronización de colores para el jugador 2
   */
  private forceColorSync(): void {
    console.log('🔄 FORCE SYNC - Player 2 forcing color synchronization...');
    
    this.roomService.getGameState(this.roomId!).subscribe({
      next: (response) => {
        console.log('🔄 FORCE SYNC - Backend response:', response);
        
        if (response.data && response.data.selectedColors) {
          console.log('🎨 FORCE SYNC - Colors found in backend:', response.data.selectedColors);
          this.selectedColors = [...response.data.selectedColors];
          this.colorCount = response.data.colorCount || this.selectedColors.length;
          
          // Actualizar localStorage también
          const currentGameData = JSON.parse(localStorage.getItem('current_game') || '{}');
          currentGameData.selectedColors = this.selectedColors;
          currentGameData.colorCount = this.colorCount;
          localStorage.setItem('current_game', JSON.stringify(currentGameData));
          
          console.log('🎨 FORCE SYNC - Player 2 colors updated:', {
            selectedColors: this.selectedColors,
            colorCount: this.colorCount
          });
          
          // Forzar re-renderizado
          this.forceRerender();
        } else {
          console.log('⚠️ FORCE SYNC - No colors in backend, keeping localStorage colors');
        }
      },
      error: (error) => {
        console.error('❌ FORCE SYNC - Error:', error);
      }
    });
  }

  /**
   * FIXED: Método para forzar re-renderizado
   */
  private forceRerender(): void {
    // Trigger change detection
    setTimeout(() => {
      console.log('🔄 Forcing component re-render...');
    }, 100);
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
    const initialState = {
      sequence: [],
      currentRound: 0,
      isShowingSequence: false,
      currentPlayerTurn: 1,
      status: 'playing',
      player1Score: 0,
      player2Score: 0,
      player1Finished: false,
      player2Finished: false,
      selectedColors: this.selectedColors,
      colorCount: this.colorCount
    };
    
    console.log('🎮 Player 1 initializing game state:', initialState);
    
    this.roomService.updateGameState(this.roomId!, initialState).subscribe({
      next: (response) => {
        console.log('✅ Game state initialized by player 1:', response);
        this.startGame();
      },
      error: (error) => {
        console.error('Error initializing game state:', error);
      }
    });
  }

  syncGameState(gameState: any): void {
    if (!gameState) return;
    
    this.gameState = gameState;
    
    // FIXED: Sincronización más agresiva de colores
    if (gameState.selectedColors && gameState.selectedColors.length > 0) {
      const newColors = [...gameState.selectedColors];
      
      // Solo actualizar si los colores son realmente diferentes
      if (JSON.stringify(this.selectedColors) !== JSON.stringify(newColors)) {
        console.log('🎨 SYNC - Updating colors from backend:', {
          oldColors: this.selectedColors,
          newColors: newColors,
          player: this.isPlayer1 ? 1 : 2
        });
        
        this.selectedColors = newColors;
        this.colorCount = gameState.colorCount || this.selectedColors.length;
        
        // Actualizar localStorage
        const currentGameData = JSON.parse(localStorage.getItem('current_game') || '{}');
        currentGameData.selectedColors = this.selectedColors;
        currentGameData.colorCount = this.colorCount;
        localStorage.setItem('current_game', JSON.stringify(currentGameData));
        
        console.log('🎨 SYNC - Colors synchronized for player', this.isPlayer1 ? 1 : 2);
      }
    }
    
    this.sequence = gameState.sequence || [];
    this.currentRound = gameState.currentRound || 0;
    this.isShowingSequence = gameState.isShowingSequence || false;
    
    this.isPlayerTurn = (this.isPlayer1 && gameState.currentPlayerTurn === 1) || 
                      (!this.isPlayer1 && gameState.currentPlayerTurn === 2);
    this.isWaiting = !this.isPlayerTurn && !this.isShowingSequence;
    
    if (gameState.status === 'finished' && gameState.winnerId) {
      console.log('Game ended detected in sync:', gameState.winnerId);
      this.handleGameEnd(gameState.winnerId);
    }
    
    if (gameState.playerLeft) {
      console.log('Player left detected:', gameState.playerLeft);
      const winner = gameState.playerLeft === 1 ? 2 : 1;
      this.handlePlayerLeft(winner);
    }

    if (this.isPlayerTurn && this.sequence.length > 0 && !this.lastColorShown) {
      this.lastColorShown = true;
      setTimeout(() => {
        const lastColor = this.sequence[this.sequence.length - 1];
        this.highlightColor(lastColor);
        console.log(`Showing last color for player ${this.isPlayer1 ? 1 : 2}:`, lastColor);
      }, 500);
    }
    
    if (!this.isPlayerTurn) {
      this.lastColorShown = false;
    }
  }

  startGame(): void {
    if (this.isPlayer1 && !this.gameInitialized) {
      this.gameInitialized = true;
      this.currentRound = 1;
      this.sequence = [];
      this.userSequence = [];
      this.isPlayerTurn = true;
      this.isShowingSequence = false;
      
      const updateData = {
        sequence: [],
        currentRound: 1,
        isShowingSequence: false,
        currentPlayerTurn: 1,
        selectedColors: this.selectedColors,
        colorCount: this.colorCount
      };
      
      this.roomService.updateGameState(this.roomId!, updateData).subscribe({
        next: (response) => {
          console.log('Game initialized with colors, player 1 can choose first color');
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
    
    const newColor = this.generateRandomColor();
    this.sequence.push(newColor);
    
    console.log('New color generated:', newColor, 'Full sequence:', this.sequence);
    
    const updateData = {
      sequence: this.sequence,
      currentRound: this.currentRound,
      isShowingSequence: false,
      currentPlayerTurn: 1,
      selectedColors: this.selectedColors,
      colorCount: this.colorCount
    };
    
    this.roomService.updateGameState(this.roomId!, updateData).subscribe({
      next: (response) => {
        console.log('Game state updated:', response);
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
        
        const updateData = {
          isShowingSequence: false,
          currentPlayerTurn: 1,
          selectedColors: this.selectedColors,
          colorCount: this.colorCount
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
    
    this.highlightColor(colorIndex);

    console.log(`Player ${this.isPlayer1 ? 1 : 2} pressed color ${colorIndex}`);
    console.log(`Current sequence: [${this.sequence.join(', ')}]`);
    console.log(`User sequence so far: [${this.userSequence.join(', ')}]`);
    console.log(`Is adding new color: ${this.isAddingNewColor}`);

    if (this.sequence.length === 0 || this.isAddingNewColor) {
      if (this.colorAddedThisTurn) {
        console.log('Color already added this turn, ignoring click');
        return;
      }
      
      this.colorAddedThisTurn = true;
      
      this.sequence.push(colorIndex);
      this.userSequence = [];
      this.isAddingNewColor = false;
      console.log(`Player ${this.isPlayer1 ? 1 : 2} added color ${colorIndex} to sequence`);
      console.log(`New sequence: [${this.sequence.join(', ')}]`);
      
      this.changePlayerTurn();
      return;
    }

    this.userSequence.push(colorIndex);
    console.log(`User sequence now: [${this.userSequence.join(', ')}]`);

    if (!this.isCorrectSequenceSoFar()) {
      console.log('Wrong move! Game Over');
      const winner = this.isPlayer1 ? 2 : 1;
      
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
          this.handleGameEnd(winner);
        }
      });
      return;
    }

    if (this.userSequence.length === this.sequence.length) {
      console.log('Player completed sequence correctly!');
      
      this.userSequence = [];
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
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    
    const isCurrentPlayerWinner = (this.isPlayer1 && winner === 1) || (!this.isPlayer1 && winner === 2);
    
    if (isCurrentPlayerWinner) {
      alert('¡Felicidades! ¡Has ganado!');
    } else {
      alert('¡Perdiste! El otro jugador fue mejor.');
    }
    
    localStorage.removeItem(this.gameStateKey);
    
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

  /**
   * FIXED: Método actualizado para manejar colores ilimitados
   */
  getDifficultyText(): string {
    const colorCount = this.colorCount || 4;
    
    if (colorCount <= 2) return 'Modo Fácil - 2 Colores';
    if (colorCount <= 3) return 'Modo Intermedio - 3 Colores';
    if (colorCount <= 4) return 'Modo Difícil - 4 Colores';
    if (colorCount <= 6) return 'Modo Muy Difícil - 6 Colores';
    if (colorCount <= 8) return 'Modo Extremo - 8 Colores';
    if (colorCount <= 10) return 'Modo Insano - 10 Colores';
    if (colorCount <= 12) return 'Modo Imposible - 12 Colores';
    if (colorCount <= 15) return 'Modo Legendario - 15 Colores';
    return `Modo Épico - ${colorCount} Colores`;
  }

  /**
   * FIXED: Método mejorado para manejar cualquier cantidad de colores
   */
  getSegmentStyles(segmentIndex: number, index: number): any {
    const totalColors = this.colorCount;
    
    const anglePerSegment = 360 / totalColors;
    const angle = (index * anglePerSegment) - 90;
    
    // FIXED: Cálculo dinámico mejorado para cualquier cantidad de colores
    let radius = 70;
    let segmentSize = 50;
    
    if (totalColors <= 2) {
      radius = 60;
      segmentSize = 70;
    } else if (totalColors <= 4) {
      radius = 70;
      segmentSize = 50;
    } else if (totalColors <= 6) {
      radius = 80;
      segmentSize = 42;
    } else if (totalColors <= 8) {
      radius = 90;
      segmentSize = 38;
    } else if (totalColors <= 10) {
      radius = 100;
      segmentSize = 35;
    } else if (totalColors <= 12) {
      radius = 110;
      segmentSize = 32;
    } else if (totalColors <= 15) {
      radius = 120;
      segmentSize = 28;
    } else {
      // Para cantidades épicas de colores
      radius = 130;
      segmentSize = 25;
    }
    
    const centerX = 200;
    const centerY = 200;
    
    const angleRad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    
    // FIXED: Lógica de colores mejorada
    let color = '#CCCCCC';
    
    console.log(`🎨 UNLIMITED - Getting color for segment ${index}:`, {
      player: this.isPlayer1 ? 1 : 2,
      totalColors,
      selectedColors: this.selectedColors,
      selectedColorsLength: this.selectedColors?.length
    });
    
    if (this.selectedColors && this.selectedColors.length > 0 && index < this.selectedColors.length) {
      const colorName = this.selectedColors[index];
      color = this.colorNameToHex[colorName];
      
      if (color) {
        console.log(`🎨 UNLIMITED - Using custom color: ${colorName} -> ${color} for index ${index}`);
      } else {
        console.warn(`⚠️ Color name "${colorName}" not found in mapping`);
        color = this.generateFallbackColor(index);
      }
    } else {
      color = this.generateFallbackColor(index);
      console.log(`🎨 UNLIMITED - Using generated color: ${color} for index ${index}`);
    }
    
    return {
      'position': 'absolute',
      'width': `${segmentSize}px`,
      'height': `${segmentSize}px`,
      'left': `${x - segmentSize/2}px`,
      'top': `${y - segmentSize/2}px`,
      'background': color,
      'border-radius': '50%',
      'cursor': 'pointer',
      'transition': 'all 0.3s ease',
      'z-index': '10',
      'border': this.activeSegment === segmentIndex ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
      'box-shadow': this.activeSegment === segmentIndex ? '0 0 20px rgba(255,255,255,0.8)' : 'none'
    };
  }

  /**
   * FIXED: Método mejorado para generar colores dinámicamente
   */
  private generateFallbackColor(index: number): string {
    // Si tenemos colores por defecto suficientes, usarlos
    if (index < this.gameColors.length) {
      return this.gameColors[index];
    }
    
    // FIXED: Generar colores únicos usando HSL para cualquier cantidad
    const hue = (index * 137.5) % 360; // Usar número áureo para mejor distribución
    const saturation = 70 + (index % 4) * 5; // Variar saturación
    const lightness = 45 + (index % 3) * 10;  // Variar luminosidad
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    
    if (!this.playerLeftGame) {
      this.notifyPlayerLeft();
      
      setTimeout(() => {
        console.log('Navigating back to /rooms');
        this.router.navigate(['/rooms']);
      }, 100);
    } else {
      console.log('Already notified, navigating directly');
      this.router.navigate(['/rooms']);
    }
  }
  
  setupPlayerLeaveDetection(): void {
    this.beforeUnloadListener = (event: BeforeUnloadEvent) => {
      this.notifyPlayerLeft();
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadListener);
    
    window.addEventListener('popstate', () => {
      this.notifyPlayerLeft();
    });
  }
  
  notifyPlayerLeft(): void {
    if (this.playerLeftGame) {
      console.log('Player left already notified, skipping...');
      return;
    }
    
    this.playerLeftGame = true;
    const playerNumber = this.isPlayer1 ? 1 : 2;
    
    console.log(`Player ${playerNumber} is leaving the game`);
    
    if (!this.roomId) {
      console.log('No roomId available, skipping notification');
      return;
    }
    
    const gameEndData = {
      status: 'finished',
      playerLeft: playerNumber,
      winnerId: this.isPlayer1 ? 2 : 1,
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
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    
    const isCurrentPlayerWinner = (this.isPlayer1 && winner === 1) || (!this.isPlayer1 && winner === 2);
    
    if (isCurrentPlayerWinner) {
      alert('¡Felicidades! El otro jugador abandonó el juego. ¡Has ganado!');
    } else {
      alert('Has abandonado el juego. El otro jugador ganó.');
    }
    
    localStorage.removeItem(this.gameStateKey);
    
    setTimeout(() => {
      this.router.navigate(['/rooms']);
    }, 2000);
  }

  generateRandomColor(): number {
    const maxColors = this.colorCount || 4;
    
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % maxColors;
    } else {
      return Math.floor(Math.random() * maxColors);
    }
  }

  changePlayerTurn(): void {
    const nextPlayer = this.isPlayer1 ? 2 : 1;
    console.log(`Changing turn to player ${nextPlayer}`);
    
    this.lastColorShown = false;
    this.colorAddedThisTurn = false;
    
    const updateData = {
      sequence: this.sequence,
      currentPlayerTurn: nextPlayer,
      isShowingSequence: false,
      currentRound: this.currentRound,
      selectedColors: this.selectedColors,
      colorCount: this.colorCount
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

  getSegmentNumbers(): number[] {
    return Array.from({ length: this.colorCount || 4 }, (_, i) => i);
  }
}