import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, Rating } from '../models/models';
import { JobStatus, PaymentType } from '../models/enums';

export interface UpdateJobStatusBody {
  status: JobStatus;
  paymentType?: PaymentType;
  walletPhone?: string;
}

/**
 * Response from PATCH /api/jobs/:id/status
 * `paymentUrl` is only present when status='finished' AND paymentType='online'.
 * The frontend must redirect to this URL for Paymob hosted checkout.
 */
export interface UpdateJobStatusResponse {
  job: Job;
  paymentUrl?: string;
}

export interface RateJobBody {
  stars: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class JobService {
  constructor(private http: HttpClient) {}

  /** GET /api/jobs/:id — fetch a single job */
  getJob(id: string): Observable<Job> {
    return this.http.get<Job>(`/jobs/${id}`);
  }

  /** GET /api/jobs/active — get the current user's active job (if any) */
  getActiveJob(): Observable<Job | null> {
    return this.http.get<Job | null>('/jobs/active');
  }

  /** PATCH /api/jobs/:id/status — user-only state transition (started/finished/canceled).
   *  Response includes `paymentUrl` only when finishing with paymentType='online'. */
  updateStatus(id: string, body: UpdateJobStatusBody): Observable<UpdateJobStatusResponse> {
    return this.http.patch<UpdateJobStatusResponse>(`/jobs/${id}/status`, body);
  }

  /** POST /api/jobs/:id/rate — submit a rating after finishing. Backend wraps the
   *  response as `{ rating }`. */
  rateJob(id: string, body: RateJobBody): Observable<{ rating: Rating }> {
    return this.http.post<{ rating: Rating }>(`/jobs/${id}/rate`, body);
  }

  /** POST /api/jobs/:id/cancel — worker-only cancel. Backend wraps the response as `{ job }`. */
  cancelJob(id: string): Observable<{ job: Job }> {
    return this.http.post<{ job: Job }>(`/jobs/${id}/cancel`, {});
  }
}
