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
  totalRatings: number;
  completedJobs: number;
}

/** A job request posted by a normal user */
export interface JobRequest {
  id: string;
  userId: string;
  description: string;
  workType: WorkType;
  imageUrls: string[];   // public Supabase Storage URLs
  status: 'open' | 'closed';
  createdAt: string;
}

/** An offer submitted by a handyman on a request */
export interface Offer {
  id: string;
  requestId: string;
  workerId: string;
  workerName: string;
  workerRating: number;
  workerCompletedJobs: number;
  workerHasShop: boolean;
  workerShopLocation?: string;
  price: number;         // worker's quoted price (excl. platform fee)
  userPrice: number;     // price + 5% (what user pays)
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

/** A payment transaction record */
export interface Transaction {
  id: string;
  jobId: string;
  userId: string;
  workerId: string;
  amount: number;
  paymentType: import('./enums').PaymentType;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

/** Auth token payload (decoded JWT) */
export interface TokenPayload {
  sub: string;           // user ID
  username: string;
  role: UserRole;
  exp: number;
}

/** API response shape for auth endpoints */
export interface AuthResponse {
  token: string;
  role: UserRole;
  user: User | Worker;
}

/** OTP send response from backend */
export interface OtpSendResponse {
  success: boolean;
  channel: 'whatsapp' | 'telegram';
  telegramLink?: string; // present when channel === 'telegram'
}

/** AI suggestion response */
export interface AiSuggestResponse {
  suggestedDescription: string;
  recommendedWorkType: WorkType;
}
