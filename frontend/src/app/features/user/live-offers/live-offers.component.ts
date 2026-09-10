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
    return this.offers().find(o => o.id === id)?.workerName ?? 'the handyman';
  };

  loading  = signal(true);
  choosing = signal(false);

  private subs = new Subscription();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.requestId.set(id);
    this.loadRequest(id);
    this.subscribeToWebSocket();
  }

  ngOnDestroy(): void {
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

    // Fetch existing offers (in case page was refreshed)
    this.requestSvc.getOffers(id).subscribe({
      next: (offers) => this.offers.set(offers),
      error: () => {},
    });
  }

  private subscribeToWebSocket(): void {
    this.ws.connect();

    // New offer from a handyman
    this.subs.add(
      this.ws.on<Offer>('new_offer').subscribe((offer) => {
        // Only add if this offer is for the current request
        if (offer.requestId === this.requestId()) {
          this.offers.update(list => {
            const exists = list.some(o => o.id === offer.id);
            return exists ? list : [...list, offer];
          });
          this.notify.info('TOAST.NEW_OFFER', { name: offer.workerName });
        }
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
        this.notify.success('OFFERS.CHOSEN_CONFIRM', { name: chosen?.workerName ?? 'the handyman' });
        setTimeout(() => this.router.navigate(['/user/job', res.jobId]), 1200);
      },
      error: () => this.notify.error('TOAST.CHOOSE_OFFER_FAILED'),
    });
  }

  trackOffer(_: number, offer: Offer): string {
    return offer.id;
  }
}
