import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Room } from '../../services/room.service';
import { GameService, Color } from '../../services/game.service';

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

  constructor(private gameService: GameService) {}

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

  /**
   * Verifica si la sala tiene colores personalizados
   */
  hasCustomColors(): boolean {
    return Boolean(this.room.selectedColors && this.room.selectedColors.length > 0);
  }

  /**
   * Obtiene los objetos Color para visualización
   */
  getDisplayColors(): Color[] {
    if (!this.hasCustomColors()) {
      return [];
    }
    
    return this.gameService.getColorObjects(this.room.selectedColors!);
  }

  /**
   * Obtiene una muestra de colores para mostrar (máximo 6)
   */
  getColorSample(): Color[] {
    const colors = this.getDisplayColors();
    return colors.slice(0, Math.min(6, colors.length));
  }

  /**
   * Verifica si hay más colores de los que se muestran
   */
  hasMoreColors(): boolean {
    const colors = this.getDisplayColors();
    return colors.length > 6;
  }

  /**
   * Obtiene el número de colores adicionales
   */
  getAdditionalColorsCount(): number {
    const colors = this.getDisplayColors();
    return Math.max(0, colors.length - 6);
  }
}
