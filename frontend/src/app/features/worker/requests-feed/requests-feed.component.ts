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
import { WorkType } from '../../../core/models/enums';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { WorkTypeIconComponent } from '../../../shared/components/work-type-icon/work-type-icon.component';
import { LucideInbox } from '@lucide/angular';

@Component({
  selector: 'app-requests-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule, WorkTypeIconComponent, LucideInbox],
  templateUrl: './requests-feed.component.html',
  styleUrl: './requests-feed.component.scss',
})
export class RequestsFeedComponent implements OnInit, OnDestroy {
  private router     = inject(Router);
  private requestSvc = inject(RequestService);
  readonly auth      = inject(AuthService);
  private ws         = inject(WebSocketService);
  private notify     = inject(NotificationService);

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
          this.notify.info('TOAST.NEW_REQUEST');
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
      error: ()     => this.notify.error('TOAST.REQUESTS_LOAD_FAILED'),
    });
  }

  openRequest(r: JobRequest): void {
    this.router.navigate(['/worker/request', r.id]);
  }

  /**
   * Returns a translation key + params for a relative "time ago" label.
   * The template resolves this via the translate pipe so it localizes
   * correctly (e.g. Arabic doesn't just prefix/suffix the same way English does).
   */
  timeAgo(dateStr: string): { key: string; params?: Record<string, number> } {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)  return { key: 'COMMON.TIME_AGO.JUST_NOW' };
    if (mins < 60) return { key: 'COMMON.TIME_AGO.MINUTES', params: { count: mins } };
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return { key: 'COMMON.TIME_AGO.HOURS', params: { count: hrs } };
    return { key: 'COMMON.TIME_AGO.DAYS', params: { count: Math.floor(hrs / 24) } };
  }
}
