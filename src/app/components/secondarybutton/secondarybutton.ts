import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-secondarybutton',
  imports: [],
  templateUrl: './secondarybutton.html',
  styleUrl: './secondarybutton.css'
})
export class Secondarybutton {
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
