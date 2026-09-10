import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { COUNTRIES, Country } from '../../../core/models/geo-data';
import { LanguageService } from '../../../core/services/language.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-country-prefix-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-prefix-dropdown.component.html',
  styleUrl: './country-prefix-dropdown.component.scss',
})
export class CountryPrefixDropdownComponent {
  protected lang = inject(LanguageService);

  @Input() selectedCode = '+20';
  @Output() selectedCodeChange = new EventEmitter<string>();

  protected open = signal(false);
  protected query = '';
  protected countries = COUNTRIES;

  protected selected = computed(() =>
    this.countries.find(c => c.dialCode === this.selectedCode) ?? this.countries[0]
  );

  protected filtered = computed(() => {
    const q = this.query.toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.dialCode.includes(q)
    );
  });

  toggle(): void {
    this.open.update(v => !v);
    if (!this.open()) this.query = '';
  }

  select(country: Country): void {
    this.selectedCode = country.dialCode;
    this.selectedCodeChange.emit(country.dialCode);
    this.open.set(false);
    this.query = '';
  }
}
