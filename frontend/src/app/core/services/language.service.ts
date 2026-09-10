import { Injectable, signal, effect } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'ar';

const LANG_KEY = 'handy_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLang = signal<Language>(
    (localStorage.getItem(LANG_KEY) as Language) ?? 'en'
  );
  readonly isRtl = () => this.currentLang() === 'ar';

  constructor(private translate: TranslateService) {
    // Apply direction and lang whenever signal changes
    effect(() => {
      const lang = this.currentLang();
      this.translate.use(lang);
      localStorage.setItem(LANG_KEY, lang);
      document.documentElement.lang = lang;
      document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    });
  }

  /** Initialize — call once in app startup */
  init(): void {
    const lang = this.currentLang();
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = this.isRtl() ? 'rtl' : 'ltr';
  }

  toggle(): void {
    this.currentLang.update(l => (l === 'en' ? 'ar' : 'en'));
  }

  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
  }
}
