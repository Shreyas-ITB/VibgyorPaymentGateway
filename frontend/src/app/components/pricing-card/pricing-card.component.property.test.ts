/**
 * Property-based tests for PricingCardComponent
 * Feature: vibgyor-payment-gateway, Property 3: Complete Card Rendering
 * 
 * **Validates: Requirements 2.1, 2.2, 2.6**
 */

import * as fc from 'fast-check';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PricingCardComponent } from './pricing-card.component';
import { PricingPlan } from '../../models/pricing.models';

describe('PricingCardComponent - Property Tests', () => {
  let component: PricingCardComponent;
  let fixture: ComponentFixture<PricingCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PricingCardComponent);
    component = fixture.componentInstance;
  });

  /**
   * Arbitrary generator for valid pricing plans
   * Note: Generates strings with non-whitespace content to match real-world usage
   * where the parser would validate meaningful content
   */
  const validPricingPlanArbitrary = () =>
    fc.record({
      plan_id: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      monthlyAmount: fc.integer({ min: 1, max: 1000000 }),
      annualAmount: fc.integer({ min: 1, max: 10000000 }),
      features: fc.array(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        { minLength: 1, maxLength: 20 }
      )
    });

  /**
   * Arbitrary generator for billing cycles
   */
  const billingCycleArbitrary = () =>
    fc.constantFrom('monthly' as const, 'annual' as const);

  /**
   * Property 3: Complete Card Rendering
   * 
   * For any valid pricing plan, the rendered card HTML should contain the plan name,
   * the current billing cycle amount, all features from the features list, and a purchase button.
   * 
   * This property verifies:
   * 1. Plan name is rendered in the card
   * 2. The correct amount for the selected billing cycle is displayed
   * 3. All features from the features list are rendered
   * 4. A purchase button is present for standard plans
   * 
   * **Validates: Requirements 2.1, 2.2, 2.6**
   */
  describe('Property 3: Complete Card Rendering', () => {
    it('should render all required fields for any valid pricing plan', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            // Set up component with generated plan and cycle
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;

            // 1. Verify plan name is rendered (trimmed for HTML normalization)
            const heading = compiled.querySelector('h3');
            expect(heading).not.toBeNull();
            expect(heading!.textContent?.trim()).toBe(plan.name.trim());

            // 2. Verify correct amount for billing cycle is displayed
            const expectedAmount = cycle === 'monthly' ? plan.monthlyAmount : plan.annualAmount;
            const priceDisplay = compiled.querySelector('.price');
            expect(priceDisplay).not.toBeNull();
            expect(priceDisplay!.textContent).toContain(expectedAmount.toLocaleString());

            // 3. Verify all features are rendered
            const featureElements = compiled.querySelectorAll('.features li');
            expect(featureElements.length).toBe(plan.features.length);
            
            // Check each feature is present (comparing trimmed values since HTML normalizes whitespace)
            plan.features.forEach((feature, index) => {
              const featureText = featureElements[index].textContent?.trim();
              expect(featureText).toContain(feature.trim());
            });

            // 4. Verify purchase button is present
            const purchaseButton = compiled.querySelector('button');
            expect(purchaseButton).not.toBeNull();
            expect(purchaseButton!.textContent?.trim()).toBe('Purchase');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display monthly amount when monthly cycle is selected', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          (plan: PricingPlan) => {
            component.plan = plan;
            component.selectedCycle = 'monthly';
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const priceDisplay = compiled.querySelector('.price');
            
            expect(priceDisplay).not.toBeNull();
            expect(priceDisplay!.textContent).toContain(plan.monthlyAmount.toLocaleString());
            expect(priceDisplay!.textContent).toContain('/month');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display annual amount when annual cycle is selected', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          (plan: PricingPlan) => {
            component.plan = plan;
            component.selectedCycle = 'annual';
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const priceDisplay = compiled.querySelector('.price');
            
            expect(priceDisplay).not.toBeNull();
            expect(priceDisplay!.textContent).toContain(plan.annualAmount.toLocaleString());
            expect(priceDisplay!.textContent).toContain('/year');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve feature order in rendering', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const featureElements = compiled.querySelectorAll('.features li');

            // Verify features are rendered in the same order as the input array
            plan.features.forEach((feature, index) => {
              const featureText = featureElements[index].textContent?.trim();
              expect(featureText).toContain(feature.trim());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render all features without truncation or modification', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const featureElements = compiled.querySelectorAll('.features li');

            // Verify each feature text is present exactly as provided (after HTML normalization)
            plan.features.forEach((feature, index) => {
              const featureText = featureElements[index].textContent?.trim();
              // Feature text should contain the exact feature string (trimmed for HTML whitespace normalization)
              expect(featureText).toContain(feature.trim());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render contact button for custom pricing card', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          (plan: PricingPlan) => {
            component.plan = plan;
            component.selectedCycle = 'monthly';
            component.isCustom = true;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;

            // Verify plan name is still rendered (trimmed for HTML normalization)
            const heading = compiled.querySelector('h3');
            expect(heading).not.toBeNull();
            expect(heading!.textContent?.trim()).toBe(plan.name.trim());

            // Verify "Custom" is displayed instead of amount
            const priceDisplay = compiled.querySelector('.price');
            expect(priceDisplay).not.toBeNull();
            expect(priceDisplay!.textContent).toContain('Custom');

            // Verify all features are still rendered
            const featureElements = compiled.querySelectorAll('.features li');
            expect(featureElements.length).toBe(plan.features.length);

            // Verify contact button is present instead of purchase button
            const contactButton = compiled.querySelector('button');
            expect(contactButton).not.toBeNull();
            expect(contactButton!.textContent?.trim()).toBe('Contact Us');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render card with proper structure for any plan', () => {
      fc.assert(
        fc.property(
          validPricingPlanArbitrary(),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;

            // Verify card container exists
            const card = compiled.querySelector('.pricing-card');
            expect(card).not.toBeNull();

            // Verify all major sections exist
            expect(compiled.querySelector('h3')).not.toBeNull(); // Plan name
            expect(compiled.querySelector('.price')).not.toBeNull(); // Price section
            expect(compiled.querySelector('.features')).not.toBeNull(); // Features list
            expect(compiled.querySelector('button')).not.toBeNull(); // Action button
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle plans with single feature correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            plan_id: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            monthlyAmount: fc.integer({ min: 1, max: 1000000 }),
            annualAmount: fc.integer({ min: 1, max: 10000000 }),
            features: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              { minLength: 1, maxLength: 1 }
            )
          }),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const featureElements = compiled.querySelectorAll('.features li');

            // Should render exactly one feature
            expect(featureElements.length).toBe(1);
            expect(featureElements[0].textContent?.trim()).toContain(plan.features[0].trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle plans with maximum features correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            plan_id: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            monthlyAmount: fc.integer({ min: 1, max: 1000000 }),
            annualAmount: fc.integer({ min: 1, max: 10000000 }),
            features: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              { minLength: 20, maxLength: 20 }
            )
          }),
          billingCycleArbitrary(),
          (plan: PricingPlan, cycle: 'monthly' | 'annual') => {
            component.plan = plan;
            component.selectedCycle = cycle;
            component.isCustom = false;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const featureElements = compiled.querySelectorAll('.features li');

            // Should render all 20 features
            expect(featureElements.length).toBe(20);
            
            // Verify all features are present
            plan.features.forEach((feature, index) => {
              expect(featureElements[index].textContent?.trim()).toContain(feature.trim());
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
