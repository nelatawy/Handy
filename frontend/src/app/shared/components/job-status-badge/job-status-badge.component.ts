import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { JobStatus } from '../../../core/models/enums';

@Component({
  selector: 'app-job-status-badge',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    @if (showStepper && status !== JobStatus.Canceled) {
      <div class="stepper">
        @for (step of steps; track step.status) {
          <div
            class="stepper__step"
            [class.stepper__step--done]="isStepDone(step.status)"
            [class.stepper__step--active]="step.status === status"
          >
            <div class="stepper__dot">
              <span class="stepper__dot-inner">
                {{ isStepDone(step.status) ? '✓' : '' }}
              </span>
            </div>
            <span class="stepper__label">{{ step.label | translate }}</span>
          </div>
          @if (!$last) {
            <div class="stepper__line"
              [class.stepper__line--done]="isStepDone(step.status)">
            </div>
          }
        }
      </div>
    } @else {
      <span class="badge" [class]="'badge--' + status">
        {{ 'JOB_STATUS.' + status | translate }}
      </span>
    }
  `,
  styleUrl: './job-status-badge.component.scss',
})
export class JobStatusBadgeComponent {
  @Input({ required: true }) status!: JobStatus;
  @Input() showStepper = false;

  protected JobStatus = JobStatus;

  protected steps = [
    { status: JobStatus.Pending,  label: 'JOB_STATUS.pending' },
    { status: JobStatus.Started,  label: 'JOB_STATUS.started' },
    { status: JobStatus.Finished, label: 'JOB_STATUS.finished' },
  ];

  protected isStepDone(step: JobStatus): boolean {
    const order = [JobStatus.Pending, JobStatus.Started, JobStatus.Finished];
    return order.indexOf(this.status) > order.indexOf(step);
  }
}
