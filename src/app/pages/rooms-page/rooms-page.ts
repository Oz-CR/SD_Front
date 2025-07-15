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

interface RoomData {
  gameName: string;
  colorCount: number;
}

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
  private readonly POLLING_INTERVAL = 5000; // 5 segundos

  // Estados para el jugador
  currentUser: UserInfo | null = null;
  isWaitingForPlayer = false;
  waitingRoom: Room | null = null;
  joiningRoom: Room | null = null;
  isJoiningRoom = false;

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

  /**
   * Abre el modal para crear una nueva partida
   */
  openCreateRoomModal(): void {
    this.isModalVisible = true;
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.isModalVisible = false;
  }

  /**
   * Carga la información del usuario actual
   */
  private loadCurrentUser(): void {
    this.currentUser = this.roomService.getCurrentUserInfo();
    console.log('Usuario actual:', this.currentUser);

    // Si no hay usuario, redirigir al login
    if (!this.currentUser) {
      console.log('No hay usuario logueado, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }
  }

  private startPolling(): void {
    this.pollingSubscription = interval(this.POLLING_INTERVAL)
      .pipe(
        startWith(0), // Ejecuta inmediatamente al suscribirse
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

          // Verificar si el usuario está esperando en alguna partida
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

  /**
   * Detiene el polling
   */
  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Pausa el polling (útil cuando el usuario está en otra pestaña)
   */
  pausePolling(): void {
    this.stopPolling();
  }

  /**
   * Reanuda el polling
   */
  resumePolling(): void {
    if (!this.pollingSubscription) {
      this.startPolling();
    }
  }

  /**
   * Refresh manual de las partidas
   */
  refreshRooms(): void {
    this.loadRooms();
  }

  /**
   * Carga las partidas disponibles del backend (método manual)
   */
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

  /**
   * Verifica si el usuario está esperando en alguna partida
   */
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

    // Buscar si el usuario está como player1 en alguna partida
    const userRoom = this.rooms.find((room) => {
      const roomPlayer1Id = Number(room.player1Id);
      const currentUserId = Number(this.currentUser!.id);
      return roomPlayer1Id === currentUserId;
    });

    if (userRoom) {
      console.log('🔍 Usuario encontrado en partida:', userRoom);

      // Si la partida tiene 2 jugadores, redirigir al juego
      if (userRoom.currentPlayers === 2) {
        console.log('🎮 Segundo jugador se ha unido, entrando al juego...');
        this.redirectToGame(userRoom);
        return;
      }

      // Si la partida está esperando, actualizar estado
      if (userRoom.status === 'waiting' && userRoom.currentPlayers === 1) {
        if (!this.isWaitingForPlayer) {
          console.log('✅ Usuario está esperando en la partida:', userRoom);
          this.isWaitingForPlayer = true;
          this.waitingRoom = userRoom;
        }
      }
    } else {
      // Si estábamos esperando y la partida desapareció, es porque se llenó
      if (this.isWaitingForPlayer && this.waitingRoom) {
        console.log(
          '🚨 Partida de espera desapareció - ¡Segundo jugador se unió!'
        );
        console.log('🎮 Redirigiendo al juego...');

        // Crear objeto room para la redirección
        const gameRoom = {
          ...this.waitingRoom,
          currentPlayers: 2,
          status: 'in_progress',
        };

        this.redirectToGame(gameRoom);
        return;
      }

      // Limpiar estado si no estábamos esperando
      if (this.isWaitingForPlayer) {
        console.log('❌ Limpiando estado de espera');
        this.isWaitingForPlayer = false;
        this.waitingRoom = null;
      }
    }
  }

  /**
   * Redirige al juego y limpia el estado
   */
  private redirectToGame(room: any): void {
    // Limpiar estados de espera
    this.isWaitingForPlayer = false;
    this.waitingRoom = null;

    // Detener polling
    this.stopPolling();

    // Guardar datos del juego
    localStorage.setItem('current_game', JSON.stringify(room));

    // Redirigir al juego
    this.router.navigate(['/juego', room.id]);
  }
  /**
   * Cancela la partida mientras se espera al segundo jugador
   */
  cancelWaitingRoom(): void {
    if (!this.waitingRoom) return;

    // Aquí podrías implementar un método para cancelar la partida
    console.log('Cancelando partida:', this.waitingRoom);
    this.isWaitingForPlayer = false;
    this.waitingRoom = null;

    // Recargar las partidas
    this.loadRooms();
  }

  /**
   * Maneja la creación de una nueva partida
   */
  onCreateRoom(roomData: RoomData): void {
    console.log('Nueva partida creada:', roomData);

    const createRoomData = {
      name: roomData.gameName,
      colorCount: roomData.colorCount,
    };

    this.isLoading = true;
    this.error = null;

    this.roomService.createRoom(createRoomData).subscribe({
      next: (response) => {
        console.log('Partida creada exitosamente:', response.data);
        this.rooms.unshift(response.data);
        this.isLoading = false;

        this.isWaitingForPlayer = true;
        this.waitingRoom = response.data;

        this.closeModal();

        console.log('✅ Partida creada y estado de espera activado:', {
          isWaitingForPlayer: this.isWaitingForPlayer,
          waitingRoom: this.waitingRoom,
        });

        console.log(response.message);
      },
      error: (error) => {
        console.error('Error al crear partida:', error);
        this.error =
          error.error?.message ||
          'Error al crear la partida. Intenta nuevamente.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Función trackBy para optimizar el rendimiento del *ngFor
   */
  trackByRoomId(index: number, room: Room): string {
    return room.id;
  }

  /**
   * Getter para verificar si el polling está activo (para el template)
   */
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

    console.log('Intentando unirse a la sala:', room.id);

    this.roomService.joinGame(room.id).subscribe({
      next: (response) => {
        console.log('✅ Unión exitosa:', response.data);

        // Detener polling y redirigir a la sala de juego (si aplica)
        this.stopPolling();

        // Opcional: puedes guardar los datos del juego en localStorage o en un servicio
        localStorage.setItem('current_game', JSON.stringify(response.data));

        // Redireccionar a la vista de juego
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
