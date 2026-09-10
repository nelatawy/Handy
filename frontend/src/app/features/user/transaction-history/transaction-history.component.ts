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
  selector: 'app-transaction-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule],
  templateUrl: './transaction-history.component.html',
  styleUrl: './transaction-history.component.scss',
})
export class TransactionHistoryComponent implements OnInit {
  private paymentSvc = inject(PaymentService);
  private notify     = inject(NotificationService);

  readonly PaymentType = PaymentType;

  readonly loading      = signal(true);
  readonly error        = signal(false);
  readonly transactions = signal<Transaction[]>([]);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.transactions().length === 0);

  /** Sum of all confirmed transaction amounts */
  readonly totalSpent = computed(() =>
    this.transactions()
      .filter(t => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  ngOnInit(): void {
    this.paymentSvc.getTransactionHistory().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next:  (list) => this.transactions.set(list),
      error: () => {
        this.error.set(true);
        this.notify.error('Failed to load transaction history.');
      },
    });
  }

  /** Format an ISO date string to a readable local date */
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
}
