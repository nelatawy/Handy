import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OtpVerificationComponent } from '../../../shared/components/otp-verification/otp-verification.component';
import { CountryPrefixDropdownComponent } from '../../../shared/components/country-prefix-dropdown/country-prefix-dropdown.component';
import { UserRole, WorkType, WORK_TYPES, WorkTypeLabel } from '../../../core/models/enums';
import { COUNTRIES, GOVERNORATES_BY_COUNTRY, getGovernorates } from '../../../core/models/geo-data';

function passwordMatch(ctrl: AbstractControl) {
  const pw = ctrl.get('password')?.value;
  const cpw = ctrl.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe,
    OtpVerificationComponent, CountryPrefixDropdownComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  protected UserRole = UserRole;
  protected WorkTypeLabel = WorkTypeLabel;
  protected workTypes = WORK_TYPES;
  protected countries = COUNTRIES;

  protected role = signal<UserRole>(UserRole.User);
  protected showPw = signal(false);
  protected loading = signal(false);
  protected serverError = signal('');
  protected phoneVerified = signal(false);
  protected phoneBlurred = signal(false);
  protected dialCode = '+20';

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  form = this.fb.group({
    username: ['', Validators.required],
    phone: ['', Validators.required],
    country: ['', Validators.required],
    governorate: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    // Worker-only
    workType: [''],
    bio: [''],
    hasShop: [false],
    shopLocation: [''],
  }, { validators: passwordMatch });

  selectedCountry = computed(() => this.form.get('country')?.value as string);

  governorates = computed(() => getGovernorates(this.selectedCountry()));

  e164Phone = computed(() => {
    const digits = (this.form.get('phone')?.value ?? '').replace(/\D/g, '');
    return `${this.dialCode}${digits}`;
  });

  onPhoneVerified(): void {
    this.phoneVerified.set(true);
  }

  invalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.phoneVerified()) return;

    const isWorker = this.role() === UserRole.Worker;
    if (isWorker && !this.form.value.workType) {
      this.form.get('workType')?.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.serverError.set('');

    const body: Record<string, unknown> = {
      username: this.form.value.username,
      phone: this.e164Phone(),
      country: this.form.value.country,
      governorate: this.form.value.governorate,
      password: this.form.value.password,
      role: this.role(),
    };

    if (isWorker) {
      body['workType'] = this.form.value.workType;
      body['bio'] = this.form.value.bio;
      body['hasShop'] = this.form.value.hasShop;
      body['shopLocation'] = this.form.value.shopLocation;
    }

    this.auth.register(body).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.getHomeRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.serverError.set(err?.error?.message ?? 'AUTH.ERRORS.GENERIC');
      },
    });
  }
}
