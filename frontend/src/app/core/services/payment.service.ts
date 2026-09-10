import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../models/models';

export interface EarningsResponse {
  balance: number;
  transactions: Transaction[];
}

export interface WithdrawResponse {
  /** Paymob redirect URL — backend performs the disbursement call server-side */
  redirectUrl?: string;
  message: string;
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
   */
  getEarnings(): Observable<EarningsResponse> {
    return this.http.get<EarningsResponse>('/api/workers/me/earnings');
  }

  /**
   * POST /api/workers/me/withdraw
   * Initiates a payout via Paymob (server-side disbursement call using Paymob secret key).
   * Backend returns a Paymob redirect URL or confirmation message.
   * NOTE (sandbox): backend may return a mock response; the frontend redirects if redirectUrl is present.
   */
  withdraw(): Observable<WithdrawResponse> {
    return this.http.post<WithdrawResponse>('/api/workers/me/withdraw', {});
  }
}
