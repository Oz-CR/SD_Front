import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-game-page',
  imports: [CommonModule],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css'
})
export class GamePage implements OnInit {
  roomId: string | null = null;
  roomName: string | null = null;
  colorCount: number | null = null;
  currentUser: any = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService
  ) {}

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.roomId = params['roomId'];
      this.roomName = params['roomName'];
      this.colorCount = params['colorCount'];
      
      console.log('Parámetros de la partida:', {
        roomId: this.roomId,
        roomName: this.roomName,
        colorCount: this.colorCount
      });
      
      // Obtener información del usuario
      this.currentUser = this.roomService.getCurrentUserInfo();
      
      if (!this.currentUser) {
        this.error = 'No se pudo obtener información del usuario';
        this.router.navigate(['/login']);
        return;
      }
      
      if (!this.roomId) {
        this.error = 'ID de partida no válido';
        return;
      }
      
      this.isLoading = false;
    });
  }

  /**
   * Volver a la página de salas
   */
  backToRooms(): void {
    this.router.navigate(['/rooms']);
  }

  /**
   * Iniciar el juego (placeholder para futura implementación)
   */
  startGame(): void {
    console.log('¡Iniciando el juego!');
    // Aquí irá la lógica del juego Simon Says
  }
}
