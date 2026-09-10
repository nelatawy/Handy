import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Worker, Rating } from '../models/models';

export interface UpdateWorkerProfileBody {
  bio?: string;
  hasShop?: boolean;
  shopLocation?: string;
}

export interface UpdateUserProfileBody {
  username?: string;
  country?: string;
  governorate?: string;
}

export interface WorkerRatingsResponse {
  ratings: Rating[];
  average: number;
  count: number;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  /** GET /api/workers/me — fetch the authenticated worker's full profile */
  getWorkerProfile(): Observable<Worker> {
    return this.http.get<Worker>('/workers/me');
  }

  /**
   * PUT /api/workers/me — update editable worker profile fields.
   * Phone/work-type changes are excluded (phone requires OTP re-verification).
   * Backend wraps the response as `{ worker }`.
   */
  updateWorkerProfile(body: UpdateWorkerProfileBody): Observable<{ worker: Worker }> {
    return this.http.put<{ worker: Worker }>('/workers/me', body);
  }

  /** GET /api/workers/:id — public worker profile (name, workType, bio, shop, rating stats) */
  getPublicWorkerProfile(workerId: string): Observable<Worker> {
    return this.http.get<Worker>(`/workers/${workerId}`);
  }

  /** GET /api/workers/:id/ratings — paginated ratings for a worker's public profile */
  getWorkerRatings(workerId: string, page = 1): Observable<WorkerRatingsResponse> {
    return this.http.get<WorkerRatingsResponse>(`/workers/${workerId}/ratings`, {
      params: { page: page.toString() },
    });
  }

  /** GET /api/users/me — fetch the authenticated user's profile. */
  getUserProfile(): Observable<User> {
    return this.http.get<User>('/users/me');
  }

  /**
   * PUT /api/users/me — update editable user profile fields.
   * Backend wraps the response as `{ user }`.
   */
  updateUserProfile(body: UpdateUserProfileBody): Observable<{ user: User }> {
    return this.http.put<{ user: User }>('/users/me', body);
  }
}
