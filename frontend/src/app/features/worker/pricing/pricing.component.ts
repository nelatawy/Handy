import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { JobRequest } from '../../../core/models/models';
import { RequestService } from '../../../core/services/request.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { JobStatus } from '../../../core/models/enums';

type PricingState = 'form' | 'waiting' | 'chosen' | 'rejected';

@Component({
  selector: 'app-pricing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private requestSvc = inject(RequestService);
  private ws         = inject(WebSocketService);
  private notify     = inject(NotificationService);

  readonly request    = signal<JobRequest | null>(null);
  readonly loading    = signal(true);
  readonly state      = signal<PricingState>('form');
  readonly submitting = signal(false);

  readonly priceInput = signal<number | null>(null);
  readonly userPrice  = computed(() => {
    const p = this.priceInput();
    return p && p > 0 ? Math.round(p * 1.05 * 100) / 100 : null;
  });

  // After offer submitted, store the offerId for tracking
  private offerId: string | null = null;
  private requestId!: string;
  private subs = new Subscription();

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id')!;
    this.loadRequest();
    this.ws.connect();

    // Chosen → navigate to the active job
    this.subs.add(
      this.ws.on<{ jobId: string }>('offer_chosen').subscribe((e) => {
        this.state.set('chosen');
        this.notify.success("Congratulations! You've been selected!");
        setTimeout(() => this.router.navigate(['/worker/job', e.jobId]), 1800);
      })
    );

    // Rejected (another handyman was chosen)
    this.subs.add(
      this.ws.on<{ requestId: string }>('offer_rejected').subscribe((e) => {
        if (e.requestId === this.requestId) {
          this.state.set('rejected');
          this.notify.warning('The customer chose another handyman for this request.');
        }
      })
    );

    // Request closed generally
    this.subs.add(
      this.ws.on<{ requestId: string }>('request_closed').subscribe((e) => {
        if (e.requestId === this.requestId && this.state() === 'waiting') {
          this.state.set('rejected');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadRequest(): void {
    this.requestSvc.getRequest(this.requestId).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next:  (r) => this.request.set(r),
      error: () => {
        this.notify.error('Failed to load request.');
        this.router.navigate(['/worker/feed']);
      },
    });
  }

  onPriceChange(val: string): void {
    const n = parseFloat(val);
    this.priceInput.set(isNaN(n) ? null : n);
  }

  submitOffer(): void {
    const price = this.priceInput();
    if (!price || price <= 0 || this.submitting()) return;

    this.submitting.set(true);
    this.requestSvc.submitOffer(this.requestId, price).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: (res) => {
        this.offerId = res.offerId;
        this.state.set('waiting');
        this.notify.info('Offer submitted! Waiting for customer response...');
      },
      error: () => this.notify.error('Failed to submit offer. Please try again.'),
    });
  }

  goBack(): void {
    this.router.navigate(['/worker/request', this.requestId]);
  }

  goFeed(): void {
    this.router.navigate(['/worker/feed']);
  }
}
