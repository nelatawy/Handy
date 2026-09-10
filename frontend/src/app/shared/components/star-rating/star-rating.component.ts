import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="stars"
      [class.stars--interactive]="interactive"
      [attr.aria-label]="'Rating: ' + value + ' out of 5 stars'"
      role="group"
    >
      @for (star of stars; track star) {
        <button
          class="star"
          [class.star--filled]="star <= displayValue()"
          [class.star--half]="!interactive && star - 0.5 <= value && star > value"
          [class.star--large]="size === 'lg'"
          [class.star--small]="size === 'sm'"
          [disabled]="!interactive"
          (click)="interactive && onSelect(star)"
          (mouseenter)="interactive && hoverValue.set(star)"
          (mouseleave)="interactive && hoverValue.set(0)"
          [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
          type="button"
        >★</button>
      }
      @if (showCount && count > 0) {
        <span class="stars__count">({{ count }})</span>
      }
    </div>
  `,
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() count = 0;
  @Input() interactive = false;
  @Input() showCount = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() ratingChange = new EventEmitter<number>();

  protected hoverValue = signal(0);
  protected stars = [1, 2, 3, 4, 5];

  displayValue = computed(() => this.hoverValue() || this.value);

  onSelect(star: number): void {
    this.value = star;
    this.ratingChange.emit(star);
  }
}
