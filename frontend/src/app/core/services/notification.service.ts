import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; fn: () => void };
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', duration = 4000, action?: Toast['action']): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration, action };
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, action?: Toast['action']): void {
    this.show(message, 'success', 4000, action);
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string, action?: Toast['action']): void {
    this.show(message, 'info', 4000, action);
  }

  warning(message: string): void {
    this.show(message, 'warning', 5000);
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
