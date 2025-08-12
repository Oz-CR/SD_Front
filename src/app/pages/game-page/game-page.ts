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
  waitingForNewColor = false; // Nueva variable para esperar que agregue color
  
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
      this.roomId = params['id'];
      
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
    // Limpiar colores del localStorage al salir
    if (this.roomId) {
      localStorage.removeItem(`game_colors_${this.roomId}`);
    }
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
      
      // Intentar recuperar colores del localStorage primero
      this.tryRecoverColorsFromStorage();
      
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
          
          console.log('🔍 Detalles de la sala recibidos (RAW):', {
            roomId: room.id,
            name: room.name,
            colorCount: room.colorCount,
            selectedColorsFromRoom: room.selectedColors,
            selectedColorsType: typeof room.selectedColors,
            selectedColorsLength: room.selectedColors?.length,
            rawResponse: response
          });
          
          // DEBUG AGRESIVO: Verificar EXACTAMENTE qué llega desde el backend
          console.log('🔴 [DEBUG AGRESIVO] Analizando selectedColors:', {
            rawSelectedColors: room.selectedColors,
            type: typeof room.selectedColors,
            isArray: Array.isArray(room.selectedColors),
            isNull: room.selectedColors === null,
            isUndefined: room.selectedColors === undefined,
            stringified: JSON.stringify(room.selectedColors),
            length: room.selectedColors?.length,
            colorCount: room.colorCount,
            fullRoom: room
          });

          // FORZAR el uso de colores personalizados si existen EN CUALQUIER FORMATO
          let finalSelectedColors: string[] = [];
          let foundCustomColors = false;
          
          if (room.selectedColors !== null && room.selectedColors !== undefined) {
            if (Array.isArray(room.selectedColors) && room.selectedColors.length > 0) {
              finalSelectedColors = [...room.selectedColors];
              foundCustomColors = true;
              console.log('✅ [FORZADO] Array directo de colores encontrado:', finalSelectedColors);
            } else if (typeof room.selectedColors === 'string') {
              try {
                // Intentar JSON parse normal primero
                const parsed = JSON.parse(room.selectedColors);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  finalSelectedColors = parsed;
                  foundCustomColors = true;
                  console.log('✅ [FORZADO] String JSON parseado exitosamente:', finalSelectedColors);
                }
              } catch (e) {
                console.warn('⚠️ JSON parse falló, intentando parsear formato corrupto...');
                
                // FALLBACK: Intentar parsear formato corrupto de la BD
                try {
                  // Si el formato es algo como: [ '#9E2CA2', '#4444FF', '#44FF44', '#FFFF44' ]
                  // Lo convertimos a JSON válido reemplazando comillas simples por dobles
                  let cleanedString = room.selectedColors.toString()
                    .replace(/'/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                  const corruptedParsed = JSON.parse(cleanedString);
                  if (Array.isArray(corruptedParsed) && corruptedParsed.length > 0) {
                    finalSelectedColors = corruptedParsed;
                    foundCustomColors = true;
                    console.log('✅ [FALLBACK] Formato corrupto parseado exitosamente:', finalSelectedColors);
                  }
                } catch (e2) {
                  console.error('❌ Ambos parseos fallaron:', {
                    originalError: e instanceof Error ? e.message : String(e),
                    fallbackError: e2 instanceof Error ? e2.message : String(e2),
                    originalValue: room.selectedColors
                  });
                }
              }
            } else {
              console.warn('🟡 selectedColors existe pero no es array ni string válido');
            }
          }
          
          if (!foundCustomColors) {
            console.log('🔴 [FALLBACK] No se encontraron colores personalizados, generando por defecto');
            finalSelectedColors = this.generateDefaultColors(room.colorCount);
          }
          
          // SIEMPRE usar los colores encontrados/generados
          this.selectedColors = finalSelectedColors;
          this.colorCount = finalSelectedColors.length;
          
          console.log('🎨 [FINAL] Colores que se usarán en el juego:', {
            selectedColors: this.selectedColors,
            count: this.colorCount,
            wasCustom: foundCustomColors,
            originalRoomColors: room.selectedColors
          });
          
          // IMPORTANTE: Convertir TODOS los colores (incluyendo hexadecimales) en objetos Color
          this.availableColors = this.gameService.getColorObjects(this.selectedColors);
          
          console.log('🎨 Colores finales procesados para el juego:', {
            totalSelectedColors: this.selectedColors.length,
            selectedColors: this.selectedColors,
            totalAvailableColors: this.availableColors.length,
            availableColors: this.availableColors.map(c => ({ name: c.name, hex: c.hexColor, display: c.displayName })),
            colorCount: this.colorCount
          });
          
          // PERSISTIR colores en localStorage para evitar pérdida durante polling
          localStorage.setItem(`game_colors_${this.roomId}`, JSON.stringify({
            selectedColors: this.selectedColors,
            colorCount: this.colorCount,
            availableColors: this.availableColors
          }));
          
          resolve();
        },
        error: (error) => {
          console.error('❌ Error cargando detalles de la sala:', error);
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
        switchMap(() => {
          // Hacer polling tanto del estado del juego como de la sala
          return this.gameService.getGameState(this.roomId!).pipe(
            switchMap((gameResponse) => {
              return this.roomService.getRoomDetails(this.roomId!).pipe(
                catchError(() => of({ data: null })),
                switchMap((roomResponse) => {
                  // Combinar la información de la sala con el estado del juego
                  if (gameResponse.data && roomResponse.data) {
                    gameResponse.data.room = roomResponse.data;
                  }
                  return of(gameResponse);
                })
              );
            }),
            catchError((error) => {
              console.error('Error en polling del juego:', error);
              return of({ data: this.gameState });
            })
          );
        })
      )
      .subscribe({
        next: (response) => {
          const newGameState = response.data;
          if (newGameState) {
            const previousStatus = this.gameState?.status;
            const stateChanged = JSON.stringify(newGameState) !== JSON.stringify(this.gameState);
            
            console.log('🔄 Polling update:', {
              stateChanged,
              newStatus: newGameState.status,
              previousStatus,
              roomInfo: newGameState.room,
              player1Id: newGameState.room?.player1Id,
              player2Id: newGameState.room?.player2Id
            });
            
            this.gameState = newGameState;
            this.currentSequence = this.gameState?.sequence || [];
            this.gameStarted = this.gameState?.status === 'playing';
            this.showingSequence = this.gameState?.showingSequence || false;
            
            // MEJORADO: Actualizar colores seleccionados siempre que cambien
            if (this.gameState?.room?.selectedColors) {
              const newSelectedColors = this.gameState.room.selectedColors;
              const colorsChanged = JSON.stringify(newSelectedColors) !== JSON.stringify(this.selectedColors);
              
              console.log('🎨 [GamePolling] Verificando colores:', {
                newColorsCount: newSelectedColors.length,
                currentColorsCount: this.selectedColors.length,
                colorsChanged,
                newColors: newSelectedColors,
                currentColors: this.selectedColors,
                newColorsType: typeof newSelectedColors,
                isNewColorsArray: Array.isArray(newSelectedColors)
              });
              
              // CRÍTICO: SIEMPRE actualizar si hay colores disponibles y difieren
              if (Array.isArray(newSelectedColors) && newSelectedColors.length > 0 && colorsChanged) {
                console.log('🆕 [GamePolling] Actualizando colores seleccionados:', {
                  from: this.selectedColors.length,
                  to: newSelectedColors.length,
                  fromColors: this.selectedColors,
                  toColors: newSelectedColors
                });
                
                this.selectedColors = [...newSelectedColors]; // Crear copia
                this.colorCount = newSelectedColors.length;
                
                // CRÍTICO: Regenerar COMPLETAMENTE los objetos Color
                this.availableColors = this.gameService.getColorObjects(this.selectedColors);
                
                console.log('✅ [GamePolling] Colores actualizados exitosamente:', {
                  totalColors: this.availableColors.length,
                  colorObjects: this.availableColors.map(c => ({ 
                    name: c.name, 
                    hex: c.hexColor, 
                    display: c.displayName 
                  }))
                });
              } else if (!Array.isArray(newSelectedColors) || newSelectedColors.length === 0) {
                console.warn('⚠️ [GamePolling] Colores de la sala vacíos o inválidos:', newSelectedColors);
              }
            } else {
              console.log('🔍 [GamePolling] No hay colores en gameState.room');
            }
            
            this.updatePlayerTurn();
            
            // Auto-iniciar juego cuando ambos jugadores estén presentes
            if (this.shouldAutoStartGame()) {
              console.log('🚀 Auto-iniciando el juego...');
              this.autoStartGame();
            }
            
            // Redirigir automáticamente a rooms cuando el juego termine
            if (this.gameState?.status === 'finished' && previousStatus !== 'finished') {
              console.log('🏁 Juego terminado, redirigiendo a rooms...');
              setTimeout(() => {
                this.backToRooms();
              }, 3000); // Esperar 3 segundos para mostrar el resultado
            }
            
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
    
    // Obtener player IDs - el player1 es quien creó la partida
    const player1Id = this.gameState.room?.player1Id || this.gameState.player1Id;
    const player2Id = this.gameState.room?.player2Id || this.gameState.player2Id;
    
    // El player1 (creador) siempre es "jugador 1" para efectos de turnos
    const isCreator = this.currentUser.id === player1Id;
    const currentPlayerTurn = this.gameState.currentPlayerTurn;
    
    // Si eres el creador, tu turno es cuando currentPlayerTurn === 1
    // Si no eres el creador, tu turno es cuando currentPlayerTurn === 2
    this.isPlayerTurn = (isCreator && currentPlayerTurn === 1) || (!isCreator && currentPlayerTurn === 2);
    
    // Para casos especiales al inicio del juego
    if (this.gameState.status === 'playing' && this.gameState.currentRound === 1 && this.currentSequence.length === 0) {
      // Solo el creador puede escoger el primer color
      this.isPlayerTurn = isCreator;
    }
    
    console.log('Player turn update:', {
      currentUserId: this.currentUser.id,
      player1Id,
      player2Id,
      isCreator,
      currentPlayerTurn,
      isPlayerTurn: this.isPlayerTurn,
      gameStatus: this.gameState.status,
      currentRound: this.gameState.currentRound,
      sequenceLength: this.currentSequence.length
    });
  }

  /**
   * Verifica si el juego debe iniciarse automáticamente
   */
  private shouldAutoStartGame(): boolean {
    if (!this.gameState || !this.currentUser) {
      console.log('❌ Auto-inicio: No hay gameState o currentUser');
      return false;
    }
    
    // Verificar si es el creador de la partida (player1)
    const player1Id = this.gameState.room?.player1Id || this.gameState.player1Id;
    const player2Id = this.gameState.room?.player2Id || this.gameState.player2Id;
    const isCreator = this.currentUser.id === player1Id;
    
    // Solo auto-iniciar si:
    // 1. Es el creador de la partida (player1)
    // 2. El juego está en estado 'waiting'
    // 3. Hay 2 jugadores en la sala (player1Id Y player2Id están definidos)
    // 4. El juego no ha sido iniciado todavía (currentRound === 0)
    const gameWaiting = this.gameState.status === 'waiting';
    const notStartedYet = this.gameState.currentRound === 0;
    const bothPlayersPresent = Boolean(player1Id && player2Id); // Asegurar que sea boolean
    
    const shouldStart = Boolean(isCreator && 
                       gameWaiting && 
                       bothPlayersPresent && 
                       notStartedYet);
    
    console.log('🔍 Verificando auto-inicio:', {
      isCreator,
      player1Id,
      player2Id,
      currentUserId: this.currentUser.id,
      gameStatus: this.gameState.status,
      roomStatus: this.gameState.room?.status,
      currentRound: this.gameState.currentRound,
      gameWaiting,
      bothPlayersPresent,
      notStartedYet,
      shouldStart,
      fullGameState: this.gameState
    });
    
    return shouldStart;
  }

  /**
   * Auto-inicia el juego - el creador escoge el primer color
   */
  private autoStartGame(): void {
    if (!this.gameState || !this.currentUser) return;
    
    // El juego inicia sin secuencia - el creador escogerá el primer color
    const updatedState: Partial<GameState> = {
      status: 'playing',
      currentRound: 1,
      sequence: [], // Sin secuencia inicial - el creador escoge primer color
      showingSequence: false,
      currentPlayerTurn: 1 // El creador (quien auto-inicia) es quien escoge
    };
    
    console.log('Auto-iniciando juego con estado:', updatedState);
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('✅ Juego auto-iniciado exitosamente - creador puede escoger primer color');
      },
      error: (error) => {
        console.error('❌ Error auto-iniciando juego:', error);
        this.error = 'Error al iniciar el juego';
      }
    });
  }

  /**
   * Genera colores por defecto si no se especificaron colores personalizados
   * MEJORADO: Sin límites de cantidad
   */
  private generateDefaultColors(count: number): string[] {
    const baseColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'lime', 'indigo'];
    const extendedColors = [
      ...baseColors,
      'crimson', 'navy', 'teal', 'gold', 'coral', 'violet', 'salmon', 'turquoise', 'khaki', 'plum',
      'maroon', 'olive', 'silver', 'chocolate', 'tomato', 'orchid', 'lightblue', 'darkgreen', 'orange-red', 'medium-purple'
    ];
    
    const colors: string[] = [];
    
    // Usar colores predefinidos primero
    for (let i = 0; i < count && i < extendedColors.length; i++) {
      colors.push(extendedColors[i]);
    }
    
    // Si necesitamos más colores, generar hexadecimales aleatorios
    for (let i = extendedColors.length; i < count; i++) {
      colors.push(this.generateRandomHexColor());
    }
    
    console.log(`🎨 Generando ${count} colores por defecto:`, colors);
    return colors;
  }
  
  /**
   * Genera un color hexadecimal aleatorio único
   */
  private generateRandomHexColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * Genera el siguiente paso en la secuencia usando los colores seleccionados
   */
  private generateNextSequenceStep(currentSequence: string[]): string[] {
    if (this.selectedColors.length === 0) {
      console.warn('No hay colores seleccionados, usando colores por defecto');
      this.selectedColors = this.generateDefaultColors(this.colorCount || 4);
      this.availableColors = this.gameService.getColorObjects(this.selectedColors);
    }
    
    const randomIndex = Math.floor(Math.random() * this.selectedColors.length);
    const randomColor = this.selectedColors[randomIndex];
    
    console.log('Generando siguiente color:', {
      currentSequenceLength: currentSequence.length,
      availableColors: this.selectedColors,
      selectedColor: randomColor,
      newSequenceLength: currentSequence.length + 1
    });
    
    return [...currentSequence, randomColor];
  }

  /**
   * Reproduce la secuencia de colores - NUEVA LÓGICA: Solo muestra el último color
   */
  private playSequence(): void {
    if (this.currentSequence.length === 0) return;
    
    this.playerSequence = [];
    
    // NUEVA LÓGICA: Solo mostrar el último color de la secuencia
    // El jugador debe recordar toda la secuencia desde la memoria
    const lastColorIndex = this.currentSequence.length - 1;
    const lastColor = this.currentSequence[lastColorIndex];
    
    console.log('🎯 Mostrando el último color agregado por el jugador anterior:', {
      fullSequence: this.currentSequence,
      lastColor: lastColor,
      sequenceLength: this.currentSequence.length,
      isMyTurn: this.isPlayerTurn
    });
    
    // Resaltar el último color agregado por el jugador anterior
    this.highlightColor(lastColor);
    
    // Después del tiempo de resaltado, es turno del jugador actual
    setTimeout(() => {
      this.showingSequence = false;
      if (this.isPlayerTurn) {
        this.waitingForPlayer = true;
        console.log('✅ Ahora es tu turno. Repite toda la secuencia y agrega un color.');
      } else {
        console.log('⏳ Turno del otro jugador.');
      }
    }, this.SEQUENCE_SPEED);
  }

  /**
   * Resalta visualmente un color
   * MEJORADO: Busca por name O por hexColor
   */
  private highlightColor(colorIdentifier: string): void {
    console.log('🔦 [HighlightColor] Buscando elemento para:', colorIdentifier);
    
    // Buscar elemento por name directo
    let colorElement = document.getElementById(`color-${colorIdentifier}`);
    
    // Si no se encuentra por name, buscar por hexColor en availableColors
    if (!colorElement) {
      const colorObj = this.availableColors.find(c => 
        c.name === colorIdentifier || 
        c.hexColor.toLowerCase() === colorIdentifier.toLowerCase()
      );
      
      if (colorObj) {
        colorElement = document.getElementById(`color-${colorObj.name}`);
        console.log('🔍 [HighlightColor] Encontrado por mapeo:', {
          identifier: colorIdentifier,
          mappedToName: colorObj.name,
          hexColor: colorObj.hexColor
        });
      }
    }
    
    if (colorElement) {
      console.log('✅ [HighlightColor] Elemento encontrado, resaltando:', colorElement.id);
      colorElement.classList.add('active');
      setTimeout(() => {
        colorElement.classList.remove('active');
        console.log('🔹 [HighlightColor] Resaltado removido para:', colorElement.id);
      }, this.SEQUENCE_SPEED * 0.8);
    } else {
      console.error('❌ [HighlightColor] No se encontró elemento para:', {
        identifier: colorIdentifier,
        availableColors: this.availableColors.map(c => ({ name: c.name, hex: c.hexColor }))
      });
    }
  }

  /**
   * Maneja la selección del primer color por el jugador 1
   */
  handleFirstColorSelection(colorName: string): void {
    console.log('🎯 Jugador 1 seleccionó primer color:', colorName);
    
    // Actualizar secuencia con el primer color
    const newSequence = [colorName];
    
    const updatedState: Partial<GameState> = {
      sequence: newSequence,
      currentRound: 1,
      showingSequence: true,
      currentPlayerTurn: 2, // Cambiar turno al jugador 2
    };
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('✅ Primer color establecido, cambiando a jugador 2');
        this.currentSequence = newSequence;
        this.isPlayerTurn = false;
        this.showingSequence = true;
        
        // Reproducir el primer color
        setTimeout(() => {
          this.playSequence();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error estableciendo primer color:', error);
      }
    });
  }

  /**
   * Maneja el clic en un color - NUEVA LÓGICA POR TURNOS
   */
  onColorClick(color: Color): void {
    console.log('🖱️ Color clickeado:', color.name);
    console.log('📋 Estado actual:', {
      isPlayerTurn: this.isPlayerTurn,
      showingSequence: this.showingSequence,
      waitingForPlayer: this.waitingForPlayer,
      gameStarted: this.gameStarted,
      gameStatus: this.gameState?.status,
      currentRound: this.gameState?.currentRound
    });
    
    // Verificar si se puede hacer clic
    if (!this.gameStarted) {
      console.log('❌ Juego no iniciado');
      return;
    }
    
    if (this.showingSequence) {
      console.log('❌ Mostrando secuencia, espera');
      return;
    }
    
    if (!this.isPlayerTurn) {
      console.log('❌ No es tu turno');
      return;
    }
    
    // Resaltar el color clickeado inmediatamente
    this.highlightColor(color.name);
    
    // NUEVA LÓGICA: Si es la primera ronda, el creador de la partida escoge el primer color
    if (this.gameState?.currentRound === 1 && this.currentSequence.length === 0) {
      const player1Id = this.gameState.room?.player1Id;
      const isCreator = this.currentUser.id === player1Id;
      
      if (isCreator) {
        console.log('🎆 Creador escogiendo primer color');
        this.handleFirstColorSelection(color.name);
        return;
      } else {
        console.log('❌ Solo el creador puede escoger el primer color');
        return;
      }
    }
    
    // Si está esperando que agregue un nuevo color
    if (this.waitingForNewColor) {
      console.log('🎨 Agregando nuevo color a la secuencia');
      this.handleNewColorSelection(color.name);
      return;
    }
    
    // LÓGICA NORMAL: Repetir secuencia existente
    this.playerSequence.push(color.name);
    
    console.log('✅ Color agregado a secuencia del jugador:', {
      playerSequence: this.playerSequence,
      currentSequence: this.currentSequence,
      progress: `${this.playerSequence.length}/${this.currentSequence.length}`
    });
    
    // Verificar si la secuencia es correcta hasta ahora
    const isCorrect = this.playerSequence.every((colorName, index) => 
      colorName === this.currentSequence[index]
    );
    
    if (!isCorrect) {
      console.log('❌ Secuencia incorrecta - fin del juego');
      this.handleIncorrectSequence();
      return;
    }
    
    // Si completó la secuencia correctamente, ahora puede agregar su color
    if (this.playerSequence.length === this.currentSequence.length) {
      console.log('✅ Secuencia repetida correctamente! Ahora agrega tu color');
      this.waitingForNewColor = true;
      this.waitingForPlayer = false;
      this.playerSequence = []; // Resetear para el próximo color
      return; // Salir para esperar el siguiente clic
    }
  }
  
  /**
   * Maneja cuando el jugador agrega un nuevo color después de repetir la secuencia
   */
  handleNewColorSelection(colorName: string): void {
    console.log('🎨 Jugador agregando nuevo color:', colorName);
    
    // Agregar el nuevo color a la secuencia
    const newSequence = [...this.currentSequence, colorName];
    
    // Determinar el siguiente jugador
    const player1Id = this.gameState?.room?.player1Id || this.gameState?.player1Id;
    const isPlayer1 = this.currentUser.id === player1Id;
    const nextPlayerTurn = isPlayer1 ? 2 : 1;
    
    const updatedState: Partial<GameState> = {
      sequence: newSequence,
      currentRound: (this.gameState?.currentRound || 0) + 1,
      showingSequence: true,
      currentPlayerTurn: nextPlayerTurn,
      player1Score: isPlayer1 ? (this.gameState?.player1Score || 0) + 1 : this.gameState?.player1Score,
      player2Score: !isPlayer1 ? (this.gameState?.player2Score || 0) + 1 : this.gameState?.player2Score
    };
    
    this.waitingForNewColor = false;
    this.waitingForPlayer = false;
    this.isPlayerTurn = false;
    
    this.gameService.updateGameState(this.roomId!, updatedState).subscribe({
      next: () => {
        console.log('✅ Nuevo color agregado, cambiando turno');
        this.currentSequence = newSequence;
        this.showingSequence = true;
        
        // Reproducir la secuencia actualizada
        setTimeout(() => {
          this.playSequence();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error agregando nuevo color:', error);
      }
    });
  }
  

  private handleCorrectSequence(): void {
    console.log('¡Secuencia correcta!');
    
    // Incrementar puntuación
    const player1Id = this.gameState?.room?.player1Id || this.gameState?.player1Id;
    const isPlayer1 = this.currentUser.id === player1Id;
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
    
    const player1Id = this.gameState?.room?.player1Id || this.gameState?.player1Id;
    const player2Id = this.gameState?.room?.player2Id || this.gameState?.player2Id;
    const isPlayer1 = this.currentUser.id === player1Id;
    const winnerId = isPlayer1 ? player2Id : player1Id;
    
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
   * Obtiene el estilo para el último color agregado
   */
  getLastColorStyle(): any {
    console.log('🎨 [getLastColorStyle] Called with:', {
      sequenceLength: this.currentSequence.length,
      currentSequence: this.currentSequence,
      gameStarted: this.gameStarted,
      isPlayerTurn: this.isPlayerTurn,
      showIndicator: this.gameStarted && this.currentSequence.length > 0 && !this.isPlayerTurn
    });
    
    if (this.currentSequence.length === 0) {
      console.log('🎨 [getLastColorStyle] No sequence, returning empty style');
      return {};
    }
    
    const lastColorName = this.currentSequence[this.currentSequence.length - 1];
    const lastColor = this.availableColors.find(c => c.name === lastColorName || c.hexColor.toLowerCase() === lastColorName.toLowerCase());
    
    console.log('🎨 [getLastColorStyle] Last color details:', {
      lastColorName,
      foundColor: lastColor,
      availableColorsCount: this.availableColors.length
    });
    
    if (lastColor) {
      const style = {
        backgroundColor: lastColor.hexColor,
        border: '3px solid #fff',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
      };
      console.log('🎨 [getLastColorStyle] Returning style for found color:', style);
      return style;
    }
    
    // Fallback para colores hexadecimales directos
    const fallbackStyle = {
      backgroundColor: lastColorName,
      border: '3px solid #fff',
      boxShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)'
    };
    console.log('🎨 [getLastColorStyle] Returning fallback style:', fallbackStyle);
    return fallbackStyle;
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
        // Verificar si esperamos por el segundo jugador
        const player1Id = this.gameState.room?.player1Id || this.gameState.player1Id;
        const player2Id = this.gameState.room?.player2Id || this.gameState.player2Id;
        const isCreator = this.currentUser?.id === player1Id;
        
        if (!player2Id) {
          return isCreator 
            ? 'Esperando a que se una el segundo jugador...' 
            : 'Esperando a que inicie el juego...';
        } else {
          return isCreator 
            ? 'Ambos jugadores listos. Iniciando juego...' 
            : 'Esperando a que el creador inicie el juego...';
        }
      case 'playing':
        if (this.showingSequence) {
          return 'Observa el último color agregado';
        } else if (this.isPlayerTurn) {
          if (this.waitingForNewColor) {
            return '¡Tu turno! Agrega un nuevo color a la secuencia';
          } else if (this.gameState.currentRound === 1 && this.currentSequence.length === 0) {
            return '¡Tu turno! Escoge el primer color';
          } else {
            return '¡Tu turno! Repite toda la secuencia y agrega un color';
          }
        } else {
          return 'Esperando al otro jugador...';
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
   * Intenta recuperar los colores guardados en localStorage
   */
  private tryRecoverColorsFromStorage(): void {
    if (!this.roomId) return;
    
    try {
      const storedColorsData = localStorage.getItem(`game_colors_${this.roomId}`);
      if (storedColorsData) {
        const colorsData = JSON.parse(storedColorsData);
        
        if (colorsData.selectedColors && Array.isArray(colorsData.selectedColors)) {
          this.selectedColors = colorsData.selectedColors;
          this.colorCount = colorsData.colorCount;
          
          // Regenerar availableColors usando el servicio para consistencia
          this.availableColors = this.gameService.getColorObjects(this.selectedColors);
          
          console.log('🔄 Colores recuperados del localStorage:', {
            totalColors: this.selectedColors.length,
            colors: this.selectedColors,
            availableColors: this.availableColors.length
          });
        }
      }
    } catch (error) {
      console.error('❌ Error recuperando colores del localStorage:', error);
    }
  }

  /**
   * TrackBy function para optimizar el rendimiento del *ngFor
   */
  trackByColorName(index: number, color: Color): string {
    return color.name;
  }

}
