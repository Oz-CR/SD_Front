import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenMonitorService {
  private monitorInterval: any;
  private isMonitoring = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Inicia el monitoreo del token cada 30 segundos
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔄 Iniciando monitoreo de token...');
    
    this.monitorInterval = setInterval(() => {
      this.checkTokenValidity();
    }, 30000); // Verificar cada 30 segundos
  }

  /**
   * Detiene el monitoreo del token
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('⏹️ Monitoreo de token detenido');
    }
  }

  /**
   * Verifica la validez del token actual
   */
  private checkTokenValidity(): void {
    const token = this.authService.getToken();
    
    if (!token) {
      console.log('🚫 No hay token, redirigiendo a login...');
      this.handleInvalidToken();
      return;
    }

    if (!this.authService.isTokenValid(token)) {
      console.log('🚫 Token inválido detectado, redirigiendo a login...');
      this.handleInvalidToken();
      return;
    }

    console.log('✅ Token válido - monitoreo continuo');
  }

  /**
   * Maneja el token inválido
   */
  private handleInvalidToken(): void {
    this.authService.clearUserSession();
    this.stopMonitoring();
    
    // Solo redirigir si no estamos ya en una página pública
    const currentUrl = this.router.url;
    if (currentUrl !== '/login' && currentUrl !== '/register' && currentUrl !== '/') {
      this.router.navigate(['/login']);
    }
  }
}
