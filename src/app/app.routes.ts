import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { RoomsPage } from './pages/rooms-page/rooms-page';
import { GamePage } from './pages/game-page/game-page';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'rooms',
    component: RoomsPage,
  },
  {
    path: 'game',
    component: GamePage,
  },
];
