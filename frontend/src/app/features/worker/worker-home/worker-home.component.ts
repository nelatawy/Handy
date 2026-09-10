import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-worker-home',
  standalone: true,
  imports: [TranslatePipe],
  template: `<div class="page-stub"><h1>Worker Home</h1><p>Coming soon...</p></div>`,
  styles: [`.page-stub { padding: 2rem; text-align: center; }`],
})
export class WorkerHomeComponent {}
