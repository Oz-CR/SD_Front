import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, Color } from '../../services/game.service';

interface RoomData {
  gameName: string;
  colorCount: number;
  selectedColors: string[];
  customColors: Color[];
}

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
  @Output() createRoomEvent = new EventEmitter<RoomData>();

  roomData: RoomData = {
    gameName: '',
    colorCount: 4,
    selectedColors: [],
    customColors: []
  };

  // Estado para los slots de colores
  colorSlots: Color[] = [];

  // Colores disponibles para la base de los slots
  availableColors: Color[] = [];
  isLoadingColors = false;
  
  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.loadAvailableColors();
  }

  /**
   * Carga la lista completa de colores disponibles
   */
  private loadAvailableColors(): void {
    this.isLoadingColors = true;
    
    // Crear una paleta más amplia de colores predefinidos
    const extendedColors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'lime', 'indigo',
      'crimson', 'navy', 'teal', 'gold', 'coral', 'violet', 'salmon', 'turquoise', 'khaki', 'plum',
      'maroon', 'olive', 'silver', 'chocolate', 'tomato', 'orchid', 'lightblue', 'darkgreen', 'orange-red', 'medium-purple'
    ];
    
    this.gameService.getAvailableColors(30).subscribe({
      next: (response) => {
        this.availableColors = response.data || this.gameService.getColorObjects(extendedColors);
        this.generateColorSlots();
        this.isLoadingColors = false;
      },
      error: (error) => {
        console.error('Error cargando colores:', error);
        this.isLoadingColors = false;
        // Usar colores extendidos por defecto si falla la carga
        this.availableColors = this.gameService.getColorObjects(extendedColors);
        this.generateColorSlots();
      }
    });
  }

  /**
   * Genera los slots de colores según la cantidad establecida
   */
  private generateColorSlots(): void {
    this.colorSlots = [];
    
    // Crear tantos slots como la cantidad de colores especificada
    for (let i = 0; i < this.roomData.colorCount; i++) {
      if (i < this.availableColors.length) {
        // Usar colores predefinidos como base
        this.colorSlots.push({
          ...this.availableColors[i],
          name: `slot-${i}`, // Identificador único para el slot
          displayName: `Color ${i + 1}`
        });
      } else {
        // Generar colores aleatorios para slots adicionales
        this.colorSlots.push({
          name: `slot-${i}`,
          displayName: `Color ${i + 1}`,
          hexColor: this.generateRandomHexColor()
        });
      }
    }
    
    // Actualizar selectedColors con los valores de los slots
    this.updateSelectedColorsFromSlots();
  }


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
   * MEJORADO: Envío más robusto de datos
   */
  onSubmit(): void {
    if (this.isFormValid()) {
      // Preparar los datos con validación extra
      const selectedColors = this.prepareSelectedColors();
      
      const roomDataToSend = {
        ...this.roomData,
        colorCount: this.colorSlots.length, // Usar el length real de slots
        selectedColors: selectedColors,
        customColors: this.colorSlots // Enviar también los objetos completos
      };
      
      console.log('📤 [OnSubmit] Enviando datos finales de la sala:', {
        gameName: roomDataToSend.gameName,
        colorCount: roomDataToSend.colorCount,
        selectedColorsCount: roomDataToSend.selectedColors.length,
        selectedColors: roomDataToSend.selectedColors,
        slotsCount: this.colorSlots.length,
        fullData: roomDataToSend
      });
      
      this.createRoomEvent.emit(roomDataToSend);
      this.closeModal();
    } else {
      console.warn('⚠️ [OnSubmit] Formulario inválido:', {
        gameNameValid: this.roomData.gameName.trim().length > 0,
        colorCountValid: this.roomData.colorCount >= 2,
        slotsValid: this.colorSlots.length === this.roomData.colorCount
      });
    }
  }


  /**
   * Resetea el formulario a sus valores iniciales
   */
  private resetForm(): void {
    this.roomData = {
      gameName: '',
      colorCount: 4,
      selectedColors: [],
      customColors: []
    };
    this.colorSlots = [];
    this.generateColorSlots();
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
      6: 'Experto'
    };
    
    if (this.roomData.colorCount <= 6) {
      return difficultyLabels[this.roomData.colorCount] || 'Personalizado';
    } else if (this.roomData.colorCount <= 10) {
      return 'Extremo';
    } else {
      return 'Imposible';
    }
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
      6: 'Nivel experto. Gran desafío para jugadores experimentados.'
    };
    
    if (this.roomData.colorCount <= 6) {
      return descriptions[this.roomData.colorCount] || 
             `Desafío personalizado con ${this.roomData.colorCount} colores.`;
    } else {
      return `Desafío extremo con ${this.roomData.colorCount} colores. ¡Solo para maestros!`;
    }
  }


  /**
   * TrackBy functions para optimizar el rendimiento del *ngFor
   */
  trackByColorName(index: number, colorName: string): string {
    return colorName;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  trackByColor(index: number, color: Color): string {
    return color.name;
  }

  /**
   * Abre el modal
   */
  openModal(): void {
    this.isVisible = true;
    this.loadAvailableColors();
  }

  /**
   * Actualiza selectedColors basado en los slots de colores
   * CRÍTICO: Asegura que siempre se envíen colores hexadecimales
   */
  private updateSelectedColorsFromSlots(): void {
    this.roomData.selectedColors = this.colorSlots.map(slot => {
      // Asegurar que siempre sea hexadecimal
      const hexColor = slot.hexColor.toUpperCase();
      console.log(`🎨 [UpdateSlots] Slot ${slot.name}: ${hexColor}`);
      return hexColor;
    });
    
    console.log('🔄 [UpdateSlots] Colors actualizados:', this.roomData.selectedColors);
  }

  /**
   * Genera un color hexadecimal aleatorio
   */
  private generateRandomHexColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * Maneja el clic en un slot para cambiar su color
   */
  onSlotClick(slotIndex: number): void {
    // Crear un input de tipo color temporal para abrir el picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.colorSlots[slotIndex].hexColor;
    
    colorInput.addEventListener('change', (event) => {
      const newColor = (event.target as HTMLInputElement).value;
      
      // Verificar que el nuevo color no esté duplicado
      if (!this.isColorDuplicated(newColor, slotIndex)) {
        this.colorSlots[slotIndex].hexColor = newColor;
        this.updateSelectedColorsFromSlots();
        
        console.log(`🎨 Color del slot ${slotIndex + 1} cambiado a:`, newColor);
      } else {
        alert('Este color ya está siendo usado. Por favor elige un color diferente.');
      }
    });
    
    // Simular clic en el input para abrir el picker
    colorInput.click();
  }

  /**
   * Verifica si un color ya está siendo usado en otro slot
   */
  private isColorDuplicated(hexColor: string, currentSlotIndex: number): boolean {
    return this.colorSlots.some((slot, index) => 
      index !== currentSlotIndex && slot.hexColor.toLowerCase() === hexColor.toLowerCase()
    );
  }

  /**
   * Actualiza la cantidad de colores y regenera los slots
   */
  onColorCountChange(): void {
    if (this.roomData.colorCount < 2) {
      this.roomData.colorCount = 2;
    }
    
    this.generateColorSlots();
  }

  /**
   * Prepara los colores seleccionados para envío al backend
   * CRÍTICO: Garantiza formato hexadecimal correcto
   */
  private prepareSelectedColors(): string[] {
    const colors = this.colorSlots.map(slot => {
      const hexColor = slot.hexColor.toUpperCase();
      console.log(`🎯 [PrepareColors] Processing slot: ${slot.name} -> ${hexColor}`);
      return hexColor;
    });
    
    console.log('🎨 [PrepareColors] Colors finales para backend:', {
      totalColors: colors.length,
      colors: colors,
      roomDataColorCount: this.roomData.colorCount
    });
    
    return colors;
  }

  /**
   * Valida si el formulario es válido
   */
  private isFormValid(): boolean {
    return this.roomData.gameName.trim().length > 0 && 
           this.roomData.colorCount >= 2 &&
           this.colorSlots.length === this.roomData.colorCount;
  }

}
