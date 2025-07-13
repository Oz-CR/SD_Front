import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Room {
  id: string;
  name: string;
  host: string;
  colorCount: number;
  currentPlayers: number;
  maxPlayers: number;
  isActive: boolean;
  createdAt: string;
  player1Id: number;
  player2Id: number | null;
  status: 'waiting' | 'playing' | 'finished';
}

export interface CreateRoomData {
  name: string;
  colorCount: number;
}

export interface RoomResponse {
  message: string;
  data: Room[];
}

export interface CreateRoomResponse {
  message: string;
  data: Room;
}

@Injectable({
  providedIn: 'root'
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
    return this.http.get<RoomResponse>(`${this.apiUrl}/partidas/disponibilad`, { headers });
  }

  /**
   * Crea una nueva partida
   */
  createRoom(roomData: CreateRoomData): Observable<CreateRoomResponse> {
    const headers = this.getHeaders();
    return this.http.post<CreateRoomResponse>(`${this.apiUrl}/createRoom`, roomData, { headers });
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
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Decodificar el token JWT para obtener el ID del usuario
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
