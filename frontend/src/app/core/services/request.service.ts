import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobRequest, Offer, AiSuggestResponse } from '../models/models';
import { WorkType } from '../models/enums';

export interface CreateRequestBody {
  description: string;
  workType: WorkType;
  images: string[]; // already-uploaded Supabase Storage URLs (max 5)
}

export interface CreateRequestResponse {
  requestId: string;
}



@Injectable({ providedIn: 'root' })
export class RequestService {
  constructor(private http: HttpClient) {}

  /** POST /api/requests — submit a new job request */
  createRequest(body: CreateRequestBody): Observable<CreateRequestResponse> {
    return this.http.post<CreateRequestResponse>('/api/requests', body);
  }

  /** GET /api/requests/mine — fetch this user's own requests */
  getMyRequests(): Observable<JobRequest[]> {
    return this.http.get<JobRequest[]>('/api/requests/mine');
  }

  /** GET /api/requests/:id — fetch a single request */
  getRequest(id: string): Observable<JobRequest> {
    return this.http.get<JobRequest>(`/api/requests/${id}`);
  }

  /** GET /api/requests/:id/offers — fetch offers for a request */
  getOffers(requestId: string): Observable<Offer[]> {
    return this.http.get<Offer[]>(`/api/requests/${requestId}/offers`);
  }

  /** POST /api/requests/:id/choose — user picks an offer → creates a Job */
  chooseOffer(requestId: string, offerId: string): Observable<{ jobId : string }> {
    return this.http.post<{ jobId : string }>(`/api/requests/${requestId}/choose`, { offerId });
  }

  /** POST /api/requests/:id/decline — worker signals no interest; no body required */
  declineOffer(requestId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`/api/requests/${requestId}/decline`, {});
  }

  /** GET /api/workers/me/requests — open requests matching this worker's work type */
  getOpenRequests(): Observable<JobRequest[]> {
    return this.http.get<JobRequest[]>('/api/workers/me/requests');
  }

  /** POST /api/requests/:id/offer — worker submits an offer */
  submitOffer(requestId: string, price: number): Observable<{ offerId: string , priceWithFee : number }> {
    return this.http.post<{ offerId: string , priceWithFee : number }>(`/api/requests/${requestId}/offer`, { price });
  }

  /** POST /api/ai-suggest — Gemini Flash description enhancement */
  aiSuggest(description: string): Observable<AiSuggestResponse> {
    return this.http.post<AiSuggestResponse>('/api/ai-suggest', { description });
  }
}
