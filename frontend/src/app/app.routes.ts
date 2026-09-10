import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/enums';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: '/user/home', pathMatch: 'full' },

  // Auth (unauthenticated only)
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [noAuthGuard],
    children: [
      { path: 'login',    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Normal User routes
  {
    path: 'user',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: UserRole.User },
    children: [
      { path: 'home',        loadComponent: () => import('./features/user/user-home/user-home.component').then(m => m.UserHomeComponent) },
      { path: 'request/new', loadComponent: () => import('./features/user/make-request/make-request.component').then(m => m.MakeRequestComponent) },
      { path: 'request/:id/offers', loadComponent: () => import('./features/user/live-offers/live-offers.component').then(m => m.LiveOffersComponent) },
      { path: 'job/:id',     loadComponent: () => import('./features/user/active-job/active-job.component').then(m => m.ActiveJobComponent) },
      { path: 'history',     loadComponent: () => import('./features/user/transaction-history/transaction-history.component').then(m => m.TransactionHistoryComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // Worker routes
  {
    path: 'worker',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: UserRole.Worker },
    children: [
      { path: 'home',          loadComponent: () => import('./features/worker/worker-home/worker-home.component').then(m => m.WorkerHomeComponent) },
      { path: 'feed',          loadComponent: () => import('./features/worker/requests-feed/requests-feed.component').then(m => m.RequestsFeedComponent) },
      { path: 'request/:id',   loadComponent: () => import('./features/worker/request-detail/request-detail.component').then(m => m.RequestDetailComponent) },
      { path: 'request/:id/price', loadComponent: () => import('./features/worker/pricing/pricing.component').then(m => m.PricingComponent) },
      { path: 'job/:id',       loadComponent: () => import('./features/worker/active-job/worker-active-job.component').then(m => m.WorkerActiveJobComponent) },
      { path: 'profile',       loadComponent: () => import('./features/worker/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'earnings',      loadComponent: () => import('./features/worker/earnings/earnings.component').then(m => m.EarningsComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // Catch-all
  { path: '**', redirectTo: '/user/home' },
];
