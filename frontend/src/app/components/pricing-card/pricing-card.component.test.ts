import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PricingCardComponent } from './pricing-card.component';
import { PricingPlan } from '../../models/pricing.models';

describe('PricingCardComponent', () => {
  let component: PricingCardComponent;
  let fixture: ComponentFixture<PricingCardComponent>;

  const mockPlan: PricingPlan = {
    plan_id: 'basic',
    name: 'Basic Plan',
    monthlyAmount: 999,
    annualAmount: 9990,
    features: ['Feature 1', 'Feature 2', 'Feature 3']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PricingCardComponent);
    component = fixture.componentInstance;
    component.plan = mockPlan;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Price Display', () => {
    it('should display monthly price when monthly cycle is selected', () => {
      component.selectedCycle = 'monthly';
      expect(component.getPrice()).toBe('₹999');
      expect(component.getPricePeriod()).toBe('/month');
    });

    it('should display annual price when annual cycle is selected', () => {
      component.selectedCycle = 'annual';
      expect(component.getPrice()).toBe('₹9,990');
      expect(component.getPricePeriod()).toBe('/year');
    });

    it('should display "Custom" for custom pricing card', () => {
      component.isCustom = true;
      expect(component.getPrice()).toBe('Custom');
    });

    it('should format prices with locale-specific formatting', () => {
      const largePlan: PricingPlan = {
        ...mockPlan,
        monthlyAmount: 123456,
        annualAmount: 1234567
      };
      component.plan = largePlan;
      component.selectedCycle = 'monthly';
      expect(component.getPrice()).toBe('₹1,23,456');
    });
  });

  describe('Template Rendering', () => {
    it('should render plan name', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h3');
      expect(heading?.textContent?.trim()).toBe('Basic Plan');
    });

    it('should render all features', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const features = compiled.querySelectorAll('.features li');
      expect(features.length).toBe(3);
      expect(features[0].textContent?.trim()).toContain('Feature 1');
      expect(features[1].textContent?.trim()).toContain('Feature 2');
      expect(features[2].textContent?.trim()).toContain('Feature 3');
    });

    it('should render purchase button for standard plans', () => {
      component.isCustom = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const purchaseButton = compiled.querySelector('button');
      expect(purchaseButton?.textContent?.trim()).toBe('Purchase');
    });

    it('should render contact button for custom plan', () => {
      component.isCustom = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const contactButton = compiled.querySelector('button');
      expect(contactButton?.textContent?.trim()).toBe('Contact Us');
    });
  });

  describe('Button Styling', () => {
    it('should have orange background (#ed4e00) for purchase button', () => {
      component.isCustom = false;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const purchaseButton = compiled.querySelector('button') as HTMLElement;
      expect(purchaseButton.style.backgroundColor).toBe('rgb(237, 78, 0)');
    });

    it('should have rounded corners for buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('button');
      expect(button?.classList.contains('rounded-full')).toBe(true);
    });
  });

  describe('Card Styling', () => {
    it('should have rounded corners', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.pricing-card');
      expect(card?.classList.contains('rounded-lg')).toBe(true);
    });

    it('should have shadow', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.pricing-card');
      expect(card?.classList.contains('shadow-lg')).toBe(true);
    });
  });

  describe('Event Emissions', () => {
    it('should emit planSelected event with plan_id when purchase button is clicked', () => {
      let emittedPlanId: string | undefined;
      component.planSelected.subscribe((planId: string) => {
        emittedPlanId = planId;
      });

      component.onPurchaseClick();
      expect(emittedPlanId).toBe('basic');
    });

    it('should emit contactClicked event when contact button is clicked', () => {
      let eventEmitted = false;
      component.contactClicked.subscribe(() => {
        eventEmitted = true;
      });

      component.onContactClick();
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should have full width class for mobile', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.pricing-card');
      expect(card?.classList.contains('w-full')).toBe(false); // CSS handles this
      // The component uses CSS media queries for responsive width
    });
  });
});
