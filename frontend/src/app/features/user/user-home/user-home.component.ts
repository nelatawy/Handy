import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { Job, JobRequest } from '../../../core/models/models';
import { JobStatus, WorkType } from '../../../core/models/enums';
import { JobService } from '../../../core/services/job.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { JobStatusBadgeComponent } from '../../../shared/components/job-status-badge/job-status-badge.component';

@Component({
  selector: 'app-user-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, JobStatusBadgeComponent],
  templateUrl: './user-home.component.html',
  styleUrl: './user-home.component.scss',
})
export class UserHomeComponent implements OnInit {
  private router     = inject(Router);
  private jobSvc     = inject(JobService);
  private requestSvc = inject(RequestService);
  readonly auth      = inject(AuthService);

  readonly activeJob       = signal<Job | null>(null);
  readonly loadingJob      = signal(true);
  readonly pendingRequests = signal<JobRequest[]>([]);
  readonly loadingRequests = signal(true);

  readonly JobStatus = JobStatus;
  readonly WorkType  = WorkType;

  /** Work-type emoji map for request cards */
  readonly workTypeEmoji: Record<string, string | undefined> = {
    plumber:      '🔧',
    electrician:  '⚡',
    carpenter:    '🪵',
    painter:      '🎨',
    cleaner:      '🧹',
    ac_technician:'❄️',
    other:        '🛠️',
  };

  ngOnInit(): void {
    // Load active job (already-started/pending job)
    this.jobSvc.getActiveJob().pipe(
      finalize(() => this.loadingJob.set(false)),
    ).subscribe({
      next:  (job) => this.activeJob.set(job),
      error: ()    => this.loadingJob.set(false),
    });

    // Load pending requests (open requests waiting for offers)
    this.requestSvc.getMyRequests().pipe(
      finalize(() => this.loadingRequests.set(false)),
    ).subscribe({
      next: (reqs) => {
        // Only show requests that are still open (waiting for offers)
        this.pendingRequests.set(reqs.filter(r => r.status === 'open'));
      },
      error: () => this.loadingRequests.set(false),
    });
  }

  goMakeRequest(): void {
    this.router.navigate(['/user/request/new']);
  }

  goActiveJob(): void {
    const job = this.activeJob();
    if (job) this.router.navigate(['/user/job', job.id]);
  }

  goToRequest(requestId: string): void {
    this.router.navigate(['/user/request', requestId, 'offers']);
  }

  goHistory(): void {
    this.router.navigate(['/user/history']);
  }
}
