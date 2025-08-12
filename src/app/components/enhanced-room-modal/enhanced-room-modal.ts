import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';

interface Color {
  name: string;
  displayName: string;
  hexColor: string;
}

interface EnhancedRoomData {
  gameName: string;
  colorCount: number;
  selectedColors?: string[];
  useCustomColors: boolean;
}

@Component({
  selector: 'app-enhanced-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enhanced-room-modal.html',
  styleUrls: ['./enhanced-room-modal.css']
})
export class EnhancedRoomModalComponent implements OnInit {
  @Input() isVisible: boolean = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() createRoomEvent = new EventEmitter<EnhancedRoomData>();

  roomData: EnhancedRoomData = {
    gameName: '',
    colorCount: 4,
    useCustomColors: true, // Cambiar a true por defecto
    selectedColors: []
  };

  availableColors: Color[] = [];
  selectedColorNames: Set<string> = new Set(['red', 'blue', 'green', 'yellow']); // Colores por defecto

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.loadAvailableColors();
  }

  private loadAvailableColors(): void {
    // Cargar los colores base disponibles
    const baseColors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple',
      'pink', 'cyan', 'lime', 'indigo'
    ];
    this.availableColors = this.gameService.getColorObjects(baseColors);
  }

  closeModal(): void {
    this.isVisible = false;
    this.closeModalEvent.emit();
    this.resetForm();
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      const finalData: EnhancedRoomData = {
        ...this.roomData,
        selectedColors: Array.from(this.selectedColorNames),
        colorCount: this.selectedColorNames.size,
        useCustomColors: true
      };

      this.createRoomEvent.emit(finalData);
      this.closeModal();
    }
  }

  toggleColor(colorName: string): void {
    if (this.selectedColorNames.has(colorName)) {
      this.selectedColorNames.delete(colorName);
    } else {
      this.selectedColorNames.add(colorName);
    }
  }

  isColorSelected(colorName: string): boolean {
    return this.selectedColorNames.has(colorName);
  }

  getSelectedColors(): string[] {
    return Array.from(this.selectedColorNames);
  }

  isFormValid(): boolean {
    const nameValid = this.roomData.gameName.trim().length > 0;
    return nameValid && this.selectedColorNames.size >= 2;
  }

  getDifficultyLabel(): string {
    const colorCount = this.selectedColorNames.size;

    const difficultyLabels: { [key: number]: string } = {
      2: 'Fácil',
      3: 'Medio',
      4: 'Difícil',
      5: 'Muy Difícil',
      6: 'Experto'
    };
    
    if (colorCount <= 6) {
      return difficultyLabels[colorCount] || 'Personalizado';
    } else if (colorCount <= 10) {
      return 'Extremo';
    } else {
      return 'Imposible';
    }
  }

  getDifficultyDescription(): string {
    const colorCount = this.selectedColorNames.size;

    const descriptions: { [key: number]: string } = {
      2: 'Perfecto para principiantes. Secuencias simples y fáciles de recordar.',
      3: 'Nivel intermedio. Requiere más concentración y memoria.',
      4: 'Nivel avanzado. Desafío estándar de Simon Says.',
      5: 'Nivel muy avanzado. Requiere excelente memoria y concentración.',
      6: 'Nivel experto. Gran desafío para jugadores experimentados.'
    };
    
    if (colorCount <= 6) {
      return descriptions[colorCount] || 
             `Desafío personalizado con ${colorCount} colores.`;
    } else {
      return `Desafío extremo con ${colorCount} colores. ¡Solo para maestros!`;
    }
  }

  private resetForm(): void {
    this.roomData = {
      gameName: '',
      colorCount: 4,
      useCustomColors: true,
      selectedColors: []
    };
    this.selectedColorNames.clear();
    this.selectedColorNames.add('red');
    this.selectedColorNames.add('blue');
    this.selectedColorNames.add('green');
    this.selectedColorNames.add('yellow');
  }
}
