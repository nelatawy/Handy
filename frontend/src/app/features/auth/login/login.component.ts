import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IdentifierType } from '../../../core/models/enums';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  protected IdentifierType = IdentifierType;
  protected identifierType = signal<IdentifierType>(IdentifierType.Username);
  protected showPw = signal(false);
  protected loading = signal(false);
  protected serverError = signal('');

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  form = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  identifierLabel = () =>
    this.identifierType() === IdentifierType.Username
      ? 'AUTH.IDENTIFIER_USERNAME'
      : 'AUTH.IDENTIFIER_PHONE';

  identifierPlaceholder = () =>
    this.identifierType() === IdentifierType.Username
      ? 'AUTH.IDENTIFIER_PLACEHOLDER_USERNAME'
      : 'AUTH.IDENTIFIER_PLACEHOLDER_PHONE';

  setIdentifierType(type: IdentifierType): void {
    this.identifierType.set(type);
    this.form.get('identifier')?.reset('');
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set('');

    this.auth.login({
      identifierType: this.identifierType(),
      identifier: this.form.value.identifier!,
      password: this.form.value.password!,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getHomeRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'AUTH.ERRORS.INVALID_CREDENTIALS';
        this.serverError.set(msg);
      },
    });
  }
}
