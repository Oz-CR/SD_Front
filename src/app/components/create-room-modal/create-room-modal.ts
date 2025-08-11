import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService, ColorOption, CreateRoomData } from '../../services/room.service';

@Component({
  selector: 'app-create-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-room-modal.html',
  styleUrls: ['./create-room-modal.css']
})
export class CreateRoomModalComponent implements OnInit {
  @Input() isVisible: boolean = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() createRoomEvent = new EventEmitter<CreateRoomData>();

  roomData: CreateRoomData = {
    name: '',
    colorCount: 4,
    selectedColors: []
  };

  availableColors: ColorOption[] = [];
  isCustomColors = false;
  isLoadingColors = false;

  constructor(private roomService: RoomService) {}

  ngOnInit(): void {
    this.loadAvailableColors();
  }

  private loadAvailableColors(): void {
    this.isLoadingColors = true;
    this.roomService.getValidColors().subscribe({
      next: (response) => {
        this.availableColors = response.data;
        this.isLoadingColors = false;
        console.log('🎨 Available colors loaded (unlimited):', this.availableColors);
      },
      error: (error) => {
        console.error('Error cargando colores:', error);
        this.isLoadingColors = false;
        this.availableColors = [
          { name: 'red', displayName: 'Rojo', hexColor: '#FF4444' },
          { name: 'blue', displayName: 'Azul', hexColor: '#4444FF' },
          { name: 'green', displayName: 'Verde', hexColor: '#44FF44' },
          { name: 'yellow', displayName: 'Amarillo', hexColor: '#FFFF44' },
          { name: 'purple', displayName: 'Morado', hexColor: '#FF44FF' },
          { name: 'cyan', displayName: 'Cian', hexColor: '#44FFFF' },
          { name: 'orange', displayName: 'Naranja', hexColor: '#FF8844' },
          { name: 'pink', displayName: 'Rosa', hexColor: '#FF88BB' },
          { name: 'lime', displayName: 'Lima', hexColor: '#88FF44' },
          { name: 'indigo', displayName: 'Índigo', hexColor: '#4444AA' },
          { name: 'brown', displayName: 'Marrón', hexColor: '#8B4513' },
          { name: 'gray', displayName: 'Gris', hexColor: '#808080' },
          { name: 'navy', displayName: 'Azul Marino', hexColor: '#000080' },
          { name: 'maroon', displayName: 'Granate', hexColor: '#800000' },
          { name: 'olive', displayName: 'Oliva', hexColor: '#808000' },
          { name: 'teal', displayName: 'Verde Azulado', hexColor: '#008080' }
        ];
      }
    });
  }

  closeModal(): void {
    this.isVisible = false;
    this.closeModalEvent.emit();
    this.resetForm();
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      let selectedColors: string[];
      if (this.isCustomColors && this.roomData.selectedColors.length > 0) {
        selectedColors = [...this.roomData.selectedColors];
      } else {
        selectedColors = this.getDefaultColors(this.roomData.colorCount);
      }

      const createRoomData: CreateRoomData = {
        name: this.roomData.name.trim(),
        colorCount: selectedColors.length,
        selectedColors: selectedColors
      };
      
      console.log('🎨 Creating room with UNLIMITED colors:', createRoomData);
      this.createRoomEvent.emit(createRoomData);
      this.closeModal();
    }
  }

  private getDefaultColors(count: number): string[] {
    const baseColors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'orange', 'pink', 'lime', 'indigo', 'brown', 'gray', 'navy', 'maroon', 'olive', 'teal'];
    
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    } else {
      return [...baseColors];
    }
  }

  openModal(): void {
    this.isVisible = true;
  }

  toggleCustomColors(): void {
    this.isCustomColors = !this.isCustomColors;
    
    if (this.isCustomColors) {
      this.roomData.selectedColors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];
    } else {
      this.roomData.selectedColors = [];
      if (this.roomData.colorCount > this.availableColors.length) {
        this.roomData.colorCount = this.availableColors.length;
      }
    }
  }

  toggleColorSelection(colorName: string): void {
    if (!this.roomData.selectedColors) {
      this.roomData.selectedColors = [];
    }

    const index = this.roomData.selectedColors.indexOf(colorName);
    
    if (index > -1) {
      this.roomData.selectedColors.splice(index, 1);
      console.log('🎨 Color removed, total selected:', this.roomData.selectedColors.length);
    } else {
      this.roomData.selectedColors.push(colorName);
      console.log('🎨 Color added, total selected:', this.roomData.selectedColors.length);
    }
  }

  isColorSelected(colorName: string): boolean {
    return this.roomData.selectedColors?.includes(colorName) || false;
  }

  isFormValid(): boolean {
    if (this.roomData.name.trim().length === 0) {
      console.error('El nombre de la sala es requerido');
      return false;
    }

    if (this.isCustomColors) {
      if (!this.roomData.selectedColors || this.roomData.selectedColors.length < 2) {
        console.error('Selecciona al menos 2 colores');
        return false;
      }
    } else {
      if (this.roomData.colorCount < 2) {
        console.error('La cantidad de colores debe ser al menos 2');
        return false;
      }
      if (this.roomData.colorCount > this.availableColors.length) {
        this.roomData.colorCount = this.availableColors.length;
      }
    }

    return true;
  }

  getSelectedColorsCount(): number {
    return this.roomData.selectedColors?.length || 0;
  }

  getDifficultyLabel(): string {
    const colorCount = this.isCustomColors ? 
      this.getSelectedColorsCount() : 
      this.roomData.colorCount || 4;

    if (colorCount <= 2) return 'Fácil';
    if (colorCount <= 3) return 'Medio';
    if (colorCount <= 4) return 'Difícil';
    if (colorCount <= 6) return 'Muy Difícil';
    if (colorCount <= 8) return 'Extremo';
    if (colorCount <= 10) return 'Insano';
    if (colorCount <= 12) return 'Imposible';
    return 'Legendario';
  }

  getDifficultyDescription(): string {
    const colorCount = this.isCustomColors ? 
      this.getSelectedColorsCount() : 
      this.roomData.colorCount || 4;

    if (colorCount <= 2) return 'Perfecto para principiantes. Secuencias simples y fáciles de recordar.';
    if (colorCount <= 3) return 'Nivel intermedio. Requiere más concentración y memoria.';
    if (colorCount <= 4) return 'Nivel avanzado. Desafío estándar de Simon Says.';
    if (colorCount <= 6) return 'Nivel muy avanzado. Requiere excelente memoria y concentración.';
    if (colorCount <= 8) return 'Nivel extremo. Solo para jugadores expertos.';
    if (colorCount <= 10) return 'Nivel insano. Desafío mental extremo.';
    if (colorCount <= 12) return 'Nivel imposible. ¿Realmente puedes recordar todo esto?';
    return `Nivel legendario con ${colorCount} colores. Esto es más allá de lo humanamente posible.`;
  }

  /**
   * FIXED: Método para seleccionar todos los colores disponibles
   */
  selectAllColors(): void {
    this.roomData.selectedColors = this.availableColors.map(color => color.name);
    console.log('🎨 All colors selected:', this.roomData.selectedColors.length);
  }

  /**
   * FIXED: Método para deseleccionar todos los colores
   */
  clearAllColors(): void {
    this.roomData.selectedColors = [];
    console.log('🎨 All colors cleared');
  }

  /**
   * FIXED: Método para verificar si todos los colores están seleccionados
   */
  areAllColorsSelected(): boolean {
    return this.roomData.selectedColors.length === this.availableColors.length;
  }

  /**
   * FIXED: Método trackBy para mejor performance con muchos colores
   */
  trackByColorName(index: number, color: ColorOption): string {
    return color.name;
  }

  private resetForm(): void {
    this.roomData = {
      name: '',
      colorCount: 4,
      selectedColors: []
    };
    this.isCustomColors = false;
  }
}