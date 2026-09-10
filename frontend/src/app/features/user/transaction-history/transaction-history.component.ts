import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [TranslatePipe],
  template: `<div class="page-stub"><h1>Transaction History</h1><p>Coming soon...</p></div>`,
  styles: [`.page-stub { padding: 2rem; text-align: center; }`],
})
export class TransactionHistoryComponent {}
