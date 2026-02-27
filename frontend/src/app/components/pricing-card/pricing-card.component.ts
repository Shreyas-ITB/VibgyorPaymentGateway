import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingPlan } from '../../models/pricing.models';

@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-card.component.html',
  styleUrls: ['./pricing-card.component.css']
})
export class PricingCardComponent {
  @Input() plan!: PricingPlan;
  @Input() selectedCycle: 'monthly' | 'annual' = 'monthly';
  @Input() isCustom: boolean = false;

  @Output() planSelected = new EventEmitter<string>();
  @Output() contactClicked = new EventEmitter<void>();

  getPrice(): string {
    if (this.isCustom) {
      return 'Custom';
    }
    const amount = this.selectedCycle === 'monthly' 
      ? this.plan.monthlyAmount 
      : this.plan.annualAmount;
    return `₹${amount.toLocaleString()}`;
  }

  getPricePeriod(): string {
    return this.selectedCycle === 'monthly' ? '/month' : '/year';
  }

  onPurchaseClick(): void {
    this.planSelected.emit(this.plan.plan_id);
  }

  onContactClick(): void {
    this.contactClicked.emit();
  }
}
