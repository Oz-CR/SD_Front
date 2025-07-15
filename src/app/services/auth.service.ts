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
  private apiUrl = 'http://localhost:3333/api/auth';

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
      localStorage.setItem('auth_token', response.data.token.value);
      localStorage.setItem('user_info', JSON.stringify(response.data.user));
    }
  }

  /**
   * Elimina la sesión del usuario
   */
  clearUserSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  }

  /**
   * Obtiene el token del localStorage
   */
  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
