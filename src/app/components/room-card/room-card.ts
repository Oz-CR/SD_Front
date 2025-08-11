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

  private colorNameToHex: { [key: string]: string } = {
    'red': '#FF4444',
    'blue': '#4444FF', 
    'green': '#44FF44',
    'yellow': '#FFFF44',
    'orange': '#FF8844',
    'purple': '#FF44FF',
    'pink': '#FF88BB',
    'cyan': '#44FFFF',
    'lime': '#88FF44',
    'indigo': '#4444AA',
    'brown': '#8B4513',
    'gray': '#808080',
    'navy': '#000080',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080'
  };

  private colorDisplayNames: { [key: string]: string } = {
    'red': 'Rojo',
    'blue': 'Azul',
    'green': 'Verde',
    'yellow': 'Amarillo',
    'orange': 'Naranja',
    'purple': 'Morado',
    'pink': 'Rosa',
    'cyan': 'Cian',
    'lime': 'Lima',
    'indigo': 'Índigo',
    'brown': 'Marrón',
    'gray': 'Gris',
    'navy': 'Azul Marino',
    'maroon': 'Granate',
    'olive': 'Oliva',
    'teal': 'Verde Azulado'
  };

  constructor() {}

  onJoinRoom(): void {
    if (this.room.isActive && this.room.currentPlayers < this.room.maxPlayers) {
      this.joinRoomEvent.emit(this.room);
    }
  }

  /**
   * FIXED: Etiquetas de dificultad para colores ilimitados
   */
  getDifficultyLabel(): string {
    const colorCount = this.room.colorCount;
    
    if (colorCount <= 2) return 'Fácil';
    if (colorCount <= 3) return 'Medio';
    if (colorCount <= 4) return 'Difícil';
    if (colorCount <= 6) return 'Muy Difícil';
    if (colorCount <= 8) return 'Extremo';
    if (colorCount <= 10) return 'Insano';
    if (colorCount <= 12) return 'Imposible';
    if (colorCount <= 15) return 'Legendario';
    return 'Épico';
  }

  /**
   * FIXED: Iconos de dificultad para colores ilimitados
   */
  getDifficultyIcon(): string {
    const colorCount = this.room.colorCount;
    
    if (colorCount <= 2) return '🟢';
    if (colorCount <= 3) return '🟡';
    if (colorCount <= 4) return '🟠';
    if (colorCount <= 6) return '🔴';
    if (colorCount <= 8) return '🟣';
    if (colorCount <= 10) return '⚫';
    if (colorCount <= 12) return '💀';
    if (colorCount <= 15) return '👑';
    return '🔥'; // Para niveles épicos
  }

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

  isRoomAvailable(): boolean {
    return this.room.isActive && this.room.currentPlayers < this.room.maxPlayers && !this.isJoining;
  }

  getOccupancyPercentage(): number {
    return (this.room.currentPlayers / this.room.maxPlayers) * 100;
  }

  getColorHex(colorName: string): string {
    return this.colorNameToHex[colorName] || '#CCCCCC';
  }

  getColorDisplayName(colorName: string): string {
    return this.colorDisplayNames[colorName] || colorName;
  }
}