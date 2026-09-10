import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { WORK_TYPES, WorkType } from '../../../core/models/enums';
import { AiSuggestResponse } from '../../../core/models/models';
import { RequestService } from '../../../core/services/request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-make-request',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, ImageUploadComponent],
  templateUrl: './make-request.component.html',
  styleUrl: './make-request.component.scss',
})
export class MakeRequestComponent {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private requestSvc = inject(RequestService);
  private notify     = inject(NotificationService);

  readonly workTypes = WORK_TYPES;

  form = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(20)]],
    workType:    ['', Validators.required],
  });

  /** Uploaded image public URLs */
  uploadedUrls = signal<string[]>([]);

  /** AI suggestion flow */
  aiLoading     = signal(false);
  aiSuggestion  = signal<AiSuggestResponse | null>(null);

  /** Submission state */
  submitting = signal(false);

  get desc() { return this.form.get('description')!; }
  get wt()   { return this.form.get('workType')!; }

  /** Called by ImageUploadComponent when files change */
  onImagesChange(urls: string[]): void {
    this.uploadedUrls.set(urls);
  }

  onAiSuggest(): void {
    const description = this.desc.value?.trim();
    if (!description) {
      this.notify.warning('REQUEST.AI_SUGGEST_NEEDS_DESCRIPTION');
      return;
    }
    this.aiLoading.set(true);
    this.aiSuggestion.set(null);
    this.requestSvc.aiSuggest(description).pipe(
      finalize(() => this.aiLoading.set(false)),
    ).subscribe({
      next:  (res) => this.aiSuggestion.set(res),
      error: ()    => this.notify.error('TOAST.AI_SUGGEST_FAILED'),
    });
  }

  acceptAiSuggestion(): void {
    const s = this.aiSuggestion();
    if (!s) return;
    this.form.patchValue({ description: s.suggestedDescription, workType: s.recommendedWorkType });
    this.aiSuggestion.set(null);
  }

  dismissAiSuggestion(): void {
    this.aiSuggestion.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);

    const body = {
      description: this.desc.value!.trim(),
      workType:    this.wt.value as WorkType,
      imageUrls:   this.uploadedUrls(),
    };

    this.requestSvc.createRequest(body).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: (res) => {
        this.notify.success('TOAST.REQUEST_POSTED');
        this.router.navigate(['/user/request', res.requestId, 'offers']);
      },
      error: () => this.notify.error('TOAST.REQUEST_POST_FAILED'),
    });
  }

  onCancel(): void {
    this.router.navigate(['/user/home']);
  }
}
