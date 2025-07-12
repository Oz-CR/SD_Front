import { Component } from '@angular/core';
import { Primarybutton } from '../../components/primarybutton/primarybutton';
import { Secondarybutton } from '../../components/secondarybutton/secondarybutton';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [Secondarybutton],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
