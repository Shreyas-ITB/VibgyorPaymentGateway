import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillingCycleToggleComponent } from './billing-cycle-toggle.component';

describe('BillingCycleToggleComponent', () => {
  let component: BillingCycleToggleComponent;
  let fixture: ComponentFixture<BillingCycleToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingCycleToggleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BillingCycleToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Handling', () => {
    it('should default to monthly cycle', () => {
      expect(component.selectedCycle).toBe('monthly');
    });

    it('should accept monthly as selectedCycle input', () => {
      component.selectedCycle = 'monthly';
      fixture.detectChanges();
      expect(component.selectedCycle).toBe('monthly');
    });

    it('should accept annual as selectedCycle input', () => {
      component.selectedCycle = 'annual';
      fixture.detectChanges();
      expect(component.selectedCycle).toBe('annual');
    });
  });

  describe('Toggle UI', () => {
    it('should render monthly button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons[0].textContent?.trim()).toBe('Monthly');
    });

    it('should render annual button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons[1].textContent?.trim()).toBe('Annual');
    });

    it('should highlight monthly button when monthly is selected', () => {
      component.selectedCycle = 'monthly';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const monthlyButton = compiled.querySelectorAll('button')[0];
      expect(monthlyButton.classList.contains('bg-white')).toBe(true);
      expect(monthlyButton.classList.contains('shadow-md')).toBe(true);
    });

    it('should highlight annual button when annual is selected', () => {
      component.selectedCycle = 'annual';
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const annualButton = compiled.querySelectorAll('button')[1];
      expect(annualButton.classList.contains('bg-white')).toBe(true);
      expect(annualButton.classList.contains('shadow-md')).toBe(true);
    });
  });

  describe('Tailwind Styling', () => {
    it('should have rounded-full class on container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('div');
      expect(container?.classList.contains('rounded-full')).toBe(true);
    });

    it('should have flex layout', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('div');
      expect(container?.classList.contains('flex')).toBe(true);
    });

    it('should have background color classes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('div');
      expect(container?.classList.contains('bg-gray-200')).toBe(true);
      expect(container?.classList.contains('dark:bg-gray-700')).toBe(true);
    });

    it('should have rounded-full class on buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('button');
      expect(buttons[0].classList.contains('rounded-full')).toBe(true);
      expect(buttons[1].classList.contains('rounded-full')).toBe(true);
    });
  });

  describe('Event Emissions', () => {
    it('should emit cycleChanged event with "monthly" when monthly button is clicked', () => {
      component.selectedCycle = 'annual';
      fixture.detectChanges();

      let emittedCycle: 'monthly' | 'annual' | undefined;
      component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
        emittedCycle = cycle;
      });

      component.onToggle('monthly');
      expect(emittedCycle).toBe('monthly');
    });

    it('should emit cycleChanged event with "annual" when annual button is clicked', () => {
      component.selectedCycle = 'monthly';
      fixture.detectChanges();

      let emittedCycle: 'monthly' | 'annual' | undefined;
      component.cycleChanged.subscribe((cycle: 'monthly' | 'annual') => {
        emittedCycle = cycle;
      });

      component.onToggle('annual');
      expect(emittedCycle).toBe('annual');
    });

    it('should not emit event when clicking already selected cycle', () => {
      component.selectedCycle = 'monthly';
      fixture.detectChanges();

      let eventEmitted = false;
      component.cycleChanged.subscribe(() => {
        eventEmitted = true;
      });

      component.onToggle('monthly');
      expect(eventEmitted).toBe(false);
    });
  });

  describe('Button Click Handling', () => {
    it('should call onToggle with "monthly" when monthly button is clicked', () => {
      const spy = jest.spyOn(component, 'onToggle');
      const compiled = fixture.nativeElement as HTMLElement;
      const monthlyButton = compiled.querySelectorAll('button')[0] as HTMLButtonElement;
      
      monthlyButton.click();
      expect(spy).toHaveBeenCalledWith('monthly');
    });

    it('should call onToggle with "annual" when annual button is clicked', () => {
      const spy = jest.spyOn(component, 'onToggle');
      const compiled = fixture.nativeElement as HTMLElement;
      const annualButton = compiled.querySelectorAll('button')[1] as HTMLButtonElement;
      
      annualButton.click();
      expect(spy).toHaveBeenCalledWith('annual');
    });
  });
});
