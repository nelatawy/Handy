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
import { Subscription } from 'rxjs';

import { WebSocketService } from '../../../core/services/websocket.service';
import { JobService } from '../../../core/services/job.service';

type CallbackState = 'processing' | 'success' | 'failed';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: `
    <div class="callback-page">
      <div class="callback-card">

        <!-- Processing state -->
        @if (state() === 'processing') {
          <div class="callback-icon callback-icon--processing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <h1 class="callback-title">{{ 'PAYMENT_CALLBACK.TITLE_PROCESSING' | translate }}</h1>
          <p class="callback-subtitle">{{ 'PAYMENT_CALLBACK.SUBTITLE_PROCESSING' | translate }}</p>
        }

        <!-- Success state -->
        @if (state() === 'success') {
          <div class="callback-icon callback-icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12l3 3 5-5"/>
            </svg>
          </div>
          <h1 class="callback-title callback-title--success">{{ 'PAYMENT_CALLBACK.TITLE_SUCCESS' | translate }}</h1>
          <p class="callback-subtitle">{{ 'PAYMENT_CALLBACK.SUBTITLE_SUCCESS' | translate }}</p>
          @if (jobId()) {
            <button class="btn btn--primary" (click)="viewJob()">{{ 'PAYMENT_CALLBACK.VIEW_JOB' | translate }}</button>
          }
        }

        <!-- Failed state -->
        @if (state() === 'failed') {
          <div class="callback-icon callback-icon--failed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <h1 class="callback-title callback-title--failed">{{ 'PAYMENT_CALLBACK.TITLE_FAILED' | translate }}</h1>
          <p class="callback-subtitle">{{ 'PAYMENT_CALLBACK.SUBTITLE_FAILED' | translate }}</p>
          <div class="callback-actions">
            @if (jobId()) {
              <button class="btn btn--primary" (click)="viewJob()">{{ 'PAYMENT_CALLBACK.VIEW_JOB' | translate }}</button>
            }
            <button class="btn btn--secondary" (click)="goHome()">{{ 'PAYMENT_CALLBACK.GO_HOME' | translate }}</button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .callback-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      padding: 2rem;
    }

    .callback-card {
      text-align: center;
      max-width: 420px;
      width: 100%;
      padding: 2.5rem 2rem;
      border-radius: 1.25rem;
      background: var(--surface-card, #fff);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }

    .callback-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .callback-icon svg {
      width: 100%;
      height: 100%;
    }

    .callback-icon--processing {
      color: var(--primary, #6366f1);
      background: rgba(99, 102, 241, 0.1);
    }

    .callback-icon--success {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    .callback-icon--failed {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .callback-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: var(--text-primary, #1e293b);
    }

    .callback-title--success { color: #10b981; }
    .callback-title--failed  { color: #ef4444; }

    .callback-subtitle {
      font-size: 0.95rem;
      color: var(--text-secondary, #64748b);
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .callback-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 2rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: transform 0.15s, box-shadow 0.15s;
      min-width: 180px;
    }

    .btn:active { transform: scale(0.97); }

    .btn--primary {
      background: var(--primary, #6366f1);
      color: #fff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
    }

    .btn--secondary {
      background: transparent;
      color: var(--text-secondary, #64748b);
      border: 1px solid var(--border, #e2e8f0);
    }
  `],
})
export class PaymentCallbackComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private ws     = inject(WebSocketService);
  private jobSvc = inject(JobService);

  state = signal<CallbackState>('processing');
  jobId = signal<string | null>(null);

  private subs = new Subscription();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Parse query params from Paymob redirect
    const params = this.route.snapshot.queryParams;

    // Paymob may include success/pending indicators in the redirect URL
    const success = params['success'];
    const pending = params['pending'];

    // Connect WebSocket to receive real-time payment status from webhook
    this.ws.connect();

    // Listen for payment_confirmed
    this.subs.add(
      this.ws.on<{ jobId: string; amount: number }>('payment_confirmed').subscribe((e) => {
        this.jobId.set(e.jobId);
        this.state.set('success');
        this.clearTimeout();
      })
    );

    // Listen for payment_failed
    this.subs.add(
      this.ws.on<{ jobId: string }>('payment_failed').subscribe((e) => {
        this.jobId.set(e.jobId);
        this.state.set('failed');
        this.clearTimeout();
      })
    );

    // If Paymob redirect indicates success, the webhook should confirm shortly.
    // If it indicates failure, show failed immediately.
    if (success === 'false') {
      this.state.set('failed');
    } else {
      // Give the webhook up to 30 seconds to confirm, then try to fetch the active job
      this.timeoutId = setTimeout(() => {
        if (this.state() === 'processing') {
          // Try fetching active job to determine state
          this.jobSvc.getActiveJob().subscribe({
            next: (job) => {
              if (job) {
                this.jobId.set(job.id);
                if (job.status === 'finished') {
                  this.state.set('success');
                } else {
                  // Job still in progress — webhook may have confirmed it
                  // Show success anyway since Paymob indicated success redirect
                  this.state.set(success === 'true' ? 'success' : 'processing');
                }
              } else {
                // No active job — payment probably went through
                this.state.set('success');
              }
            },
            error: () => this.state.set('failed'),
          });
        }
      }, 15000);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearTimeout();
  }

  viewJob(): void {
    const id = this.jobId();
    if (id) {
      this.router.navigate(['/user/job', id]);
    } else {
      this.router.navigate(['/user/home']);
    }
  }

  goHome(): void {
    this.router.navigate(['/user/home']);
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
