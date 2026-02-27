import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddonPackage } from '../../models/pricing.models';

@Component({
  selector: 'app-addon-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './addon-card.component.html',
  styleUrls: ['./addon-card.component.css']
})
export class AddonCardComponent {
  @Input() addon!: AddonPackage;
  @Input() selectedCycle: 'monthly' | 'annual' = 'monthly';
  @Input() isSelected: boolean = false;

  @Output() addonToggled = new EventEmitter<string>();

  getPrice(): string {
    const amount = this.selectedCycle === 'monthly' 
      ? this.addon.monthlyAmount 
      : this.addon.annualAmount;
    return `₹${amount.toLocaleString()}`;
  }

  getPricePeriod(): string {
    return this.selectedCycle === 'monthly' ? '/month' : '/year';
  }

  onToggle(): void {
    this.addonToggled.emit(this.addon.addon_id);
  }
}
