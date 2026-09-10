// ============================================================
//  Handy — Core Enums
// ============================================================

/** Work type a handyman specializes in */
export enum WorkType {
  Plumber     = 'plumber',
  Electrician = 'electrician',
  Carpenter   = 'carpenter',
  IT          = 'it',
}

/**
 * Human-readable labels for WorkType are intentionally NOT defined here as plain
 * string maps — all display of a WorkType in the UI must go through the translate
 * pipe with keys 'WORK_TYPE.<value>' (see assets/i18n/en.json / ar.json) so labels
 * localize correctly. Do not reintroduce a hardcoded English/Arabic label map.
 */

/** Job lifecycle states — driven by the user */
export enum JobStatus {
  Pending  = 'pending',
  Started  = 'started',
  Finished = 'finished',
  Canceled = 'canceled',
}

/** How the user paid when marking a job Finished */
export enum PaymentType {
  Online = 'online',
  Cash   = 'cash',
}

/** User roles stored in the JWT */
export enum UserRole {
  User   = 'user',
  Worker = 'worker',
}

/** Account identifier type for login */
export enum IdentifierType {
  Username = 'username',
  Phone    = 'phone',
}

/** All supported worker types as an array (for dropdowns) */
export const WORK_TYPES: WorkType[] = Object.values(WorkType);
