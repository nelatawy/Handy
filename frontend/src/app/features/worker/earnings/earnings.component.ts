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
import { EarningsEntry } from '../../../core/models/models';
import { PaymentType } from '../../../core/models/enums';
import { LucideAlertTriangle, LucideArrowUpRight, LucideInbox, LucideCoins } from '@lucide/angular';

@Component({
  selector: 'app-earnings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, LucideAlertTriangle, LucideArrowUpRight, LucideInbox, LucideCoins],
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
  readonly transactions = signal<EarningsEntry[]>([]);
  readonly withdrawing  = signal(false);

  readonly isEmpty = computed(() =>
    !this.loading() && !this.error() && this.transactions().length === 0
  );

  /** Total lifetime earnings — every entry here is already a finished, paid online job */
  readonly totalEarned = computed(() =>
    this.transactions().reduce((sum, t) => sum + t.amount, 0)
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
        this.notify.error('TOAST.EARNINGS_LOAD_FAILED');
      },
    });
  }

  /**
   * Initiate a payout of the worker's entire current balance via the backend
   * (POST /api/jobs/:id/payout — the job ID only verifies the caller owns that job,
   * the payout itself isn't scoped to a single job; any of the worker's own job IDs
   * works, so the most recent earnings entry is used as the anchor).
   */
  withdraw(): void {
    if (this.withdrawing() || this.balance() <= 0) return;
    const anchorJobId = this.transactions()[0]?.jobId;
    if (!anchorJobId) return;

    this.withdrawing.set(true);
    this.paymentSvc.requestPayout(anchorJobId).pipe(
      finalize(() => this.withdrawing.set(false)),
    ).subscribe({
      next: () => {
        this.notify.success('TOAST.PAYOUT_INITIATED_SANDBOX');
        // Reset balance optimistically after a successful payout initiation
        this.balance.set(0);
      },
      error: () => this.notify.error('TOAST.WITHDRAW_FAILED'),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
}
