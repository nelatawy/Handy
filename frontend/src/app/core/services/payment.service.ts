import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EarningsEntry, Transaction } from '../models/models';

export interface EarningsResponse {
  balance: number;
  transactions: EarningsEntry[];
}

/** Response from GET /api/payments/history */
export interface PaymentHistoryResponse {
  transactions: Transaction[];
  page: number;
  total: number;
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
   * GET /api/payments/history?page=N
   * Returns the current user's paginated payment transaction history.
   */
  getTransactionHistory(page = 1): Observable<PaymentHistoryResponse> {
    return this.http.get<PaymentHistoryResponse>('/payments/history', {
      params: { page: page.toString() },
    });
  }

  /**
   * GET /api/workers/me/earnings
   * Returns the worker's available balance and transaction history.
   * Only online-paid jobs are included — cash jobs are excluded (worker holds cash).
   */
  getEarnings(): Observable<EarningsResponse> {
    return this.http.get<EarningsResponse>('/workers/me/earnings');
  }

  /**
   * POST /api/jobs/:id/payout
   * Worker requests payout of their *entire* current balance via Paymob — the job ID in
   * the path is only used to verify the caller owns that job, this is not a per-job payout.
   */
  requestPayout(jobId: string): Observable<PayoutResponse> {
    return this.http.post<PayoutResponse>(`/jobs/${jobId}/payout`, {});
  }
}
