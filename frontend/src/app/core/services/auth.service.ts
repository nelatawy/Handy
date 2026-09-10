import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, TokenPayload } from '../models/models';
import { UserRole } from '../models/enums';

const TOKEN_KEY = 'handy_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isAuthenticated = computed(() => !!this._token());
  readonly token = computed(() => this._token());

  readonly currentUser = computed<TokenPayload | null>(() => {
    const t = this._token();
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload as TokenPayload;
    } catch {
      return null;
    }
  });

  readonly role = computed(() => this.currentUser()?.role ?? null);
  readonly isUser   = computed(() => this.role() === UserRole.User);
  readonly isWorker = computed(() => this.role() === UserRole.Worker);
  readonly userId   = computed(() => this.currentUser()?.sub ?? null);
  readonly username = computed(() => this.currentUser()?.username ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  login(body: { identifierType: string; identifier: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', body).pipe(
      tap(res => this._storeToken(res.token))
    );
  }

  register(body: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/register', body).pipe(
      tap(res => this._storeToken(res.token))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  private _storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  getHomeRoute(): string {
    return this.role() === UserRole.Worker ? '/worker/home' : '/user/home';
  }
}
