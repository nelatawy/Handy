import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  readonly lang   = inject(LanguageService);

  /** Feature cards — all text is driven through translation keys */
  readonly featureKeys = [
    { emoji: '📸', titleKey: 'LANDING.FEAT0_TITLE', descKey: 'LANDING.FEAT0_DESC' },
    { emoji: '⚡', titleKey: 'LANDING.FEAT1_TITLE', descKey: 'LANDING.FEAT1_DESC' },
    { emoji: '⭐', titleKey: 'LANDING.FEAT2_TITLE', descKey: 'LANDING.FEAT2_DESC' },
    { emoji: '💳', titleKey: 'LANDING.FEAT3_TITLE', descKey: 'LANDING.FEAT3_DESC' },
    { emoji: '🛠️', titleKey: 'LANDING.FEAT4_TITLE', descKey: 'LANDING.FEAT4_DESC' },
    { emoji: '🔔', titleKey: 'LANDING.FEAT5_TITLE', descKey: 'LANDING.FEAT5_DESC' },
  ];

  /** All 14 worker types with emoji icons */
  readonly workerTypes = [
    { emoji: '🔧', key: 'WORK_TYPE.plumber' },
    { emoji: '⚡', key: 'WORK_TYPE.electrician' },
    { emoji: '🪵', key: 'WORK_TYPE.carpenter' },
    { emoji: '💻', key: 'WORK_TYPE.it' },
    { emoji: '❄️', key: 'WORK_TYPE.ac_technician' },
    { emoji: '🎨', key: 'WORK_TYPE.painter' },
    { emoji: '🪟', key: 'WORK_TYPE.alumetal' },
    { emoji: '🔌', key: 'WORK_TYPE.appliance_repair' },
    { emoji: '📡', key: 'WORK_TYPE.satellite' },
    { emoji: '🪣', key: 'WORK_TYPE.tiler' },
    { emoji: '⚙️', key: 'WORK_TYPE.welder' },
    { emoji: '🧹', key: 'WORK_TYPE.cleaner' },
    { emoji: '🐛', key: 'WORK_TYPE.pest_control' },
    { emoji: '🚗', key: 'WORK_TYPE.car_mechanic' },
  ];

  readonly workerBulletKeys = [
    'LANDING.WORKER_BULLET1',
    'LANDING.WORKER_BULLET2',
    'LANDING.WORKER_BULLET3',
    'LANDING.WORKER_BULLET4',
  ];

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    // Add .landing-init BEFORE hiding elements so first paint is always visible
    setTimeout(() => {
      const root = document.querySelector('.landing');
      root?.classList.add('landing-init');

      // Immediately reveal above-fold elements; observe the rest
      document.querySelectorAll('.reveal').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('revealed');
        } else {
          this.observer?.observe(el);
        }
      });
    }, 60);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  toggleLang(): void {
    this.lang.toggle();
    // Re-run observer after language toggle re-renders DOM
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('revealed');
        } else {
          this.observer?.observe(el);
        }
      });
    }, 80);
  }

  goLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
