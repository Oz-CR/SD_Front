import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Room } from '../../services/room.service';

@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-card.html',
  styleUrls: ['./room-card.css']
})
export class RoomCardComponent {
  @Input() room!: Room;
  @Input() isJoining: boolean = false;
  @Output() joinRoomEvent = new EventEmitter<Room>();

  constructor() {}

  /**
   * Emite el evento para unirse a la sala
   */
  onJoinRoom(): void {
    if (this.room.isActive && this.room.currentPlayers < this.room.maxPlayers) {
      this.joinRoomEvent.emit(this.room);
    }
  }

  /**
   * Obtiene la etiqueta de dificultad basada en la cantidad de colores
   */
  getDifficultyLabel(): string {
    const difficultyLabels: { [key: number]: string } = {
      2: 'Fácil',
      3: 'Medio',
      4: 'Difícil',
      5: 'Muy Difícil',
      6: 'Extremo'
    };
    
    return difficultyLabels[this.room.colorCount] || 'Personalizado';
  }

  /**
   * Obtiene el ícono de dificultad basado en la cantidad de colores
   */
  getDifficultyIcon(): string {
    const difficultyIcons: { [key: number]: string } = {
      2: '🟢',
      3: '🟡',
      4: '🟠',
      5: '🔴',
      6: '🟣'
    };
    
    return difficultyIcons[this.room.colorCount] || '⚪';
  }

  /**
   * Obtiene el texto del botón según el estado de la sala
   */
  getButtonText(): string {
    if (this.isJoining) {
      return 'Uniéndose...';
    }
    
    if (!this.room.isActive) {
      return 'Sala Inactiva';
    }
    
    if (this.room.currentPlayers >= this.room.maxPlayers) {
      return 'Sala Llena';
    }
    
    return 'Unirse';
  }

  /**
   * Verifica si la sala está disponible para unirse
   */
  isRoomAvailable(): boolean {
    return this.room.isActive && this.room.currentPlayers < this.room.maxPlayers && !this.isJoining;
  }

  /**
   * Obtiene el porcentaje de ocupación de la sala
   */
  getOccupancyPercentage(): number {
    return (this.room.currentPlayers / this.room.maxPlayers) * 100;
  }
}
