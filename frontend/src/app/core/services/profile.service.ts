import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Worker } from '../models/models';

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

  /** GET /api/users/me — fetch the authenticated user's profile */
  getUserProfile(): Observable<User> {
    return this.http.get<User>('/api/users/me');
  }

  /**
   * PUT /api/users/me — update editable user profile fields.
   * Phone changes are excluded (requires OTP re-verification).
   */
  updateUserProfile(body: UpdateUserProfileBody): Observable<User> {
    return this.http.put<User>('/api/users/me', body);
  }
}
