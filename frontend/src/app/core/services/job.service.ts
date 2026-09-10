import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, Rating } from '../models/models';
import { JobStatus, PaymentType } from '../models/enums';

export interface UpdateJobStatusBody {
  status: JobStatus;
  paymentType?: PaymentType;
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
    return this.http.get<Job>(`/api/jobs/${id}`);
  }

  /** GET /api/jobs/active — get the current user's active job (if any) */
  getActiveJob(): Observable<Job | null> {
    return this.http.get<Job | null>('/api/jobs/active');
  }

  /** PATCH /api/jobs/:id/status — user-only state transition (started/finished/canceled).
   *  Response includes `paymentUrl` only when finishing with paymentType='online'. */
  updateStatus(id: string, body: UpdateJobStatusBody): Observable<UpdateJobStatusResponse> {
    return this.http.patch<UpdateJobStatusResponse>(`/api/jobs/${id}/status`, body);
  }

  /** POST /api/jobs/:id/rate — submit a rating after finishing */
  rateJob(id: string, body: RateJobBody): Observable<Rating> {
    return this.http.post<Rating>(`/api/jobs/${id}/rate`, body);
  }

  /** POST /api/jobs/:id/cancel — cancel a job */
  cancelJob(id: string): Observable<Job> {
    return this.http.post<Job>(`/api/jobs/${id}/cancel`, {});
  }
}
