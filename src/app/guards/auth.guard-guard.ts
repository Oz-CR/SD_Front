import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Verificar si hay token
  const token = authService.getToken();
  
  if (!token) {
    console.log('🚫 No hay token, redirigiendo a login');
    router.navigate(['/login']);
    return false;
  }
  
  // Verificar si el token es válido (estructura básica)
  if (!authService.isTokenValid(token)) {
    console.log('🚫 Token inválido, limpiando sesión y redirigiendo a login');
    authService.clearUserSession();
    router.navigate(['/login']);
    return false;
  }
  
  console.log('✅ Token válido, permitiendo acceso');
  return true;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const token = authService.getToken();
  
  if (token && authService.isTokenValid(token)) {
    console.log('✅ Usuario autenticado, redirigiendo a rooms');
    router.navigate(['/rooms']);
    return false;
  } else {
    if (token && !authService.isTokenValid(token)) {
      console.log('🚫 Token inválido encontrado, limpiando sesión');
      authService.clearUserSession();
    }
    console.log('✅ Usuario no autenticado, permitiendo acceso a página pública');
    return true;
  }
};
