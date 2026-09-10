import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="lang-btn"
      (click)="lang.toggle()"
      [attr.aria-label]="lang.currentLang() === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'"
      title="Switch language"
    >
      <span class="lang-btn__flag">{{ lang.currentLang() === 'en' ? '🇪🇬' : '🇬🇧' }}</span>
      <span class="lang-btn__label">{{ lang.currentLang() === 'en' ? 'العربية' : 'English' }}</span>
    </button>
  `,
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  protected lang = inject(LanguageService);
}
