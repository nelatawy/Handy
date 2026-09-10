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

/** Human-readable labels for WorkType (used in UI dropdowns / display) */
export const WorkTypeLabel: Record<WorkType, string> = {
  [WorkType.Plumber]:     'Plumber',
  [WorkType.Electrician]: 'Electrician',
  [WorkType.Carpenter]:   'Carpenter',
  [WorkType.IT]:          'IT Technician',
};

/** Arabic labels for WorkType */
export const WorkTypeLabelAr: Record<WorkType, string> = {
  [WorkType.Plumber]:     'سباك',
  [WorkType.Electrician]: 'كهربائي',
  [WorkType.Carpenter]:   'نجار',
  [WorkType.IT]:          'تقنية معلومات',
};

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
