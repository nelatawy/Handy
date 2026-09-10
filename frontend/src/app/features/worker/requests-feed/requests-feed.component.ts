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
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { JobRequest } from '../../../core/models/models';
import { WorkType, WorkTypeLabel } from '../../../core/models/enums';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-requests-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule],
  templateUrl: './requests-feed.component.html',
  styleUrl: './requests-feed.component.scss',
})
export class RequestsFeedComponent implements OnInit, OnDestroy {
  private router     = inject(Router);
  private requestSvc = inject(RequestService);
  readonly auth      = inject(AuthService);
  private ws         = inject(WebSocketService);
  private notify     = inject(NotificationService);

  readonly WorkTypeLabel = WorkTypeLabel;

  readonly requests = signal<JobRequest[]>([]);
  readonly loading  = signal(true);

  private subs = new Subscription();

  ngOnInit(): void {
    this.loadRequests();
    this.ws.connect();

    // New request arrives — add to list if not already present
    this.subs.add(
      this.ws.on<{ request: JobRequest }>('new_request').subscribe((e) => {
        const existing = this.requests().some(r => r.id === e.request.id);
        if (!existing) {
          this.requests.update(list => [e.request, ...list]);
          this.notify.info('New matching request available!');
        }
      })
    );

    // A request is closed (someone was chosen) — remove from list
    this.subs.add(
      this.ws.on<{ requestId: string }>('request_closed').subscribe((e) => {
        this.requests.update(list => list.filter(r => r.id !== e.requestId));
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadRequests(): void {
    this.requestSvc.getOpenRequests().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next:  (list) => this.requests.set(list),
      error: ()     => this.notify.error('Failed to load requests.'),
    });
  }

  openRequest(r: JobRequest): void {
    this.router.navigate(['/worker/request', r.id]);
  }

  getWorkTypeEmoji(wt: WorkType): string {
    const map: Record<WorkType, string> = {
      [WorkType.Plumber]:     '🔩',
      [WorkType.Electrician]: '⚡',
      [WorkType.Carpenter]:   '🪚',
      [WorkType.IT]:          '💻',
    };
    return map[wt] ?? '🔧';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
