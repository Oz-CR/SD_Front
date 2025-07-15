import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenMonitorService } from './services/token-monitor.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'SD_Front';

  constructor(
    private tokenMonitorService: TokenMonitorService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Iniciar monitoreo si el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.tokenMonitorService.startMonitoring();
    }
  }

  ngOnDestroy(): void {
    // Detener monitoreo al destruir el componente
    this.tokenMonitorService.stopMonitoring();
  }
}
