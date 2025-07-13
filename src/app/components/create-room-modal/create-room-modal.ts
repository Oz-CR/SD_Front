import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoomData {
  gameName: string;
  colorCount: number;
}

@Component({
  selector: 'app-create-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-room-modal.html',
  styleUrls: ['./create-room-modal.css']
})
export class CreateRoomModalComponent {
  @Input() isVisible: boolean = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() createRoomEvent = new EventEmitter<RoomData>();

  roomData: RoomData = {
    gameName: '',
    colorCount: 4
  };

  constructor() {}

  /**
   * Cierra el modal y resetea los datos
   */
  closeModal(): void {
    this.isVisible = false;
    this.closeModalEvent.emit();
    this.resetForm();
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (this.isFormValid()) {
      this.createRoomEvent.emit({ ...this.roomData });
      this.closeModal();
    }
  }

  /**
   * Valida si el formulario es válido
   */
  private isFormValid(): boolean {
    return this.roomData.gameName.trim().length > 0 && 
           this.roomData.colorCount >= 2 && 
           this.roomData.colorCount <= 6;
  }

  /**
   * Resetea el formulario a sus valores iniciales
   */
  private resetForm(): void {
    this.roomData = {
      gameName: '',
      colorCount: 4
    };
  }

  /**
   * Obtiene la etiqueta de dificultad basada en la cantidad de colores
   */
  getDifficultyLabel(): string {
    const difficultyLabels: { [key: number]: string } = {
      2: 'Fácil',
      3: 'Medio',
      4: 'Difícil',
      5: 'Muy Difícil'
    };
    
    return difficultyLabels[this.roomData.colorCount] || 'Personalizado';
  }

  /**
   * Obtiene la descripción de dificultad basada en la cantidad de colores
   */
  getDifficultyDescription(): string {
    const descriptions: { [key: number]: string } = {
      2: 'Perfecto para principiantes. Secuencias simples y fáciles de recordar.',
      3: 'Nivel intermedio. Requiere más concentración y memoria.',
      4: 'Nivel avanzado. Desafío estándar de Simon Says.',
      5: 'Nivel muy avanzado. Requiere excelente memoria y concentración.',
      6: 'Máximo desafío. Solo para jugadores experimentados.'
    };
    
    return descriptions[this.roomData.colorCount] || 
           `Desafío personalizado con ${this.roomData.colorCount} colores.`;
  }

  /**
   * Abre el modal
   */
  openModal(): void {
    this.isVisible = true;
  }
}
