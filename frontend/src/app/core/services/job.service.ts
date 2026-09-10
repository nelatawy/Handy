import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Job, Rating } from '../models/models';
import { JobStatus, PaymentType } from '../models/enums';

export interface UpdateJobStatusBody {
  status: JobStatus;
  paymentType?: PaymentType;
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

  /** PATCH /api/jobs/:id/status — transition job state */
  updateStatus(id: string, body: UpdateJobStatusBody): Observable<Job> {
    return this.http.patch<Job>(`/api/jobs/${id}/status`, body);
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
