import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateRoomModalComponent } from '../../components/create-room-modal/create-room-modal';
import { RoomCardComponent } from '../../components/room-card/room-card';
import { RoomService, Room, CreateRoomData } from '../../services/room.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

interface UserInfo {
  id: number;
  fullName: string;
  email: string;
}

@Component({
  selector: 'app-rooms-page',
  imports: [CommonModule, CreateRoomModalComponent, RoomCardComponent],
  templateUrl: './rooms-page.html',
  styleUrl: './rooms-page.css',
})
export class RoomsPage implements OnInit, OnDestroy {
  isModalVisible = false;
  rooms: Room[] = [];
  isLoading = false;
  error: string | null = null;
  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL = 5000;
  private readonly WAITING_POLLING_INTERVAL = 1000; // 1 segundo cuando está esperando

  currentUser: UserInfo | null = null;
  isWaitingForPlayer = false;
  waitingRoom: Room | null = null;
  joiningRoom: Room | null = null;
  isJoiningRoom = false;
  isCancellingRoom = false; // Bandera para evitar reapertura durante cancelación

  constructor(
    private roomService: RoomService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  openCreateRoomModal(): void {
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
  }

  private loadCurrentUser(): void {
    this.currentUser = this.roomService.getCurrentUserInfo();
    console.log('Usuario actual:', this.currentUser);

    if (!this.currentUser) {
      console.log('No hay usuario logueado, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }
  }

  private startPolling(): void {
    const pollingInterval = this.isWaitingForPlayer ? this.WAITING_POLLING_INTERVAL : this.POLLING_INTERVAL;
    
    this.pollingSubscription = interval(pollingInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.roomService.getAvailableRooms()),
        catchError((error) => {
          console.error('Error en polling:', error);
          this.error = 'Error al cargar las partidas. Reintentando...';
          return of({ data: [] as Room[], message: 'Error' });
        })
      )
      .subscribe({
        next: (response) => {
          this.rooms = response.data;
          this.isLoading = false;
          this.error = null;

          this.checkWaitingStatus();

          console.log('Partidas actualizadas:', this.rooms);
        },
        error: (error) => {
          console.error('Error crítico en polling:', error);
          this.error = 'Error crítico al cargar partidas.';
          this.isLoading = false;
        },
      });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
  
  private restartPolling(): void {
    console.log('Reiniciando polling con intervalo más frecuente...');
    this.stopPolling();
    this.startPolling();
  }

  pausePolling(): void {
    this.stopPolling();
  }

  resumePolling(): void {
    if (!this.pollingSubscription) {
      this.startPolling();
    }
  }

  refreshRooms(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.isLoading = true;
    this.error = null;

    this.roomService.getAvailableRooms().subscribe({
      next: (response) => {
        this.rooms = response.data;
        this.isLoading = false;
        console.log('Partidas cargadas:', this.rooms);
      },
      error: (error) => {
        console.error('Error al cargar partidas:', error);
        this.error = 'Error al cargar las partidas. Intenta nuevamente.';
        this.isLoading = false;
        this.rooms = [];
      },
    });
  }

  private checkWaitingStatus(): void {
    if (!this.currentUser) {
      console.log(
        'No hay usuario actual, no se puede verificar estado de espera'
      );
      return;
    }

    console.log(
      'Verificando estado de espera para usuario:',
      this.currentUser.id
    );

    const userRoom = this.rooms.find((room) => {
      const roomPlayer1Id = Number(room.player1Id);
      const currentUserId = Number(this.currentUser!.id);
      return roomPlayer1Id === currentUserId;
    });

    if (userRoom) {
      console.log('🔍 Usuario encontrado en partida:', userRoom);

      // Si la partida está terminada o cancelada, limpiar estado de espera
      if (userRoom.status === 'finished') {
        console.log('🚫 Partida terminada/cancelada, limpiando estado de espera');
        if (this.isWaitingForPlayer) {
          this.isWaitingForPlayer = false;
          this.waitingRoom = null;
        }
        return;
      }

      if (userRoom.currentPlayers === 2) {
        console.log('🎮 Segundo jugador se ha unido, entrando al juego...');
        this.redirectToGame(userRoom);
        return;
      }

      if (userRoom.status === 'waiting' && userRoom.currentPlayers === 1) {
        if (!this.isWaitingForPlayer && !this.isCancellingRoom) {
          console.log('✅ Usuario está esperando en la partida:', userRoom);
          this.isWaitingForPlayer = true;
          this.waitingRoom = userRoom;
          // Reiniciar polling con intervalo más frecuente
          this.restartPolling();
        }
      }
    } else {
      if (this.isWaitingForPlayer && this.waitingRoom) {
        console.log(
          '🚨 Partida de espera desapareció - ¡Segundo jugador se unió!'
        );
        console.log('🎮 Redirigiendo al juego...');

        const gameRoom = {
          ...this.waitingRoom,
          currentPlayers: 2,
          status: 'in_progress',
        };

        this.redirectToGame(gameRoom);
        return;
      }

      if (this.isWaitingForPlayer) {
        console.log('❌ Limpiando estado de espera');
        this.isWaitingForPlayer = false;
        this.waitingRoom = null;
      }
    }
  }

  private redirectToGame(room: any): void {
    console.log('🎮 Redirigiendo al juego, limpiando estado de espera...');
    this.isWaitingForPlayer = false;
    this.waitingRoom = null;

    this.stopPolling();

    // FIXED: Asegurar que los colores se mantengan correctamente
    const gameData = {
      ...room,
      selectedColors: room.selectedColors || [],
      colorCount: room.colorCount || 4
    };

    console.log('🎨 Guardando datos del juego con colores:', gameData);
    localStorage.setItem('current_game', JSON.stringify(gameData));

    this.router.navigate(['/juego', room.id]);
  }

  cancelWaitingRoom(): void {
    if (!this.waitingRoom) return;

    console.log('Cancelando partida:', this.waitingRoom);
    
    // Detener el polling inmediatamente para evitar conflictos
    this.stopPolling();
    
    // Cerrar el modal inmediatamente
    const roomIdToCancel = this.waitingRoom.id;
    this.isWaitingForPlayer = false;
    this.waitingRoom = null;
    
    // Cambiar el estado de la partida a 'finished' usando el endpoint de actualización
    const cancelGameData = {
      status: 'finished',
      playerLeft: 1, // El jugador 1 (creador) canceló
      gameOver: true,
      cancelled: true
    };
    
    this.roomService.updateGameState(roomIdToCancel, cancelGameData).subscribe({
      next: (response) => {
        console.log('Partida cancelada exitosamente:', response);
        
        // Dar tiempo al servidor para actualizar antes de reanudar polling
        setTimeout(() => {
          this.restartPolling();
          this.loadRooms();
        }, 500);
        
        console.log('Partida cancelada y lista actualizada');
      },
      error: (error) => {
        console.error('Error al cancelar partida:', error);
        
        // Mostrar error al usuario pero mantener el modal cerrado
        this.error = error.error?.message || 'Error al cancelar la partida, pero se cerró el modal.';
        
        // Reanudar polling después de un breve delay incluso si hay error
        setTimeout(() => {
          this.restartPolling();
          this.loadRooms();
        }, 500);
      }
    });
  }

  onCreateRoom(roomData: CreateRoomData): void {
    console.log('🎮 Nueva partida solicitada:', roomData);
    
    // FIXED: Remover límite máximo de colores, solo validar mínimo
    if (!roomData.colorCount || roomData.colorCount < 2) {
      console.error('❌ Cantidad de colores inválida - debe ser al menos 2');
      this.error = 'La cantidad de colores debe ser al menos 2';
      return;
    }
    
    // FIXED: Validar que tengamos colores seleccionados
    let selectedColors = roomData.selectedColors;
    if (!selectedColors || selectedColors.length === 0) {
      console.log('⚠️ No hay colores seleccionados, generando colores por defecto...');
      const availableColors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'orange', 'pink', 'lime', 'indigo', 'brown', 'gray', 'navy', 'maroon', 'olive', 'teal'];
      selectedColors = availableColors.slice(0, roomData.colorCount);
    }
    
    const createRoomData = {
      name: roomData.name,
      colorCount: selectedColors.length, // FIXED: Usar la longitud real de colores seleccionados
      selectedColors: selectedColors
    };

    console.log('🎨 Creando sala con colores ILIMITADOS:', createRoomData);
    console.log('🎨 Total de colores a usar:', selectedColors.length);

    this.isLoading = true;
    this.error = null;

    this.roomService.createRoom(createRoomData).subscribe({
      next: (response) => {
        console.log('✅ Partida creada exitosamente:', response.data);
        
        // FIXED: Asegurar que los colores se guarden correctamente
        const gameDataForStorage = {
          ...response.data,
          selectedColors: selectedColors,
          colorCount: selectedColors.length // FIXED: Usar longitud real
        };
        
        console.log('🎨 Guardando en localStorage (UNLIMITED):', gameDataForStorage);
        localStorage.setItem('current_game', JSON.stringify(gameDataForStorage));
        
        this.rooms.unshift(response.data);
        this.isLoading = false;

        this.isWaitingForPlayer = true;
        this.waitingRoom = response.data;
        
        this.restartPolling();
        this.closeModal();

        console.log('✅ Partida creada con colores ilimitados:', {
          isWaitingForPlayer: this.isWaitingForPlayer,
          waitingRoom: this.waitingRoom,
          totalColors: selectedColors.length,
          colorsInStorage: gameDataForStorage.selectedColors
        });

        console.log(response.message);
      },
      error: (error) => {
        console.error('❌ Error al crear partida:', error);
        this.error =
          error.error?.message ||
          'Error al crear la partida. Intenta nuevamente.';
        this.isLoading = false;
      },
    });
  }

  trackByRoomId(index: number, room: Room): string {
    return room.id;
  }

  get isPollingActive(): boolean {
    return this.pollingSubscription !== null;
  }

  handleJoinRoom(room: Room): void {
    if (this.isJoiningRoom) {
      console.warn('Ya te estás uniendo a una sala, espera...');
      return;
    }

    this.isJoiningRoom = true;
    this.joiningRoom = room;
    this.error = null;

    console.log('🎮 Player 2 attempting to join room:', room);
    console.log('🎨 Room colors available:', room.selectedColors);

    this.roomService.joinGame(room.id).subscribe({
      next: (response) => {
        console.log('✅ Join successful, response:', response.data);

        this.stopPolling();

        // FIXED: Asegurar que el jugador 2 reciba EXACTAMENTE los mismos colores
        const gameDataForPlayer2 = {
          id: response.data.id || room.id,
          name: response.data.name || room.name,
          colorCount: room.colorCount, // FIXED: Usar datos de la room original
          selectedColors: room.selectedColors || [], // FIXED: Usar colores de la room original
          player1Id: response.data.player1Id || room.player1Id,
          player2Id: response.data.player2Id,
          currentPlayers: response.data.currentPlayers || room.currentPlayers,
          maxPlayers: response.data.maxPlayers || room.maxPlayers,
          status: response.data.status || room.status,
          host: response.data.host || room.host,
          isActive: response.data.isActive !== undefined ? response.data.isActive : room.isActive,
          createdAt: response.data.createdAt || room.createdAt
        };

        console.log('🎨 CRITICAL - Player 2 game data with colors:', gameDataForPlayer2);
        console.log('🎨 CRITICAL - Specific colors for player 2:', gameDataForPlayer2.selectedColors);

        localStorage.setItem('current_game', JSON.stringify(gameDataForPlayer2));

        // FIXED: Verificar que se guardó correctamente
        const savedData = JSON.parse(localStorage.getItem('current_game') || '{}');
        console.log('🎨 VERIFICATION - Data saved to localStorage:', savedData);
        console.log('🎨 VERIFICATION - Colors in saved data:', savedData.selectedColors);

        this.router.navigate(['/juego', room.id]);
      },
      error: (err) => {
        console.error('❌ Error al unirse a la sala:', err);
        this.error =
          err.error?.message || 'No se pudo unir a la sala. Intenta de nuevo.';
      },
      complete: () => {
        this.isJoiningRoom = false;
        this.joiningRoom = null;
      },
    });
  }
}