import { WorkType, UserRole } from './enums';

// ============================================================
//  Handy — Core Data Models
// ============================================================

/** Base user fields */
export interface User {
  id: string;
  username: string;
  phone: string;         // E.164
  country: string;
  governorate: string;
  role: UserRole;
  createdAt: string;     // ISO date string
}

/** Worker (handyman) profile */
export interface Worker extends User {
  workType: WorkType;
  bio: string;
  hasShop: boolean;
  shopLocation?: string;
  averageRating: number;
  ratingsCount: number;      // matches backend field name
  completedJobsCount: number; // matches backend field name
}

/** A job request posted by a normal user */
export interface JobRequest {
  id: string;
  userId: string;
  description: string;
  workType: WorkType;
  images: string[];   // public Supabase Storage URLs — matches backend's `images` field
  /** Backend statuses: open → offer_selected → cancelled */
  status: 'open' | 'offer_selected' | 'cancelled';
  createdAt: string;
}

/** Worker info nested inside an Offer — matches backend's `offer.worker` shape exactly */
export interface OfferWorker {
  id: string;
  username: string;
  workType: WorkType;
  averageRating: number;
  ratingsCount: number;
  completedJobsCount: number;
  hasShop: boolean;
  shopLocation?: string;
}

/** An offer submitted by a handyman on a request */
export interface Offer {
  id: string;
  requestId: string;
  workerId: string;
  worker: OfferWorker;
  price: number;         // worker's quoted price (excl. platform fee)
  priceWithFee: number;  // price + 5% (what the user pays) — matches backend field name
  status: 'pending' | 'chosen' | 'rejected';
  createdAt: string;
}

/** An active job (created once user picks an offer) */
export interface Job {
  id: string;
  requestId: string;
  offerId: string;
  userId: string;
  workerId: string;
  workerName: string;
  workType: WorkType;
  description: string;
  price: number;
  userPrice: number;
  status: import('./enums').JobStatus;
  paymentType?: import('./enums').PaymentType;
  canceledBy?: 'user' | 'worker';
  startedAt?: string;
  finishedAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A rating submitted after a finished job */
export interface Rating {
  id: string;
  jobId: string;
  userId: string;
  workerId: string;
  stars: number;         // 1-5
  comment?: string;
  createdAt: string;
}

/** A single entry in a worker's earnings breakdown — GET /api/workers/me/earnings.
 *  Deliberately not a full Transaction: the backend only returns { jobId, amount,
 *  finishedAt } for this endpoint (only finished online jobs are ever included, so
 *  there's no status to show — everything here is, by construction, already paid). */
export interface EarningsEntry {
  jobId: string;
  amount: number;
  finishedAt: string;
}

/** A payment transaction record */
export interface Transaction {
  id: string;
  jobId: string;
  userId: string;
  workerId: string;
  amount: number;
  method: import('./enums').PaymentType; // 'online' | 'cash' — matches backend `payments.method`
  status: 'pending' | 'paid' | 'failed'; // matches backend PaymentStatus enum
  createdAt: string;
}

/** Auth token payload (decoded JWT) */
export interface TokenPayload {
  sub: string;           // user ID
  username: string;
  role: UserRole;
  exp: number;
}

/** API response shape for auth endpoints (login + register) */
export interface AuthResponse {
  token: string;
  role: UserRole;
  // Note: no `user` object — profile is fetched separately after login if needed
}

/** OTP send response from backend */
export interface OtpSendResponse {
  channel: 'whatsapp' | 'telegram';
  telegramBotUrl?: string; // present when channel === 'telegram'
  expiresIn: number;       // seconds until the OTP expires
}

/** AI suggestion response */
export interface AiSuggestResponse {
  suggestedDescription: string;
  recommendedWorkType: WorkType;
}
