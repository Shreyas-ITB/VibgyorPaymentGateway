/**
 * Test file to verify Tailwind CSS configuration
 * Task 7.1: Configure Tailwind CSS with theme support
 * Requirements: 4.1, 4.2, 4.3
 */

// @ts-ignore - Tailwind config is a JS file
import tailwindConfig from '../tailwind.config.js';

describe('Tailwind CSS Configuration', () => {
  // Type assertion to access the config properly
  const config = tailwindConfig as any;

  test('should have media dark mode strategy for system preference detection', () => {
    // Validates Requirement 4.1, 4.2, 4.3, 4.4
    expect(config.darkMode).toBe('media');
  });

  test('should have primary orange color configured as #ed4e00', () => {
    // Validates Requirement 2.5
    expect(config.theme?.extend?.colors?.primary?.DEFAULT).toBe('#ed4e00');
    expect(config.theme?.extend?.colors?.primary?.['500']).toBe('#ed4e00');
  });

  test('should have primary color shades for design flexibility', () => {
    const primary = config.theme?.extend?.colors?.primary;
    expect(primary?.['50']).toBeDefined();
    expect(primary?.['100']).toBeDefined();
    expect(primary?.['200']).toBeDefined();
    expect(primary?.['300']).toBeDefined();
    expect(primary?.['400']).toBeDefined();
    expect(primary?.['500']).toBeDefined();
    expect(primary?.['600']).toBeDefined();
    expect(primary?.['700']).toBeDefined();
    expect(primary?.['800']).toBeDefined();
    expect(primary?.['900']).toBeDefined();
  });

  test('should have background colors for light and dark themes', () => {
    // Validates Requirement 4.2, 4.3
    expect(config.theme?.extend?.colors?.background?.light).toBe('#ffffff');
    expect(config.theme?.extend?.colors?.background?.dark).toBe('#111827');
  });

  test('should have surface colors for light and dark themes', () => {
    // Validates Requirement 4.2, 4.3
    expect(config.theme?.extend?.colors?.surface?.light).toBe('#f9fafb');
    expect(config.theme?.extend?.colors?.surface?.dark).toBe('#1f2937');
  });

  test('should have custom card border radius for modern design', () => {
    // Validates Requirement 2.4
    expect(config.theme?.extend?.borderRadius?.card).toBe('0.75rem');
  });

  test('should scan correct content paths for Tailwind classes', () => {
    expect(config.content).toContain('./index.html');
    expect(config.content).toContain('./src/**/*.{html,ts}');
  });
});
