import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { RoomsPage } from './pages/rooms-page/rooms-page';
import { GamePage } from './pages/game-page/game-page';
import { authGuard, guestGuard } from './guards/auth.guard-guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard]
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard]
  },
  {
    path: 'rooms',
    component: RoomsPage,
    canActivate: [authGuard]
  },
  {
    path: 'juego/:id',
    component: GamePage,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
