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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

import { Job } from '../../../core/models/models';
import { JobStatus, PaymentType } from '../../../core/models/enums';
import { JobService } from '../../../core/services/job.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { JobStatusBadgeComponent } from '../../../shared/components/job-status-badge/job-status-badge.component';

type PaymentStep = 'idle' | 'choosingPayment' | 'confirming' | 'done';

@Component({
  selector: 'app-active-job',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, FormsModule, StarRatingComponent, JobStatusBadgeComponent],
  templateUrl: './active-job.component.html',
  styleUrl: './active-job.component.scss',
})
export class ActiveJobComponent implements OnInit, OnDestroy {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private jobSvc  = inject(JobService);
  private notify  = inject(NotificationService);
  private ws      = inject(WebSocketService);

  readonly JobStatus  = JobStatus;
  readonly PaymentType = PaymentType;

  readonly job     = signal<Job | null>(null);
  loading          = signal(true);
  actionLoading    = signal(false);

  // Payment modal
  paymentStep      = signal<PaymentStep>('idle');

  // Rating modal
  showRatingModal  = signal(false);
  ratingStars      = signal(0);
  ratingComment    = signal('');
  ratingSubmitting = signal(false);
  ratingSubmitted  = signal(false);

  // Cancel confirm
  showCancelConfirm = signal(false);
  cancelLoading     = signal(false);

  private subs = new Subscription();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadJob(id);
    this.subscribeToWebSocket();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadJob(id: string): void {
    this.jobSvc.getJob(id).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next:  (j) => {
        this.job.set(j);
        // Auto-show rating modal if finished and not yet rated
        if (j.status === JobStatus.Finished && !this.ratingSubmitted()) {
          setTimeout(() => this.showRatingModal.set(true), 600);
        }
      },
      error: () => this.notify.error('TOAST.JOB_LOAD_FAILED'),
    });
  }

  private subscribeToWebSocket(): void {
    this.ws.connect();

    // Real-time status changes
    this.subs.add(
      this.ws.on<{ jobId: string; status: JobStatus }>('job_status_changed').subscribe((e) => {
        const j = this.job();
        if (!j || j.id !== e.jobId) return;
        this.job.set({ ...j, status: e.status });

        if (e.status === JobStatus.Started)  this.notify.info('TOAST.JOB_STARTED');
        if (e.status === JobStatus.Finished) {
          this.notify.success('TOAST.JOB_FINISHED');
          setTimeout(() => this.showRatingModal.set(true), 600);
        }
        if (e.status === JobStatus.Canceled) this.notify.warning('TOAST.JOB_CANCELED_GENERIC');
      })
    );

    // Handyman canceled — delivered to the user's own room (event name reflects who
    // acted, not who receives it)
    this.subs.add(
      this.ws.on<{ jobId: string }>('job_canceled_by_worker').subscribe((e) => {
        const j = this.job();
        if (!j || j.id !== e.jobId) return;
        this.job.set({ ...j, status: JobStatus.Canceled, canceledBy: 'worker' });
        this.notify.warning('TOAST.JOB_CANCELED_BY_WORKER');
      })
    );
  }

  // ── Pending → Started ──────────────────────────────────────────────────────
  markStarted(): void {
    this._updateStatus({ status: JobStatus.Started });
  }

  // ── Started → Finished (via payment selection) ────────────────────────────
  openPaymentChoice(): void {
    this.paymentStep.set('choosingPayment');
  }

  closePaymentChoice(): void {
    this.paymentStep.set('idle');
  }

  confirmPayOnline(): void {
    const j = this.job();
    if (!j) return;
    this.paymentStep.set('confirming');
    this.jobSvc.updateStatus(j.id, { status: JobStatus.Finished, paymentType: PaymentType.Online })
      .pipe(finalize(() => this.paymentStep.set('done')))
      .subscribe({
        next: (res) => {
          this.job.set(res.job);
          // In production this would redirect to Paymob checkout
          this.notify.info('TOAST.PAYMOB_REDIRECT_SANDBOX');
          setTimeout(() => this.showRatingModal.set(true), 1000);
        },
        error: () => {
          this.paymentStep.set('choosingPayment');
          this.notify.error('TOAST.PAYMENT_FAILED');
        },
      });
  }

  confirmPayCash(): void {
    const j = this.job();
    if (!j) return;
    this.paymentStep.set('confirming');
    this.jobSvc.updateStatus(j.id, { status: JobStatus.Finished, paymentType: PaymentType.Cash })
      .pipe(finalize(() => this.paymentStep.set('done')))
      .subscribe({
        next: (res) => {
          this.job.set(res.job);
          this.notify.success('TOAST.PAID_CASH_CONFIRMED');
          setTimeout(() => this.showRatingModal.set(true), 600);
        },
        error: () => {
          this.paymentStep.set('choosingPayment');
          this.notify.error('TOAST.JOB_UPDATE_FAILED');
        },
      });
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  openCancelConfirm(): void {
    this.showCancelConfirm.set(true);
  }

  closeCancelConfirm(): void {
    this.showCancelConfirm.set(false);
  }

  confirmCancel(): void {
    const j = this.job();
    if (!j || this.cancelLoading()) return;
    this.cancelLoading.set(true);
    // User-side cancel goes through PATCH .../status (user-only on the backend) —
    // POST /api/jobs/:id/cancel is the *worker*-only cancel endpoint, a different route.
    this.jobSvc.updateStatus(j.id, { status: JobStatus.Canceled }).pipe(
      finalize(() => {
        this.cancelLoading.set(false);
        this.showCancelConfirm.set(false);
      }),
    ).subscribe({
      next: (res) => {
        this.job.set(res.job);
        this.notify.info('TOAST.JOB_CANCELED_NO_CHARGE');
      },
      error: () => this.notify.error('TOAST.JOB_CANCEL_FAILED'),
    });
  }

  // ── Rating ─────────────────────────────────────────────────────────────────
  onRatingChange(stars: number): void {
    this.ratingStars.set(stars);
  }

  submitRating(): void {
    const j = this.job();
    if (!j || this.ratingStars() === 0 || this.ratingSubmitting()) return;
    this.ratingSubmitting.set(true);
    this.jobSvc.rateJob(j.id, {
      stars:   this.ratingStars(),
      comment: this.ratingComment() || undefined,
    }).pipe(
      finalize(() => this.ratingSubmitting.set(false)),
    ).subscribe({
      next: () => {
        this.ratingSubmitted.set(true);
        this.showRatingModal.set(false);
        this.notify.success('TOAST.RATING_SUBMITTED');
      },
      error: () => this.notify.error('TOAST.RATING_SUBMIT_FAILED'),
    });
  }

  skipRating(): void {
    this.showRatingModal.set(false);
  }

  makeNewRequest(): void {
    this.router.navigate(['/user/request/new']);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private _updateStatus(body: Parameters<JobService['updateStatus']>[1]): void {
    const j = this.job();
    if (!j || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.jobSvc.updateStatus(j.id, body).pipe(
      finalize(() => this.actionLoading.set(false)),
    ).subscribe({
      next:  (res) => this.job.set(res.job),
      error: () => this.notify.error('TOAST.JOB_UPDATE_FAILED'),
    });
  }
}
