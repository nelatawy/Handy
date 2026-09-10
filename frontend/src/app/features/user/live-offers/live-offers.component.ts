import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { JobRequest, Offer } from '../../../core/models/models';
import { RequestService } from '../../../core/services/request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';

@Component({
  selector: 'app-live-offers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, StarRatingComponent],
  templateUrl: './live-offers.component.html',
  styleUrl: './live-offers.component.scss',
})
export class LiveOffersComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private requestSvc = inject(RequestService);
  private notify     = inject(NotificationService);
  private ws         = inject(WebSocketService);

  readonly requestId = signal<string>('');
  readonly request   = signal<JobRequest | null>(null);
  readonly offers    = signal<Offer[]>([]);
  readonly selectedOfferId = signal<string | null>(null);
  readonly chosenOfferId   = signal<string | null>(null);   // after choosing

  /** Name of the chosen handyman (used in the banner) */
  chosenWorkerName = () => {
    const id = this.chosenOfferId();
    if (!id) return '';
    return this.offers().find(o => o.id === id)?.worker.username ?? 'the handyman';
  };

  loading  = signal(true);
  choosing = signal(false);

  private subs = new Subscription();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.requestId.set(id);
    this.loadRequest(id);
    this.subscribeToWebSocket(id);
  }

  ngOnDestroy(): void {
    // Leave the request room so we stop receiving events for this request
    const id = this.requestId();
    if (id) {
      this.ws.leaveRequestRoom(id);
    }
    this.subs.unsubscribe();
  }

  private loadRequest(id: string): void {
    this.requestSvc.getRequest(id).subscribe({
      next: (req) => {
        this.request.set(req);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('TOAST.REQUEST_LOAD_FAILED');
        this.loading.set(false);
      },
    });

    // Fetch existing offers (in case page was refreshed or navigated back to)
    this.requestSvc.getOffers(id).subscribe({
      next: (offers) => this.offers.set(offers),
      error: () => {},
    });
  }

  private subscribeToWebSocket(requestId: string): void {
    this.ws.connect();
    // Join the request-scoped room — all new_offer events from here belong to this request
    this.ws.joinRequestRoom(requestId);

    // New offer from a handyman — no client-side requestId filtering needed
    // because the backend only emits to request:{requestId} room members
    this.subs.add(
      this.ws.on<{ offer: Offer }>('new_offer').subscribe(({ offer }) => {
        this.offers.update(list => {
          const exists = list.some(o => o.id === offer.id);
          return exists ? list : [...list, offer];
        });
        this.notify.info('TOAST.NEW_OFFER', { name: offer.worker.username });
      })
    );
  }

  selectOffer(id: string): void {
    if (this.chosenOfferId()) return; // already chose
    this.selectedOfferId.set(this.selectedOfferId() === id ? null : id);
  }

  chooseOffer(): void {
    const offerId = this.selectedOfferId();
    if (!offerId || this.choosing()) return;
    this.choosing.set(true);

    this.requestSvc.chooseOffer(this.requestId(), offerId).pipe(
      finalize(() => this.choosing.set(false)),
    ).subscribe({
      next: (res) => {
        this.chosenOfferId.set(offerId);
        const chosen = this.offers().find(o => o.id === offerId);
        this.notify.success('OFFERS.CHOSEN_CONFIRM', { name: chosen?.worker.username ?? 'the handyman' });
        setTimeout(() => this.router.navigate(['/user/job', res.jobId]), 1200);
      },
      error: () => this.notify.error('TOAST.CHOOSE_OFFER_FAILED'),
    });
  }

  trackOffer(_: number, offer: Offer): string {
    return offer.id;
  }
}
