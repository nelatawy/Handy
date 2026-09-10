import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/models';

export interface EarningsResponse {
  balance: number;
  transactions: Transaction[];
}

/** Response from POST /api/jobs/:id/payout */
export interface PayoutResponse {
  payout: {
    id: string;
    jobId: string;
    workerId: string;
    amount: number;
    status: string;
    createdAt: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) {}

  /**
   * GET /api/payments/history
   * Returns the current user's payment transaction history (finished jobs).
   */
  getTransactionHistory(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>('/api/payments/history');
  }

  /**
   * GET /api/workers/me/earnings
   * Returns the worker's available balance and transaction history.
   * Only online-paid jobs are included — cash jobs are excluded (worker holds cash).
   */
  getEarnings(): Observable<EarningsResponse> {
    return this.http.get<EarningsResponse>('/api/workers/me/earnings');
  }

  /**
   * POST /api/jobs/:id/payout
   * Worker requests payout of earnings for a specific finished job via Paymob.
   * This is per-job, not a global withdrawal — the job ID is required.
   */
  requestPayout(jobId: string): Observable<PayoutResponse> {
    return this.http.post<PayoutResponse>(`/api/jobs/${jobId}/payout`, {});
  }
}
