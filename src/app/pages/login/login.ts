import { Component } from '@angular/core';
import { Form } from '../../components/form/form';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [Form],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginFields = [
    { 
      name: 'email', 
      type: 'email', 
      placeholder: 'ejemplo@email.com', 
      label: 'Email' 
    },
    { 
      name: 'password', 
      type: 'password', 
      placeholder: '••••••••', 
      label: 'Contraseña' 
    }
  ];

  formErrors: { [key: string]: string } = {};

  constructor(private authService: AuthService, private router: Router) {}

  onLoginSubmit(formData: any) {
    console.log('📝 Datos del formulario de inicio de sesión:', formData);

    this.authService.login(formData).subscribe({
      next: (response) => {
        console.log('✅ Inicio de sesión exitoso:', response);
        this.router.navigate(['/dashboard']);
        localStorage.setItem('token', response.data.token.value);
        alert(response.message || 'Inicio de sesión exitoso');
      },
      error: (error) => {
        console.error('❌ Error en el inicio de sesión:', error);
        console.log('🔍 Error completo:', error.error);
        
        // Limpiar errores previos
        this.formErrors = {};
        
        if (error.error) {
          // Manejar errores de validación del backend
          if (error.error.errors) {
            console.log('📋 Errores del backend:', error.error.errors);
            
            // Si es un array de errores
            if (Array.isArray(error.error.errors)) {
              error.error.errors.forEach((err: any) => {
                if (err.field && err.message) {
                  this.formErrors[err.field] = err.message;
                } else if (err.rule && err.message) {
                  // Algunos backends envían en formato { rule: 'required', field: 'email', message: 'Email is required' }
                  this.formErrors[err.field] = err.message;
                }
              });
            } 
            // Si es un objeto de errores
            else if (typeof error.error.errors === 'object') {
              this.formErrors = { ...error.error.errors };
            }
          } 
          
          // Si no hay errores específicos de campos, mostrar mensaje general
          if (Object.keys(this.formErrors).length === 0 && error.error.message) {
            console.log('⚠️ Mensaje del backend:', error.error.message);
            alert(error.error.message);
          }
          
          console.log('🔍 Errores mapeados:', this.formErrors);
        } else {
          alert('Error al iniciar sesión. Inténtalo de nuevo.');
        }
      }
    });
  }

  clearFieldError(fieldName: string) {
    if (this.formErrors[fieldName]) {
      delete this.formErrors[fieldName];
      this.formErrors = { ...this.formErrors };
    }
  }
}
