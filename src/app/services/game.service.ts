import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface GameState {
  id?: string;
  roomId: string;
  winnerId?: number;
  sequence: string[];
  currentRound: number;
  currentPlayerTurn: number;
  showingSequence: boolean;
  status: string;
  player1Score: number;
  player2Score: number;
  player1Finished: boolean;
  player2Finished: boolean;
  playerLeft?: boolean;
  player1Id?: number;
  player2Id?: number;
  room?: {
    id: number;
    name: string;
    colorCount: number;
    selectedColors: string[];
    player1Id: number;
    player2Id: number | null;
    status: string;
  };
}

export interface GameMove {
  color: string;
  position: number;
}

export interface Color {
  name: string;
  displayName: string;
  hexColor: string;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private apiUrl = 'https://ninety-pants-boil.loca.lt/api';
  private gameStateSubject = new BehaviorSubject<GameState | null>(null);
  public gameState$ = this.gameStateSubject.asObservable();

  private sequenceSubject = new BehaviorSubject<string[]>([]);
  public sequence$ = this.sequenceSubject.asObservable();

  private showingSequenceSubject = new BehaviorSubject<boolean>(false);
  public showingSequence$ = this.showingSequenceSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });
  }

  /**
   * Obtiene el estado actual del juego
   */
  getGameState(roomId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/game/${roomId}/state`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Actualiza el estado del juego
   */
  updateGameState(
    roomId: string,
    gameState: Partial<GameState>
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/${roomId}/update`, gameState, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Realiza un movimiento en el juego
   */
  makeMove(roomId: string, move: GameMove): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/${roomId}/move`, move, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtiene los colores disponibles para una sala
   */
  getAvailableColors(count?: number): Observable<any> {
    const params = count ? `?count=${count}` : '';
    return this.http.get(`${this.apiUrl}/colors/valid${params}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Genera colores específicos para una sala
   */
  generateColorsForRoom(colorCount: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/colors/generate`,
      { colorCount },
      {
        headers: this.getHeaders(),
      }
    );
  }

  /**
   * Actualiza el estado local del juego
   */
  setGameState(gameState: GameState): void {
    this.gameStateSubject.next(gameState);
  }

  /**
   * Actualiza la secuencia actual
   */
  setSequence(sequence: string[]): void {
    this.sequenceSubject.next(sequence);
  }

  /**
   * Actualiza el estado de mostrar secuencia
   */
  setShowingSequence(showing: boolean): void {
    this.showingSequenceSubject.next(showing);
  }

  /**
   * Convierte nombres de colores en objetos Color con información visual
   * MEJORADO: Sin límites y mejor procesamiento de colores hexadecimales
   */
  getColorObjects(colorNames: string[]): Color[] {
    const colorMap: { [key: string]: Color } = {
      // Colores básicos
      red: { name: 'red', displayName: 'Rojo', hexColor: '#FF4444' },
      blue: { name: 'blue', displayName: 'Azul', hexColor: '#4444FF' },
      green: { name: 'green', displayName: 'Verde', hexColor: '#44FF44' },
      yellow: { name: 'yellow', displayName: 'Amarillo', hexColor: '#FFFF44' },
      orange: { name: 'orange', displayName: 'Naranja', hexColor: '#FF8800' },
      purple: { name: 'purple', displayName: 'Morado', hexColor: '#FF44FF' },
      pink: { name: 'pink', displayName: 'Rosa', hexColor: '#FF88BB' },
      cyan: { name: 'cyan', displayName: 'Cian', hexColor: '#44FFFF' },
      lime: { name: 'lime', displayName: 'Lima', hexColor: '#88FF44' },
      indigo: { name: 'indigo', displayName: 'Índigo', hexColor: '#4444AA' },

      // Colores extendidos - AMPLIADOS SIN LÍMITE
      crimson: { name: 'crimson', displayName: 'Carmesí', hexColor: '#DC143C' },
      navy: { name: 'navy', displayName: 'Azul Marino', hexColor: '#000080' },
      teal: { name: 'teal', displayName: 'Azul Verdoso', hexColor: '#008080' },
      gold: { name: 'gold', displayName: 'Dorado', hexColor: '#FFD700' },
      coral: { name: 'coral', displayName: 'Coral', hexColor: '#FF7F50' },
      violet: { name: 'violet', displayName: 'Violeta', hexColor: '#8A2BE2' },
      salmon: { name: 'salmon', displayName: 'Salmón', hexColor: '#FA8072' },
      turquoise: {
        name: 'turquoise',
        displayName: 'Turquesa',
        hexColor: '#40E0D0',
      },
      khaki: { name: 'khaki', displayName: 'Caqui', hexColor: '#F0E68C' },
      plum: { name: 'plum', displayName: 'Ciruela', hexColor: '#DDA0DD' },
      maroon: { name: 'maroon', displayName: 'Granate', hexColor: '#800000' },
      olive: { name: 'olive', displayName: 'Oliva', hexColor: '#808000' },
      silver: { name: 'silver', displayName: 'Plateado', hexColor: '#C0C0C0' },
      chocolate: {
        name: 'chocolate',
        displayName: 'Chocolate',
        hexColor: '#D2691E',
      },
      tomato: { name: 'tomato', displayName: 'Tomate', hexColor: '#FF6347' },
      orchid: { name: 'orchid', displayName: 'Orquídea', hexColor: '#DA70D6' },
      lightblue: {
        name: 'lightblue',
        displayName: 'Azul Claro',
        hexColor: '#ADD8E6',
      },
      darkgreen: {
        name: 'darkgreen',
        displayName: 'Verde Oscuro',
        hexColor: '#006400',
      },
      'orange-red': {
        name: 'orange-red',
        displayName: 'Naranja Rojizo',
        hexColor: '#FF4500',
      },
      'medium-purple': {
        name: 'medium-purple',
        displayName: 'Morado Medio',
        hexColor: '#9370DB',
      },
    };

    console.log('🎨 [GameService] Procesando colores:', {
      input: colorNames,
      totalCount: colorNames.length,
    });

    return colorNames.map((colorName, index) => {
      // Si el color está en el mapa predefinido
      if (colorMap[colorName]) {
        console.log(
          `✅ [GameService] Color predefinido encontrado: ${colorName}`
        );
        return colorMap[colorName];
      }

      // Si es un color hexadecimal (empieza con #) - LÓGICA MEJORADA
      else if (this.isValidHexColor(colorName)) {
        const colorObj = {
          name: colorName,
          displayName: this.getColorDisplayName(colorName, index + 1),
          hexColor: colorName.toUpperCase(),
        };
        console.log(
          `🎨 [GameService] Color hexadecimal personalizado: ${colorName} -> ${colorObj.displayName}`
        );
        return colorObj;
      }

      // Si empieza con 'color' (colores dinámicos numerados)
      else if (colorName.startsWith('color')) {
        const colorNumber = colorName.replace('color', '');
        const colorObj = {
          name: colorName,
          displayName: `Color ${colorNumber}`,
          hexColor: this.generateRandomHexColor(),
        };
        console.log(
          `🎲 [GameService] Color dinámico generado: ${colorName} -> ${colorObj.hexColor}`
        );
        return colorObj;
      }

      // Color desconocido - generar uno aleatorio pero con nombre descriptivo
      else {
        const colorObj = {
          name: colorName,
          displayName: this.getColorDisplayName(colorName, index + 1),
          hexColor: this.isValidHexColor(colorName)
            ? colorName
            : this.generateRandomHexColor(),
        };
        console.log(
          `❓ [GameService] Color desconocido procesado: ${colorName} -> ${colorObj.displayName}`
        );
        return colorObj;
      }
    });
  }

  /**
   * Genera un nombre descriptivo para un color
   */
  private getColorDisplayName(
    colorName: string,
    fallbackIndex: number
  ): string {
    // Si es un color hexadecimal, generar un nombre descriptivo
    if (this.isValidHexColor(colorName)) {
      return (
        this.generateColorNameFromHex(colorName) || `Color ${fallbackIndex}`
      );
    }

    // Si es un nombre, capitalizarlo
    if (typeof colorName === 'string' && colorName.length > 0) {
      return (
        colorName.charAt(0).toUpperCase() +
        colorName.slice(1).replace(/[-_]/g, ' ')
      );
    }

    return `Color ${fallbackIndex}`;
  }

  /**
   * Genera un nombre descriptivo basado en un color hexadecimal
   */
  private generateColorNameFromHex(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Determinar el color dominante
    if (r > g && r > b) {
      if (r > 200) return 'Rojo Claro';
      if (r > 150) return 'Rojo';
      return 'Rojo Oscuro';
    } else if (g > r && g > b) {
      if (g > 200) return 'Verde Claro';
      if (g > 150) return 'Verde';
      return 'Verde Oscuro';
    } else if (b > r && b > g) {
      if (b > 200) return 'Azul Claro';
      if (b > 150) return 'Azul';
      return 'Azul Oscuro';
    } else if (r === g && g === b) {
      if (r > 200) return 'Gris Claro';
      if (r > 100) return 'Gris';
      return 'Gris Oscuro';
    } else if (r === g) {
      return 'Amarillo';
    } else if (r === b) {
      return 'Magenta';
    } else if (g === b) {
      return 'Cian';
    }

    return 'Personalizado';
  }

  /**
   * Valida si una cadena es un color hexadecimal válido
   */
  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
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
   * Limpia el estado del juego
   */
  clearGameState(): void {
    this.gameStateSubject.next(null);
    this.sequenceSubject.next([]);
    this.showingSequenceSubject.next(false);
  }
}
