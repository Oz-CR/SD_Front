import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserRegisterData {
  fullName: string
  email: string
  password: string
}

export interface UserLoginResponse {
  message: string
  data: {
    user: {
      id: string
      username: string
      email: string
    }
    token: {
      type: string
      value: string
      expiresAt: string
    }
  }
}

export interface UserRegisterResponse {
  message: string
  data: {
    user: {
      id: string
      fullName: string
      email: string
    }
    token: {
      type: string
      value: string
      expiresAt: string
    }
  }
}

export interface UserLoginData {
  email: string
  password: string
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3333/api/auth' 

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

  register(userData: UserRegisterData): Observable<UserRegisterResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserRegisterResponse>(`${this.apiUrl}/register`, userData, { headers });
  }

  login(userData: UserLoginData): Observable<UserLoginResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserLoginResponse>(`${this.apiUrl}/login`, userData, { headers });
  }
}
