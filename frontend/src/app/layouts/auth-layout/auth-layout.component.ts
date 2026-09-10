import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, LanguageSwitcherComponent, TranslatePipe],
  template: `
    <div class="auth-layout">
      <header class="auth-layout__header">
        <a class="auth-layout__brand" routerLink="/">
          <span class="auth-layout__logo">🔧</span>
          <span class="auth-layout__name">{{ 'APP_NAME' | translate }}</span>
        </a>
        <app-language-switcher />
      </header>

      <main class="auth-layout__main">
        <div class="auth-layout__card">
          <router-outlet />
        </div>
      </main>

      <footer class="auth-layout__footer">
        <p>{{ 'APP_TAGLINE' | translate }}</p>
      </footer>
    </div>
  `,
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
