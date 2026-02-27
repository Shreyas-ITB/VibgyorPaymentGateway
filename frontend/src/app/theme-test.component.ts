/**
 * Test component to verify Tailwind CSS theme configuration
 * Task 7.1: Configure Tailwind CSS with theme support
 * This component demonstrates all theme features
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-theme-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen p-8">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Header -->
        <h1 class="text-4xl font-bold text-center mb-8">
          Tailwind CSS Theme Test
        </h1>

        <!-- Primary Color Test -->
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4">Primary Color (#ed4e00)</h2>
          <div class="space-y-4">
            <button class="btn-primary">Primary Button</button>
            <div class="flex gap-2">
              <div class="w-16 h-16 bg-primary-50 rounded"></div>
              <div class="w-16 h-16 bg-primary-100 rounded"></div>
              <div class="w-16 h-16 bg-primary-200 rounded"></div>
              <div class="w-16 h-16 bg-primary-300 rounded"></div>
              <div class="w-16 h-16 bg-primary-400 rounded"></div>
              <div class="w-16 h-16 bg-primary-500 rounded"></div>
              <div class="w-16 h-16 bg-primary-600 rounded"></div>
              <div class="w-16 h-16 bg-primary-700 rounded"></div>
              <div class="w-16 h-16 bg-primary-800 rounded"></div>
              <div class="w-16 h-16 bg-primary-900 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Dark Mode Test -->
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4">Dark Mode Support</h2>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            This text adapts to your system theme preference.
            Try changing your system theme to see it in action!
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-background-light dark:bg-background-dark p-4 rounded">
              <p class="text-sm">Background Color</p>
            </div>
            <div class="bg-surface-light dark:bg-surface-dark p-4 rounded">
              <p class="text-sm">Surface Color</p>
            </div>
          </div>
        </div>

        <!-- Button Styles Test -->
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4">Button Styles</h2>
          <div class="flex gap-4">
            <button class="btn-primary">Primary Button</button>
            <button class="btn-secondary">Secondary Button</button>
          </div>
        </div>

        <!-- Card Border Radius Test -->
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4">Card Border Radius</h2>
          <p class="text-gray-600 dark:text-gray-300">
            This card uses the custom 'rounded-card' class (0.75rem)
          </p>
        </div>

        <!-- Input Styles Test -->
        <div class="card p-6">
          <h2 class="text-2xl font-bold mb-4">Input Styles</h2>
          <input 
            type="text" 
            class="input w-full" 
            placeholder="Test input with theme support"
          />
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ThemeTestComponent {}
