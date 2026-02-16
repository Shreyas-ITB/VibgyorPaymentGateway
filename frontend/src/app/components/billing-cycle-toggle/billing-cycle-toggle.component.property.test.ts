/**
 * Property-based tests for BillingCycleToggleComponent
 * Feature: vibgyor-payment-gateway, Property 4: Billing Cycle Toggle Preserves Features
 * Feature: vibgyor-payment-gateway, Property 5: Billing Cycle Persistence
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import * as fc from 'fast-check';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillingCycleToggleComponent } from './billing-cycle-toggle.component';

describe('BillingCycleToggleComponent - Property Tests', () => {
  let component: BillingCycleToggleComponent;
  let fixture: ComponentFixture<BillingCycleToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingCycleToggleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BillingCycleToggleComponent);
    component = fixture.componentInstance;
  });

  /**
   * Arbitrary generator for billing cycles
   */
  const billingCycleArbitrary = () =>
    fc.constantFrom('monthly' as const, 'annual' as const);

  /**
   * Property 4: Billing Cycle Toggle Preserves Features
   * 
   * For any billing cycle selection, toggling the cycle should emit the new cycle value
   * without modifying any other component state or behavior.
   * 
   * This property verifies:
   * 1. Toggle emits the correct new cycle value
   * 2. Component state is updated correctly
   * 3. Toggle UI reflects the new selection
   * 
   * **Validates: Requirements 3.2, 3.3**
   */
  describe('Property 4: Billing Cycle Toggle Preserves Features', () => {
    it('should emit correct cycle when toggling from any initial cycle', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          billingCycleArbitrary(),
          (initialCycle: 'monthly' | 'annual', targetCycle: 'monthly' | 'annual') => {
            // Set initial cycle
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            let emittedCycle: 'monthly' | 'annual' | undefined;
            component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
              emittedCycle = cycle;
            });

            // Toggle to target cycle
            component.onToggle(targetCycle);

            // If cycles are different, event should be emitted
            if (initialCycle !== targetCycle) {
              expect(emittedCycle).toBe(targetCycle);
            } else {
              // If same cycle, no event should be emitted
              expect(emittedCycle).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only emit event when cycle actually changes', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            let eventCount = 0;
            component.cycleChanged.subscribe(() => {
              eventCount++;
            });

            // Click the same cycle multiple times
            component.onToggle(cycle);
            component.onToggle(cycle);
            component.onToggle(cycle);

            // No events should be emitted
            expect(eventCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit monthly when toggling from annual to monthly', () => {
      fc.assert(
        fc.property(
          fc.constant('annual' as const),
          (initialCycle: 'annual') => {
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            let emittedCycle: 'monthly' | 'annual' | undefined;
            component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
              emittedCycle = cycle;
            });

            component.onToggle('monthly');
            expect(emittedCycle).toBe('monthly');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit annual when toggling from monthly to annual', () => {
      fc.assert(
        fc.property(
          fc.constant('monthly' as const),
          (initialCycle: 'monthly') => {
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            let emittedCycle: 'monthly' | 'annual' | undefined;
            component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
              emittedCycle = cycle;
            });

            component.onToggle('annual');
            expect(emittedCycle).toBe('annual');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Billing Cycle Persistence
   * 
   * For any billing cycle selection, the selected cycle should remain unchanged
   * throughout the session unless explicitly toggled.
   * 
   * This property verifies:
   * 1. Selected cycle persists after component initialization
   * 2. UI correctly reflects the persisted selection
   * 3. Multiple interactions don't change the selection unless toggled
   * 4. Selection persists across component lifecycle (destroy/recreate)
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 5: Billing Cycle Persistence', () => {
    it('should maintain selected cycle after initialization', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            // Verify cycle persists
            expect(component.selectedCycle).toBe(cycle);

            // Verify UI reflects the selection
            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');
            
            if (cycle === 'monthly') {
              expect(buttons[0].classList.contains('bg-white')).toBe(true);
              expect(buttons[0].classList.contains('shadow-md')).toBe(true);
            } else {
              expect(buttons[1].classList.contains('bg-white')).toBe(true);
              expect(buttons[1].classList.contains('shadow-md')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not change selection when clicking already selected cycle', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          fc.integer({ min: 1, max: 10 }),
          (cycle: 'monthly' | 'annual', clickCount: number) => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            let eventCount = 0;
            component.cycleChanged.subscribe(() => {
              eventCount++;
            });

            // Click the same cycle multiple times
            for (let i = 0; i < clickCount; i++) {
              component.onToggle(cycle);
            }

            // Selection should remain unchanged
            expect(component.selectedCycle).toBe(cycle);
            // No events should be emitted
            expect(eventCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist selection across multiple UI interactions', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (initialCycle: 'monthly' | 'annual') => {
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            // Simulate multiple UI interactions without toggling
            const compiled = fixture.nativeElement as HTMLElement;
            const container = compiled.querySelector('div');
            
            // Trigger various events that shouldn't change the selection
            container?.dispatchEvent(new Event('mouseenter'));
            container?.dispatchEvent(new Event('mouseleave'));
            fixture.detectChanges();

            // Selection should remain unchanged
            expect(component.selectedCycle).toBe(initialCycle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly update and persist after a valid toggle', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (initialCycle: 'monthly' | 'annual') => {
            const targetCycle = initialCycle === 'monthly' ? 'annual' : 'monthly';
            
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            let emittedCycle: 'monthly' | 'annual' | undefined;
            component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
              emittedCycle = cycle;
              // Simulate parent component updating the input
              component.selectedCycle = cycle;
            });

            // Toggle to opposite cycle
            component.onToggle(targetCycle);
            fixture.detectChanges();

            // Verify event was emitted
            expect(emittedCycle).toBe(targetCycle);
            
            // Verify new selection persists
            expect(component.selectedCycle).toBe(targetCycle);

            // Verify UI reflects new selection
            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');
            
            if (targetCycle === 'monthly') {
              expect(buttons[0].classList.contains('bg-white')).toBe(true);
              expect(buttons[0].classList.contains('shadow-md')).toBe(true);
            } else {
              expect(buttons[1].classList.contains('bg-white')).toBe(true);
              expect(buttons[1].classList.contains('shadow-md')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist selection across component lifecycle (destroy and recreate)', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            // Set initial cycle
            component.selectedCycle = cycle;
            fixture.detectChanges();

            // Verify initial state
            expect(component.selectedCycle).toBe(cycle);

            // Simulate component destruction and recreation
            // In a real application, the parent component would maintain this state
            const savedCycle = component.selectedCycle;
            
            // Destroy the component
            fixture.destroy();

            // Recreate the component
            fixture = TestBed.createComponent(BillingCycleToggleComponent);
            component = fixture.componentInstance;
            
            // Restore the saved cycle (simulating parent component passing the persisted value)
            component.selectedCycle = savedCycle;
            fixture.detectChanges();

            // Verify the cycle persisted through the lifecycle
            expect(component.selectedCycle).toBe(cycle);

            // Verify UI reflects the persisted selection
            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');
            
            if (cycle === 'monthly') {
              expect(buttons[0].classList.contains('bg-white')).toBe(true);
              expect(buttons[0].classList.contains('shadow-md')).toBe(true);
            } else {
              expect(buttons[1].classList.contains('bg-white')).toBe(true);
              expect(buttons[1].classList.contains('shadow-md')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain selection through multiple toggle sequences', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          fc.array(billingCycleArbitrary(), { minLength: 1, maxLength: 10 }),
          (initialCycle: 'monthly' | 'annual', toggleSequence: ('monthly' | 'annual')[]) => {
            // Set initial cycle
            component.selectedCycle = initialCycle;
            fixture.detectChanges();

            let currentCycle = initialCycle;

            // Subscribe to cycle changes
            component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
              currentCycle = cycle;
              component.selectedCycle = cycle;
            });

            // Apply toggle sequence
            for (const targetCycle of toggleSequence) {
              component.onToggle(targetCycle);
              fixture.detectChanges();
            }

            // Verify the final state is consistent
            expect(component.selectedCycle).toBe(currentCycle);

            // Verify UI reflects the final selection
            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');
            
            if (currentCycle === 'monthly') {
              expect(buttons[0].classList.contains('bg-white')).toBe(true);
              expect(buttons[0].classList.contains('shadow-md')).toBe(true);
            } else {
              expect(buttons[1].classList.contains('bg-white')).toBe(true);
              expect(buttons[1].classList.contains('shadow-md')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Toggle UI Consistency
   * 
   * For any billing cycle selection, the toggle UI should always display both options
   * and correctly highlight the selected option.
   */
  describe('Toggle UI Consistency', () => {
    it('should always render both monthly and annual buttons', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');

            // Should always have exactly 2 buttons
            expect(buttons.length).toBe(2);
            
            // Verify button labels
            expect(buttons[0].textContent?.trim()).toBe('Monthly');
            expect(buttons[1].textContent?.trim()).toBe('Annual');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should highlight exactly one button at a time', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');

            // Count buttons with highlight classes
            let highlightedCount = 0;
            buttons.forEach(button => {
              if (button.classList.contains('bg-white') && button.classList.contains('shadow-md')) {
                highlightedCount++;
              }
            });

            // Exactly one button should be highlighted
            expect(highlightedCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply correct styling classes to selected button', () => {
      fc.assert(
        fc.property(
          billingCycleArbitrary(),
          (cycle: 'monthly' | 'annual') => {
            component.selectedCycle = cycle;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const buttons = compiled.querySelectorAll('button');
            const selectedButton = cycle === 'monthly' ? buttons[0] : buttons[1];

            // Selected button should have highlight classes
            expect(selectedButton.classList.contains('bg-white')).toBe(true);
            expect(selectedButton.classList.contains('shadow-md')).toBe(true);
            expect(selectedButton.classList.contains('rounded-full')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
