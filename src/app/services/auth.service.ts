import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserRegisterData {
  fullName: string;
  email: string;
  password: string;
}

export interface UserLoginResponse {
  message: string;
  data: {
    user: {
      id: string;
      username: string;
      email: string;
    };
    token: {
      type: string;
      value: string;
      expiresAt: string;
    };
  };
}

export interface UserRegisterResponse {
  message: string;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
    };
    token: {
      type: string;
      value: string;
      expiresAt: string;
    };
  };
}

export interface UserLoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://54edbb588162.ngrok-free.app/api/auth';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  register(userData: UserRegisterData): Observable<UserRegisterResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserRegisterResponse>(
      `${this.apiUrl}/register`,
      userData,
      { headers }
    );
  }

  login(userData: UserLoginData): Observable<UserLoginResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserLoginResponse>(`${this.apiUrl}/login`, userData, {
      headers,
    });
  }

  /**
   * Guarda el token y la información del usuario en localStorage
   */
  saveUserSession(response: UserLoginResponse | UserRegisterResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', response.data.token.value);
      localStorage.setItem('current_user', JSON.stringify(response.data.user));
    }
  }

  /**
   * Elimina la sesión del usuario
   */
  clearUserSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('current_user');
    }
  }

  /**
   * Obtiene el token del localStorage
   */
  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && this.isTokenValid(token);
  }

  /**
   * Verifica si el token tiene una estructura válida
   */
  isTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      // Si el token es un access token de AdonisJS (formato: oat_N.token)
      if (token.startsWith('oat_')) {
        // Para access tokens, verificar formato básico
        const parts = token.split('.');
        if (parts.length !== 2) return false;

        // Verificar que las partes no estén vacías
        if (!parts[0] || !parts[1]) return false;

        return true;
      }

      // Si es un JWT, verificar estructura JWT
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Intentar decodificar el payload
      const payload = JSON.parse(atob(parts[1]));

      // Verificar que el token no haya expirado
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.log('🚫 Token expirado');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error al validar token:', error);
      return false;
    }
  }

  /**
   * Obtiene la información del usuario desde localStorage
   */
  getUserInfo(): any {
    if (typeof localStorage !== 'undefined') {
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
