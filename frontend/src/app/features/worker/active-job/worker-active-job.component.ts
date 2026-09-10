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
import { Subscription, finalize } from 'rxjs';

import { Job } from '../../../core/models/models';
import { JobStatus, PaymentType } from '../../../core/models/enums';
import { JobService } from '../../../core/services/job.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { JobStatusBadgeComponent } from '../../../shared/components/job-status-badge/job-status-badge.component';

@Component({
  selector: 'app-worker-active-job',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, JobStatusBadgeComponent],
  templateUrl: './worker-active-job.component.html',
  styleUrl: './worker-active-job.component.scss',
})
export class WorkerActiveJobComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private jobSvc = inject(JobService);
  private ws     = inject(WebSocketService);
  private notify = inject(NotificationService);

  readonly JobStatus   = JobStatus;
  readonly PaymentType = PaymentType;

  readonly job            = signal<Job | null>(null);
  readonly loading        = signal(true);
  readonly actionLoading  = signal(false);

  // Cancel confirm modal
  readonly showCancelConfirm = signal(false);
  readonly cancelLoading     = signal(false);

  private subs = new Subscription();

  // Computed helpers
  readonly canCancel = computed(() => {
    const s = this.job()?.status;
    return s === JobStatus.Pending || s === JobStatus.Started;
  });

  readonly earnings = computed(() => this.job()?.price ?? 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadJob(id);
    this.ws.connect();
    this.subscribeWs();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadJob(id: string): void {
    this.jobSvc.getJob(id).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next:  (j) => this.job.set(j),
      error: ()  => {
        this.notify.error('TOAST.JOB_LOAD_FAILED');
        this.router.navigate(['/worker/home']);
      },
    });
  }

  private subscribeWs(): void {
    // User drove a status change (Pending → Started, Started → Finished)
    this.subs.add(
      this.ws.on<{ jobId: string; status: JobStatus }>('job_status_changed').subscribe((e) => {
        const j = this.job();
        if (!j || j.id !== e.jobId) return;
        this.job.set({ ...j, status: e.status });

        if (e.status === JobStatus.Started) {
          this.notify.info('WORKER.JOB_STARTED_BY_CUSTOMER');
        }
        if (e.status === JobStatus.Finished) {
          this.notify.success('WORKER.JOB_FINISHED_EARNINGS_CREDITED');
        }
      })
    );

    // User canceled the job
    this.subs.add(
      this.ws.on<{ jobId: string }>('job_canceled_by_worker').subscribe((e) => {
        // Ignored on worker side — this is the event they fire themselves
      })
    );
  }

  // ── Cancel Job ─────────────────────────────────────────────────────────────
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
        this.job.set({ ...updated, canceledBy: 'worker' });
        this.notify.info('WORKER.JOB_CANCELED_CUSTOMER_NOTIFIED');
      },
      error: () => this.notify.error('TOAST.JOB_CANCEL_FAILED'),
    });
  }

  goHome(): void {
    this.router.navigate(['/worker/home']);
  }

  goFeed(): void {
    this.router.navigate(['/worker/feed']);
  }
}
