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

import { Job } from '../../../core/models/models';
import { JobStatus } from '../../../core/models/enums';
import { JobService } from '../../../core/services/job.service';
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
  private router  = inject(Router);
  private jobSvc  = inject(JobService);
  readonly auth   = inject(AuthService);

  readonly activeJob   = signal<Job | null>(null);
  readonly loadingJob  = signal(true);

  readonly JobStatus = JobStatus;

  ngOnInit(): void {
    this.jobSvc.getActiveJob().pipe(
      finalize(() => this.loadingJob.set(false)),
    ).subscribe({
      next:  (job) => this.activeJob.set(job),
      error: ()    => this.loadingJob.set(false),
    });
  }

  goMakeRequest(): void {
    this.router.navigate(['/user/request/new']);
  }

  goActiveJob(): void {
    const job = this.activeJob();
    if (job) this.router.navigate(['/user/job', job.id]);
  }

  goHistory(): void {
    this.router.navigate(['/user/history']);
  }
}
