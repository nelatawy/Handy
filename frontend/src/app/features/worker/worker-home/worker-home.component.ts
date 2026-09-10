import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { Job } from '../../../core/models/models';
import { JobStatus, WorkType, WorkTypeLabel } from '../../../core/models/enums';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { JobStatusBadgeComponent } from '../../../shared/components/job-status-badge/job-status-badge.component';

@Component({
  selector: 'app-worker-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, JobStatusBadgeComponent],
  templateUrl: './worker-home.component.html',
  styleUrl: './worker-home.component.scss',
})
export class WorkerHomeComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private jobSvc = inject(JobService);
  readonly auth  = inject(AuthService);
  private ws     = inject(WebSocketService);
  private notify = inject(NotificationService);

  readonly activeJob    = signal<Job | null>(null);
  readonly loadingJob   = signal(true);
  readonly JobStatus    = JobStatus;
  readonly WorkTypeLabel = WorkTypeLabel;

  private subs = new Subscription();

  ngOnInit(): void {
    this.jobSvc.getActiveJob().pipe(
      finalize(() => this.loadingJob.set(false)),
    ).subscribe({
      next:  (job) => this.activeJob.set(job),
      error: ()    => this.loadingJob.set(false),
    });

    this.ws.connect();
    // Listen for new_request — show a toast
    this.subs.add(
      this.ws.on<{ request: { id: string } }>('new_request').subscribe(() => {
        this.notify.info('New matching request available!');
      })
    );
    // If a job status changes, refresh active job
    this.subs.add(
      this.ws.on<{ jobId: string; status: JobStatus }>('job_status_changed').subscribe((e) => {
        const j = this.activeJob();
        if (j && j.id === e.jobId) {
          this.activeJob.set({ ...j, status: e.status });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  goFeed(): void {
    this.router.navigate(['/worker/feed']);
  }

  goActiveJob(): void {
    const job = this.activeJob();
    if (job) this.router.navigate(['/worker/job', job.id]);
  }
}
