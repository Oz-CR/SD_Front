import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        console.log('🚫 Respuesta 401 - Token inválido o expirado');
        
        // Limpiar sesión y redirigir al login
        authService.clearUserSession();
        router.navigate(['/login']);
        
        // Opcional: mostrar mensaje al usuario
        console.log('Sesión expirada, redirigiendo al login...');
      }
      
      return throwError(() => error);
    })
  );
};
