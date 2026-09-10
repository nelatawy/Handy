import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { JobRequest } from '../../../core/models/models';
import { WorkType } from '../../../core/models/enums';
import { RequestService } from '../../../core/services/request.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private requestSvc = inject(RequestService);
  private ws         = inject(WebSocketService);
  private notify     = inject(NotificationService);

  readonly request      = signal<JobRequest | null>(null);
  readonly loading      = signal(true);
  readonly closed       = signal(false); // request was closed while viewing
  readonly lightboxUrl  = signal<string | null>(null);
  readonly lightboxIdx  = signal(0);

  private subs = new Subscription();
  private requestId!: string;

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id')!;
    this.loadRequest();

    this.ws.connect();
    // If this request gets closed while viewing it
    this.subs.add(
      this.ws.on<{ requestId: string }>('request_closed').subscribe((e) => {
        if (e.requestId === this.requestId) {
          this.closed.set(true);
          this.notify.warning('WORKER.REQUEST_CLOSED_WARNING');
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
      next:  (r) => {
        this.request.set(r);
        if (r.status === 'closed') this.closed.set(true);
      },
      error: () => {
        this.notify.error('TOAST.REQUEST_LOAD_FAILED');
        this.router.navigate(['/worker/feed']);
      },
    });
  }

  accept(): void {
    this.router.navigate(['/worker/request', this.requestId, 'price']);
  }

  decline(): void {
    this.router.navigate(['/worker/feed']);
  }

  goBack(): void {
    this.router.navigate(['/worker/feed']);
  }

  openLightbox(url: string, idx: number): void {
    this.lightboxUrl.set(url);
    this.lightboxIdx.set(idx);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  prevImage(): void {
    const imgs = this.request()?.imageUrls ?? [];
    const newIdx = (this.lightboxIdx() - 1 + imgs.length) % imgs.length;
    this.lightboxIdx.set(newIdx);
    this.lightboxUrl.set(imgs[newIdx]);
  }

  nextImage(): void {
    const imgs = this.request()?.imageUrls ?? [];
    const newIdx = (this.lightboxIdx() + 1) % imgs.length;
    this.lightboxIdx.set(newIdx);
    this.lightboxUrl.set(imgs[newIdx]);
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
}
