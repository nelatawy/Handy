import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

export interface UploadedImage {
  file: File;
  previewUrl: string;
  publicUrl?: string;   // set after upload
  uploading: boolean;
  error?: string;
}

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="upload-wrap">
      <!-- Drop zone -->
      <div
        class="drop-zone"
        [class.drop-zone--over]="dragging()"
        [class.drop-zone--full]="images().length >= MAX_FILES"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        role="button"
        [attr.aria-label]="'REQUEST.IMAGES' | translate"
      >
        <span class="drop-zone__icon">🖼️</span>
        <p class="drop-zone__primary">{{ 'REQUEST.IMAGES' | translate }}</p>
        <p class="drop-zone__hint">{{ 'REQUEST.IMAGES_HINT' | translate }}</p>
        <span class="drop-zone__count">{{ images().length }} / {{ MAX_FILES }}</span>
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        (change)="onFilePick($event)"
      />

      <!-- Preview grid -->
      @if (images().length > 0) {
        <div class="preview-grid">
          @for (img of images(); track img.previewUrl) {
            <div class="preview-item">
              <img [src]="img.previewUrl" [alt]="img.file.name" class="preview-item__img" />

              @if (img.uploading) {
                <div class="preview-item__overlay">
                  <span class="spinner"></span>
                </div>
              }

              @if (img.error) {
                <div class="preview-item__overlay preview-item__overlay--error">
                  <span>⚠</span>
                </div>
              }

              <button
                class="preview-item__remove"
                (click)="remove(img)"
                type="button"
                [attr.aria-label]="'REQUEST.REMOVE_IMAGE' | translate"
              >✕</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './image-upload.component.scss',
})
export class ImageUploadComponent {
  @Output() imagesChange = new EventEmitter<string[]>(); // public URLs

  protected images = signal<UploadedImage[]>([]);
  protected dragging = signal(false);
  protected MAX_FILES = MAX_FILES;

  private notify = inject(NotificationService);
  private supabase: SupabaseClient | null = environment.supabaseBucketUrl
    ? createClient(environment.supabaseBucketUrl, environment.supabaseAnonKey)
    : null;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addFiles(files);
    input.value = '';
  }

  private addFiles(files: File[]): void {
    const current = this.images();
    const remaining = MAX_FILES - current.length;
    if (remaining <= 0) return;

    const toAdd = files.slice(0, remaining).filter(f => {
      if (f.size > MAX_SIZE_BYTES) {
        this.notify.error('REQUEST.ERRORS.IMAGE_TOO_LARGE_NAMED', { name: f.name });
        return false;
      }
      return true;
    });

    toAdd.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      const entry: UploadedImage = { file, previewUrl, uploading: true };
      this.images.update(list => [...list, entry]);
      this.uploadFile(entry);
    });
  }

  private async uploadFile(entry: UploadedImage): Promise<void> {
    // If Supabase not configured, use a local object URL as placeholder
    if (!this.supabase) {
      entry.publicUrl = entry.previewUrl;
      entry.uploading = false;
      this.images.update(list => [...list]);
      this.emitUrls();
      return;
    }

    const path = `requests/${Date.now()}_${entry.file.name}`;
    const { data, error } = await this.supabase.storage
      .from('handy-images')
      .upload(path, entry.file, { upsert: false });

    if (error || !data) {
      entry.uploading = false;
      entry.error = error?.message;
      this.images.update(list => [...list]);
      return;
    }

    const { data: urlData } = this.supabase.storage
      .from('handy-images')
      .getPublicUrl(data.path);

    entry.publicUrl = urlData.publicUrl;
    entry.uploading = false;
    this.images.update(list => [...list]);
    this.emitUrls();
  }

  remove(img: UploadedImage): void {
    URL.revokeObjectURL(img.previewUrl);
    this.images.update(list => list.filter(i => i !== img));
    this.emitUrls();
  }

  private emitUrls(): void {
    const urls = this.images()
      .filter(i => i.publicUrl)
      .map(i => i.publicUrl!);
    this.imagesChange.emit(urls);
  }
}
