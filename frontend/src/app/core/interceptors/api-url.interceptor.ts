import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Prepends the base API URL to relative request URLs */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip absolute URLs (e.g., Supabase, external APIs)
  if (req.url.startsWith('http')) return next(req);
  // Skip static asset paths (i18n, images, etc.)
  if (req.url.startsWith('/assets/') || req.url.startsWith('assets/')) return next(req);

  return next(req.clone({ url: `${environment.apiUrl}${req.url}` }));
};
