import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Secondarybutton } from '../secondarybutton/secondarybutton';

@Component({
  selector: 'app-form',
  imports: [Secondarybutton, FormsModule, CommonModule],
  templateUrl: './form.html',
  styleUrl: './form.css',
  standalone: true
})

export class Form implements OnChanges {
  @Input() fields: {
    name: string, type: string, placeholder: string, label: string
  }[] = []
  @Input() buttonText: string = 'Enviar'
  @Input() fieldErrors: { [key: string]: string } = {}
  @Input() clearErrorsOnInput: boolean = true
  @Input() initialData: any = {}
  @Output() submitForm = new EventEmitter<any>()
  @Output() fieldChange = new EventEmitter<string>()

  formData: any = {}

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fieldErrors']) {
      console.log('🔄 Form errors updated:', Object.keys(this.fieldErrors || {}));
      console.log('🔄 Errors content:', this.fieldErrors);
      
      // Forzar actualización inmediata
      this.cdr.detectChanges();
      
      // También forzar después de un pequeño delay para asegurar que se actualice
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);
    }
    
    if (changes['initialData'] && this.initialData) {
      console.log('🔄 Loading initial data:', this.initialData);
      this.formData = { ...this.initialData };
      this.cdr.detectChanges();
    }
    
    // Inicializar formData si no existe
    if (changes['fields'] && this.fields && !Object.keys(this.formData).length) {
      this.formData = {};
      this.fields.forEach(field => {
        this.formData[field.name] = '';
      });
    }
  }

  onSubmit() {
    this.submitForm.emit(this.formData)
  }

  hasError(fieldName: string): boolean {
    const hasError = !!(this.fieldErrors && this.fieldErrors[fieldName]);
    if (hasError) {
      console.log(`🔍 Campo ${fieldName} tiene error:`, this.fieldErrors[fieldName]);
    }
    return hasError;
  }

  onFieldInput(fieldName: string) {
    if (this.clearErrorsOnInput) {
      this.fieldChange.emit(fieldName);
    }
  }

  resetForm() {
    console.log('🔄 Resetting form data');
    this.formData = {};
    this.fields.forEach(field => {
      this.formData[field.name] = '';
    });
    this.cdr.detectChanges();
  }
}
