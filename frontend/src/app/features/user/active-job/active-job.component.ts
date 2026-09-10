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
      error: () => this.notify.error('Failed to load job details.'),
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

        if (e.status === JobStatus.Started)  this.notify.info('Job has been marked as started.');
        if (e.status === JobStatus.Finished) {
          this.notify.success('Job completed!');
          setTimeout(() => this.showRatingModal.set(true), 600);
        }
        if (e.status === JobStatus.Canceled) this.notify.warning('Job was canceled.');
      })
    );

    // Handyman canceled
    this.subs.add(
      this.ws.on<{ jobId: string }>('job_canceled_by_worker').subscribe((e) => {
        const j = this.job();
        if (!j || j.id !== e.jobId) return;
        this.job.set({ ...j, status: JobStatus.Canceled, canceledBy: 'worker' });
        this.notify.warning('The handyman canceled your job. No charge was made.');
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
        next: (updated) => {
          this.job.set(updated);
          // In production this would redirect to Paymob checkout
          this.notify.info('Redirecting to Paymob... (sandbox: skipped)');
          setTimeout(() => this.showRatingModal.set(true), 1000);
        },
        error: () => {
          this.paymentStep.set('choosingPayment');
          this.notify.error('Payment failed. Please try again.');
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
        next: (updated) => {
          this.job.set(updated);
          this.notify.success('Job marked as paid in cash!');
          setTimeout(() => this.showRatingModal.set(true), 600);
        },
        error: () => {
          this.paymentStep.set('choosingPayment');
          this.notify.error('Failed to update job. Please try again.');
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
    this.jobSvc.cancelJob(j.id).pipe(
      finalize(() => {
        this.cancelLoading.set(false);
        this.showCancelConfirm.set(false);
      }),
    ).subscribe({
      next: (updated) => {
        this.job.set({ ...updated, canceledBy: 'user' });
        this.notify.info('Job canceled. No charge was made.');
      },
      error: () => this.notify.error('Failed to cancel. Please try again.'),
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
        this.notify.success('Rating submitted! Thank you.');
      },
      error: () => this.notify.error('Failed to submit rating.'),
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
      next:  (updated) => this.job.set(updated),
      error: () => this.notify.error('Failed to update job status.'),
    });
  }
}
