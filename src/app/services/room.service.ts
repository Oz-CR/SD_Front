import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Room {
  id: string;
  name: string;
  host: string;
  colorCount: number;
  selectedColors?: string[];
  currentPlayers: number;
  maxPlayers: number;
  isActive: boolean;
  createdAt: string;
  player1Id: number;
  player2Id: number | null;
  status: 'waiting' | 'playing' | 'finished' | 'in_progress' | 'active';
}

export interface CreateRoomData {
  name: string;
  colorCount: number;
  selectedColors?: string[];
}

export interface RoomResponse {
  message: string;
  data: Room[];
}

export interface CreateRoomResponse {
  message: string;
  data: Room;
}

export interface JoinRoomResponse {
  message: string;
  data: Room;
}

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private apiUrl = 'http://localhost:3333';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Obtiene todas las partidas disponibles
   */
  getAvailableRooms(): Observable<RoomResponse> {
    const headers = this.getHeaders();
    return this.http.get<RoomResponse>(`${this.apiUrl}/api/partidas/disponibles`, {
      headers,
    });
  }

  /**
   * Crea una nueva partida
   */
  createRoom(roomData: CreateRoomData): Observable<CreateRoomResponse> {
    const headers = this.getHeaders();
    return this.http.post<CreateRoomResponse>(
      `${this.apiUrl}/api/createRoom`,
      roomData,
      { headers }
    );
  }

  /**
   * Unirse a una partida existente
   */
  joinGame(roomId: string): Observable<JoinRoomResponse> {
    const headers = this.getHeaders();
    return this.http.post<JoinRoomResponse>(
      `${this.apiUrl}/api/partidas/join/${roomId}`,
      {},
      { headers }
    );
  }

  /**
   * Obtiene los detalles de una sala específica
   */
  getRoomDetails(roomId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/api/rooms/${roomId}/details`, {
      headers,
    });
  }

  /**
   * Obtiene los headers con el token de autenticación
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /**
   * Obtiene el ID del usuario actual desde el token almacenado
   */
  getCurrentUserId(): number | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.sub || payload.id || null;
        } catch (error) {
          console.error('Error al decodificar el token:', error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Obtiene la información del usuario actual desde localStorage
   */
  getCurrentUserInfo(): any {
    if (isPlatformBrowser(this.platformId)) {
      const userInfo = localStorage.getItem('current_user');
      if (userInfo) {
        try {
          return JSON.parse(userInfo);
        } catch (error) {
          console.error('Error al parsear información del usuario:', error);
          return null;
        }
      }
    }
    return null;
  }
}
