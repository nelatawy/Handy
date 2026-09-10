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
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  /** GET /api/workers/me — fetch the authenticated worker's full profile */
  getWorkerProfile(): Observable<Worker> {
    return this.http.get<Worker>('/api/workers/me');
  }

  /**
   * PUT /api/workers/me — update editable worker profile fields.
   * Phone/work-type changes are excluded (phone requires OTP re-verification).
   */
  updateWorkerProfile(body: UpdateWorkerProfileBody): Observable<Worker> {
    return this.http.put<Worker>('/api/workers/me', body);
  }

  /** GET /api/workers/:id — public worker profile (name, workType, bio, shop, rating stats) */
  getPublicWorkerProfile(workerId: string): Observable<Worker> {
    return this.http.get<Worker>(`/api/workers/${workerId}`);
  }

  /** GET /api/workers/:id/ratings — paginated ratings for a worker's public profile */
  getWorkerRatings(workerId: string, page = 1): Observable<WorkerRatingsResponse> {
    return this.http.get<WorkerRatingsResponse>(`/api/workers/${workerId}/ratings`, {
      params: { page: page.toString() },
    });
  }

  /**
   * GET /api/users/me — fetch the authenticated user's profile.
   * NOTE: This endpoint is NOT in the backend contract table (BACKEND_PLAN.md §9).
   * Backend confirmation needed before this is used in production.
   */
  getUserProfile(): Observable<User> {
    return this.http.get<User>('/api/users/me');
  }

  /**
   * PUT /api/users/me — update editable user profile fields.
   * NOTE: This endpoint is NOT in the backend contract table (BACKEND_PLAN.md §9).
   * Backend confirmation needed before this is used in production.
   */
  updateUserProfile(body: UpdateUserProfileBody): Observable<User> {
    return this.http.put<User>('/api/users/me', body);
  }
}
