import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { ProfileService, UpdateUserProfileBody } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/models';
import { LucideAlertTriangle, LucidePencil } from '@lucide/angular';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, LucideAlertTriangle, LucidePencil],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private notify     = inject(NotificationService);
  private auth       = inject(AuthService);
  private fb         = inject(FormBuilder);

  readonly loading  = signal(true);
  readonly error    = signal(false);
  readonly saving   = signal(false);
  readonly editMode = signal(false);
  readonly user     = signal<User | null>(null);

  /** Avatar initials from username */
  readonly initials = computed(() =>
    (this.user()?.username ?? '').slice(0, 2).toUpperCase()
  );

  /**
   * Mask phone: show first 4 and last 2 chars, replace middle with ****
   * e.g. +20123456789 → +201*****89
   */
  readonly maskedPhone = computed(() => {
    const p = this.user()?.phone ?? '';
    if (p.length <= 6) return p;
    return p.slice(0, 4) + '*'.repeat(p.length - 6) + p.slice(-2);
  });

  form!: FormGroup;

  ngOnInit(): void {
    this.profileSvc.getUserProfile().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (u) => {
        this.user.set(u);
        this._buildForm(u);
      },
      error: () => {
        this.error.set(true);
        this.notify.error('TOAST.PROFILE_LOAD_FAILED');
      },
    });
  }

  private _buildForm(u: User): void {
    this.form = this.fb.group({
      username:    [u.username,    [Validators.required, Validators.minLength(3)]],
      country:     [u.country,     [Validators.required]],
      governorate: [u.governorate, [Validators.required]],
    });
  }

  enterEditMode(): void {
    const u = this.user();
    if (u) this._buildForm(u);
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
  }

  saveProfile(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    const body: UpdateUserProfileBody = {
      username:    this.form.value.username,
      country:     this.form.value.country,
      governorate: this.form.value.governorate,
    };

    this.profileSvc.updateUserProfile(body).pipe(
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.editMode.set(false);
        this.notify.success('TOAST.PROFILE_UPDATED');
      },
      error: () => this.notify.error('TOAST.PROFILE_SAVE_FAILED'),
    });
  }
}
