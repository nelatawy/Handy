import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; fn: () => void };
  duration: number;
}

/**
 * Centralized toast/notification service.
 *
 * IMPORTANT: all `success`/`error`/`info`/`warning` calls take a **translation key**
 * (e.g. `'TOAST.JOB_STARTED'`), never a raw hardcoded string — the service resolves
 * the key via `TranslateService` so every toast localizes correctly to the active
 * language. Pass `params` for ICU-style interpolation (e.g. `{{ name }}` placeholders).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private translate = inject(TranslateService);

  readonly toasts = signal<Toast[]>([]);

  show(key: string, type: ToastType = 'info', duration = 4000, params?: Record<string, unknown>, action?: Toast['action']): void {
    this._push(this.translate.instant(key, params), type, duration, action);
  }

  /**
   * Displays a toast with a message that is already resolved (e.g. a message
   * returned directly from the backend) instead of a translation key. Use this
   * sparingly — prefer translation keys wherever the message text is known ahead
   * of time so it localizes correctly.
   */
  showRaw(message: string, type: ToastType = 'info', duration = 4000, action?: Toast['action']): void {
    this._push(message, type, duration, action);
  }

  private _push(message: string, type: ToastType, duration: number, action?: Toast['action']): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration, action };
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(key: string, params?: Record<string, unknown>, action?: Toast['action']): void {
    this.show(key, 'success', 4000, params, action);
  }

  error(key: string, params?: Record<string, unknown>): void {
    this.show(key, 'error', 6000, params);
  }

  info(key: string, params?: Record<string, unknown>, action?: Toast['action']): void {
    this.show(key, 'info', 4000, params, action);
  }

  warning(key: string, params?: Record<string, unknown>): void {
    this.show(key, 'warning', 5000, params);
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
