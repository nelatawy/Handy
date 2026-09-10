import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { PaymentService } from '../../../core/services/payment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Transaction } from '../../../core/models/models';
import { PaymentType } from '../../../core/models/enums';

@Component({
  selector: 'app-earnings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule],
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.scss',
})
export class EarningsComponent implements OnInit {
  private paymentSvc = inject(PaymentService);
  private notify     = inject(NotificationService);

  readonly PaymentType = PaymentType;

  readonly loading      = signal(true);
  readonly error        = signal(false);
  readonly balance      = signal(0);
  readonly transactions = signal<Transaction[]>([]);
  readonly withdrawing  = signal(false);

  readonly isEmpty = computed(() =>
    !this.loading() && !this.error() && this.transactions().length === 0
  );

  /** Total lifetime earnings (confirmed transactions only) */
  readonly totalEarned = computed(() =>
    this.transactions()
      .filter(t => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  ngOnInit(): void {
    this.paymentSvc.getEarnings().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (res) => {
        this.balance.set(res.balance);
        this.transactions.set(res.transactions);
      },
      error: () => {
        this.error.set(true);
        this.notify.error('Failed to load earnings data.');
      },
    });
  }

  /**
   * Initiate a payout via the backend.
   * The backend calls Paymob's disbursement API (secret key stays server-side)
   * and returns a redirect URL or confirmation.
   * In sandbox mode the backend may return a mock message.
   */
  withdraw(): void {
    if (this.withdrawing() || this.balance() <= 0) return;
    this.withdrawing.set(true);

    this.paymentSvc.withdraw().pipe(
      finalize(() => this.withdrawing.set(false)),
    ).subscribe({
      next: (res) => {
        if (res.redirectUrl) {
          // Production: redirect to Paymob payout flow
          window.location.href = res.redirectUrl;
        } else {
          // Sandbox: show confirmation toast
          this.notify.success(res.message || 'Payout initiated! (sandbox mode)');
          // Reset balance optimistically after a successful payout initiation
          this.balance.set(0);
        }
      },
      error: () => this.notify.error('Failed to initiate withdrawal. Please try again.'),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
}
