import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-primarybutton',
  imports: [],
  templateUrl: './primarybutton.html',
  styleUrl: './primarybutton.css'
})
export class Primarybutton {
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
