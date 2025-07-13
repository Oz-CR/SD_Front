import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateRoomModalComponent } from '../../components/create-room-modal/create-room-modal';
import { RoomCardComponent } from '../../components/room-card/room-card';
import { RoomService, Room, CreateRoomData } from '../../services/room.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface RoomData {
  gameName: string;
  colorCount: number;
}

@Component({
  selector: 'app-rooms-page',
  imports: [CommonModule, CreateRoomModalComponent, RoomCardComponent],
  templateUrl: './rooms-page.html',
  styleUrl: './rooms-page.css'
})
export class RoomsPage implements OnInit, OnDestroy {
  isModalVisible = false;
  rooms: Room[] = [];
  isLoading = false;
  error: string | null = null;
  private pollingSubscription: Subscription | null = null;
  private readonly POLLING_INTERVAL = 5000; // 5 segundos

  constructor(private roomService: RoomService) {}

  ngOnInit(): void {
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
          console.log('Partidas actualizadas:', this.rooms);
        },
        error: (error) => {
          console.error('Error crítico en polling:', error);
          this.error = 'Error crítico al cargar partidas.';
          this.isLoading = false;
        }
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
      }
    });
  }

  /**
   * Maneja la creación de una nueva partida
   */
  onCreateRoom(roomData: RoomData): void {
    console.log('Nueva partida creada:', roomData);
    
    const createRoomData = {
      name: roomData.gameName,
      colorCount: roomData.colorCount
    };
    
    this.isLoading = true;
    this.error = null;
    
    this.roomService.createRoom(createRoomData).subscribe({
      next: (response) => {
        console.log('Partida creada exitosamente:', response.data);
        // Agregar la nueva partida al inicio de la lista
        this.rooms.unshift(response.data);
        this.isLoading = false;
        // Opcionalmente, mostrar un mensaje de éxito
        console.log(response.message);
      },
      error: (error) => {
        console.error('Error al crear partida:', error);
        this.error = error.error?.message || 'Error al crear la partida. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Maneja el evento de unirse a una sala
   */
  onJoinRoom(room: Room): void {
    console.log('Intentando unirse a la sala:', room);
    // Aquí puedes agregar la lógica para unirse a la partida
    // Por ejemplo, navegar a la sala de juego o mostrar un modal de confirmación
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
}
