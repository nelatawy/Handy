import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/enums';

/**
 * Role guard — protects routes by expected role.
 * Attach to route data: { expectedRole: 'user' | 'worker' }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const expected: UserRole = route.data['expectedRole'];
  if (!expected || auth.role() === expected) return true;

  // Wrong role — redirect to their correct home
  return router.createUrlTree([auth.getHomeRoute()]);
};
