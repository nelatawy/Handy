import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobRequest, Offer, AiSuggestResponse } from '../models/models';
import { WorkType } from '../models/enums';

export interface CreateRequestBody {
  description: string;
  workType: WorkType;
  imageUrls: string[];
}

export interface CreateRequestResponse {
  requestId: string;
  request: JobRequest;
}

export interface ChooseOfferResponse {
  jobId: string;
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
  chooseOffer(requestId: string, offerId: string): Observable<ChooseOfferResponse> {
    return this.http.post<ChooseOfferResponse>(`/api/requests/${requestId}/choose`, { offerId });
  }

  /** POST /api/ai-suggest — Gemini Flash description enhancement */
  aiSuggest(description: string): Observable<AiSuggestResponse> {
    return this.http.post<AiSuggestResponse>('/api/ai-suggest', { description });
  }
}
