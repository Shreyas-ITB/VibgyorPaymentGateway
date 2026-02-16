import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingPageComponent } from './pages/pricing-page/pricing-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PricingPageComponent],
  template: `
    <app-pricing-page></app-pricing-page>
  `,
  styles: []
})
export class AppComponent {
  title = 'Vibgyor Payment Gateway';
}
