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
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:3333/api';
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
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtiene el estado actual del juego
   */
  getGameState(roomId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/game/${roomId}/state`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualiza el estado del juego
   */
  updateGameState(roomId: string, gameState: Partial<GameState>): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/${roomId}/update`, gameState, {
      headers: this.getHeaders()
    });
  }

  /**
   * Realiza un movimiento en el juego
   */
  makeMove(roomId: string, move: GameMove): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/${roomId}/move`, move, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtiene los colores disponibles para una sala
   */
  getAvailableColors(count?: number): Observable<any> {
    const params = count ? `?count=${count}` : '';
    return this.http.get(`${this.apiUrl}/colors/valid${params}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Genera colores específicos para una sala
   */
  generateColorsForRoom(colorCount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/colors/generate`, { colorCount }, {
      headers: this.getHeaders()
    });
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
   */
  getColorObjects(colorNames: string[]): Color[] {
    const colorMap: { [key: string]: Color } = {
      'red': { name: 'red', displayName: 'Rojo', hexColor: '#FF4444' },
      'blue': { name: 'blue', displayName: 'Azul', hexColor: '#4444FF' },
      'green': { name: 'green', displayName: 'Verde', hexColor: '#44FF44' },
      'yellow': { name: 'yellow', displayName: 'Amarillo', hexColor: '#FFFF44' },
      'orange': { name: 'orange', displayName: 'Naranja', hexColor: '#FF8800' },
      'purple': { name: 'purple', displayName: 'Morado', hexColor: '#FF44FF' },
      'pink': { name: 'pink', displayName: 'Rosa', hexColor: '#FF88BB' },
      'cyan': { name: 'cyan', displayName: 'Cian', hexColor: '#44FFFF' },
      'lime': { name: 'lime', displayName: 'Lima', hexColor: '#88FF44' },
      'indigo': { name: 'indigo', displayName: 'Índigo', hexColor: '#4444AA' }
    };

    return colorNames.map(colorName => {
      if (colorMap[colorName]) {
        return colorMap[colorName];
      } else if (colorName.startsWith('color')) {
        // Generar color dinámico
        const colorNumber = colorName.replace('color', '');
        return {
          name: colorName,
          displayName: `Color ${colorNumber}`,
          hexColor: this.generateRandomHexColor()
        };
      } else if (colorName.startsWith('#')) {
        // Color hexadecimal personalizado
        return {
          name: colorName,
          displayName: 'Personalizado',
          hexColor: colorName
        };
      } else {
        // Color desconocido, usar un color por defecto
        return {
          name: colorName,
          displayName: colorName,
          hexColor: '#808080'
        };
      }
    });
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
