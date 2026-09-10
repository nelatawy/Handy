import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { CountryPrefixDropdownComponent } from '../country-prefix-dropdown/country-prefix-dropdown.component';

export interface OtpResult {
  phone: string; // E.164 formatted
  verified: boolean;
}

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CountryPrefixDropdownComponent],
  templateUrl: './otp-verification.component.html',
  styleUrl: './otp-verification.component.scss',
})
export class OtpVerificationComponent {
  /** If provided, the phone field is hidden and this value is used directly (E.164) */
  @Input() prefilledPhone?: string;
  /** dial code from parent (e.g. '+20'). If phoneFixed=true this is also pre-set */
  @Input() phoneFixed = false;

  @Output() verified = new EventEmitter<OtpResult>();

  private http = inject(HttpClient);

  step = signal<'phone' | 'sending' | 'code' | 'verifying' | 'error' | 'verified'>('phone');
  channel = signal<'whatsapp' | 'telegram'>('whatsapp');
  telegramLink = signal<string | null>(null);
  errorMsg = signal('');

  dialCode = '+20';
  localPhone = '';
  code = '';

  get e164Phone(): string {
    if (this.prefilledPhone) return this.prefilledPhone;
    const digits = this.localPhone.replace(/\D/g, '');
    return `${this.dialCode}${digits}`;
  }

  onDialChange(): void {
    // reset if user changes dial code after sending
    if (this.step() !== 'phone') this.reset();
  }

  sendOtp(): void {
    this.step.set('sending');
    this.http.post<{ channel: 'whatsapp' | 'telegram'; telegramLink?: string }>(
      '/otp/send',
      { phone: this.e164Phone }
    ).subscribe({
      next: res => {
        this.channel.set(res.channel);
        this.telegramLink.set(res.telegramLink ?? null);
        this.step.set('code');
      },
      error: () => {
        this.errorMsg.set('Failed to send OTP. Please check your number.');
        this.step.set('error');
      },
    });
  }

  verifyOtp(): void {
    this.step.set('verifying');
    this.http.post<{ verified: boolean }>(
      '/otp/verify',
      { phone: this.e164Phone, code: this.code }
    ).subscribe({
      next: res => {
        if (res.verified) {
          this.step.set('verified');
          this.verified.emit({ phone: this.e164Phone, verified: true });
        } else {
          this.errorMsg.set('Invalid or expired code');
          this.step.set('error');
        }
      },
      error: () => {
        this.errorMsg.set('Invalid or expired code');
        this.step.set('error');
      },
    });
  }

  reset(): void {
    this.step.set('phone');
    this.code = '';
    this.errorMsg.set('');
    this.telegramLink.set(null);
  }
}
