import { Component } from '@angular/core';
import { Form } from '../../components/form/form';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [Form],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  registerFields = [
    { 
      name: 'fullName', 
      type: 'text', 
      placeholder: 'Ingresa tu nombre completo', 
      label: 'Nombre Completo' 
    },
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

  onRegisterSubmit(formData: any) {
    console.log('📝 Datos del formulario de registro:', formData);
    
    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('✅ Registro exitoso:', response);
        
        // Guardar token y información del usuario
        localStorage.setItem('token', response.data.token.value);
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
        
        console.log('💾 Datos guardados en localStorage:', {
          token: response.data.token.value,
          user: response.data.user
        });
        
        alert(response.message || 'Registro exitoso');
        // Ir directamente a rooms si ya tiene datos guardados
        this.router.navigate(['/rooms']);
      },
      error: (error) => {
        console.error('❌ Error en el registro:', error);
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
          alert('Error al registrar. Inténtalo de nuevo.');
        }
      }
    })
  }

  clearFieldError(fieldName: string) {
    if (this.formErrors[fieldName]) {
      delete this.formErrors[fieldName];
      this.formErrors = { ...this.formErrors };
    }
  }
}
