import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WebSocketService } from './core/services/websocket.service';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
  `],
})
export class App implements OnInit {
  constructor(
    private wsService: WebSocketService,
    private auth: AuthService,
    private notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    // Connect WebSocket if already authenticated (e.g. page refresh)
    if (this.auth.isAuthenticated()) {
      this.wsService.connect();
    }
  }
}
