import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [TranslatePipe],
  template: `<div class="page-stub"><h1>Earnings</h1><p>Coming soon...</p></div>`,
  styles: [`.page-stub { padding: 2rem; text-align: center; }`],
})
export class EarningsComponent {}
