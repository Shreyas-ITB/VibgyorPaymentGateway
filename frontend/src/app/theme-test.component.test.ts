/**
 * Unit test for theme test component
 * Task 7.1: Configure Tailwind CSS with theme support
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeTestComponent } from './theme-test.component';

describe('ThemeTestComponent', () => {
  let component: ThemeTestComponent;
  let fixture: ComponentFixture<ThemeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeTestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render primary button with correct class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const primaryButton = compiled.querySelector('.btn-primary');
    expect(primaryButton).toBeTruthy();
    expect(primaryButton?.textContent).toContain('Primary Button');
  });

  it('should render secondary button with correct class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const secondaryButton = compiled.querySelector('.btn-secondary');
    expect(secondaryButton).toBeTruthy();
    expect(secondaryButton?.textContent).toContain('Secondary Button');
  });

  it('should render cards with card class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should render input with input class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('.input');
    expect(input).toBeTruthy();
  });

  it('should display all primary color shades', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const colorBoxes = compiled.querySelectorAll('[class*="bg-primary-"]');
    expect(colorBoxes.length).toBe(10); // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
  });
});
