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

  /**
   * Inicia el polling para actualizar las partidas automáticamente
   */
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

    // Si el usuario se está uniendo a una partida, no verificar estado de espera
    if (this.isJoiningRoom) {
      console.log(
        '🔄 Usuario se está uniendo a partida, saltando verificación de espera'
      );
      return;
    }

    console.log(
      'Verificando estado de espera para usuario:',
      this.currentUser.id
    );
    console.log(
      'Partidas disponibles:',
      this.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        player1Id: r.player1Id,
        player2Id: r.player2Id,
        status: r.status,
      }))
    );

    // Buscar si el usuario está como player1 en una partida en estado 'waiting'
    const waitingRoom = this.rooms.find((room) => {
      // Convertir ambos IDs a string para comparación segura
      const roomPlayer1Id = String(room.player1Id);
      const currentUserId = String(this.currentUser!.id);

      const isPlayer1 = roomPlayer1Id === currentUserId;
      const isWaiting = room.status === 'waiting';
      const hasOnlyOnePlayer = room.currentPlayers === 1;

      console.log(
        `Partida ${room.id}: player1=${
          room.player1Id
        }(${typeof room.player1Id}), currentUserId=${
          this.currentUser!.id
        }(${typeof this.currentUser!.id}), isPlayer1=${isPlayer1}, status=${
          room.status
        }, isWaiting=${isWaiting}, players=${room.currentPlayers}`
      );

      return isPlayer1 && isWaiting && hasOnlyOnePlayer;
    });

    if (waitingRoom) {
      // Solo activar la landing si no estamos uniéndonos a otra partida
      if (!this.isJoiningRoom) {
        this.isWaitingForPlayer = true;
        this.waitingRoom = waitingRoom;
        console.log('✅ Usuario está esperando en la partida:', waitingRoom);
      }
    } else {
      // Solo cambiar el estado si realmente no está esperando
      if (this.isWaitingForPlayer) {
        console.log('❌ Usuario ya no está esperando, cambiando estado');
        this.isWaitingForPlayer = false;
        this.waitingRoom = null;
      }
    }
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
        // Agregar la nueva partida al inicio de la lista
        this.rooms.unshift(response.data);
        this.isLoading = false;

        // Establecer el estado de espera INMEDIATAMENTE
        this.isWaitingForPlayer = true;
        this.waitingRoom = response.data;

        // Cerrar el modal
        this.closeModal();

        console.log('✅ Partida creada y estado de espera activado:', {
          isWaitingForPlayer: this.isWaitingForPlayer,
          waitingRoom: this.waitingRoom,
        });

        // Opcionalmente, mostrar un mensaje de éxito
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
