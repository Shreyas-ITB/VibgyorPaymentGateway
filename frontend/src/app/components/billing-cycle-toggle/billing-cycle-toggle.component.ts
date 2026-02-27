import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-billing-cycle-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing-cycle-toggle.component.html',
  styleUrls: ['./billing-cycle-toggle.component.css']
})
export class BillingCycleToggleComponent {
  @Input() selectedCycle: 'monthly' | 'annual' = 'monthly';
  @Output() cycleChanged = new EventEmitter<'monthly' | 'annual'>();

  onToggle(cycle: 'monthly' | 'annual'): void {
    if (cycle !== this.selectedCycle) {
      this.cycleChanged.emit(cycle);
    }
  }
}
