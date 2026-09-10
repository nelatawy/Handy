import { Injectable, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface WsMessage<T = unknown> {
  event: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private _messages$ = new Subject<WsMessage>();

  readonly connected = signal(false);

  constructor(private authService: AuthService) {}

  /** Connect to the Socket.IO server with the current JWT */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      auth: { token: this.authService.token() },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));

    // Forward all server events into the shared subject
    this.socket.onAny((event: string, data: unknown) => {
      this._messages$.next({ event, data });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  /** Listen for a specific event */
  on<T>(event: string): Observable<T> {
    return this._messages$.asObservable().pipe(
      filter(msg => msg.event === event),
      map(msg => msg.data as T)
    );
  }

  /** Emit an event to the server */
  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._messages$.complete();
  }
}
