import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [TranslatePipe],
  template: `<div class="page-stub"><h1>Home</h1><p>Coming soon...</p></div>`,
  styles: [`.page-stub { padding: 2rem; text-align: center; }`],
})
export class UserHomeComponent {}
