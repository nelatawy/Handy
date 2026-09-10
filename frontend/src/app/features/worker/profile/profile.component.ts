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

import { ProfileService, UpdateWorkerProfileBody } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Worker } from '../../../core/models/models';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, StarRatingComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private notify     = inject(NotificationService);
  private fb         = inject(FormBuilder);

  readonly loading  = signal(true);
  readonly error    = signal(false);
  readonly saving   = signal(false);
  readonly editMode = signal(false);
  readonly worker   = signal<Worker | null>(null);

  /** Avatar initials derived from worker username */
  readonly initials = computed(() => {
    const name = this.worker()?.username ?? '';
    return name.slice(0, 2).toUpperCase();
  });

  /** Translation key for the worker's work type (e.g. 'WORK_TYPE.plumber') — resolved via the translate pipe in the template */
  readonly workTypeKey = computed(() => {
    const w = this.worker();
    return w ? `WORK_TYPE.${w.workType}` : '';
  });

  form!: FormGroup;

  ngOnInit(): void {
    this.profileSvc.getWorkerProfile().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (w) => {
        this.worker.set(w);
        this._buildForm(w);
      },
      error: () => {
        this.error.set(true);
        this.notify.error('TOAST.PROFILE_LOAD_FAILED');
      },
    });
  }

  /** Build (or reset) the reactive edit form from current worker data */
  private _buildForm(w: Worker): void {
    this.form = this.fb.group({
      bio:          [w.bio ?? ''],
      hasShop:      [w.hasShop ?? false],
      shopLocation: [w.shopLocation ?? ''],
    });

    // Conditionally require shopLocation when hasShop is toggled on
    this.form.get('hasShop')!.valueChanges.subscribe((val: boolean) => {
      const shopCtrl = this.form.get('shopLocation')!;
      if (val) {
        shopCtrl.setValidators([Validators.required]);
      } else {
        shopCtrl.clearValidators();
        shopCtrl.setValue('');
      }
      shopCtrl.updateValueAndValidity();
    });
  }

  enterEditMode(): void {
    const w = this.worker();
    if (w) this._buildForm(w);   // reset to current values
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
  }

  saveProfile(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    const body: UpdateWorkerProfileBody = {
      bio:          this.form.value.bio || undefined,
      hasShop:      this.form.value.hasShop,
      shopLocation: this.form.value.hasShop ? this.form.value.shopLocation : undefined,
    };

    this.profileSvc.updateWorkerProfile(body).pipe(
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: (updated) => {
        this.worker.set(updated);
        this.editMode.set(false);
        this.notify.success('TOAST.PROFILE_UPDATED');
      },
      error: () => this.notify.error('TOAST.PROFILE_SAVE_FAILED'),
    });
  }
}
