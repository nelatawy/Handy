import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NotificationService, Toast } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('toastAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100%) scale(0.9)' }),
        animate('250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }))
      ]),
    ]),
  ],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (toast of notifService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" [@toastAnim] role="alert">
          <span class="toast__icon">{{ iconFor(toast.type) }}</span>
          <span class="toast__message">{{ toast.message }}</span>
          @if (toast.action) {
            <button class="toast__action" (click)="toast.action!.fn()">
              {{ toast.action.label }}
            </button>
          }
          <button class="toast__close" (click)="notifService.dismiss(toast.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected notifService = inject(NotificationService);

  iconFor(type: Toast['type']): string {
    const icons: Record<Toast['type'], string> = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
    };
    return icons[type];
  }
}
