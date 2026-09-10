import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="theme-btn"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      title="Toggle theme"
    >
      <span class="theme-btn__icon">{{ theme.isDarkMode() ? '☀️' : '🌙' }}</span>
    </button>
  `,
  styleUrl: './theme-switcher.component.scss',
})
export class ThemeSwitcherComponent {
  protected theme = inject(ThemeService);
}
