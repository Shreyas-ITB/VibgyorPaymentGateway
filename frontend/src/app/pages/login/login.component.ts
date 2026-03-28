import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;
  currentYear: number = new Date().getFullYear();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Redirect to dashboard if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/admindash']);
    }
  }

  /**
   * Handle login form submission
   */
  login(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Simulate API call delay
    setTimeout(() => {
      const result = this.authService.login({
        username: this.username,
        password: this.password
      });

      this.isLoading = false;

      if (result.success) {
        console.log('Login successful');
        this.router.navigate(['/admindash']);
      } else {
        this.errorMessage = result.message;
      }
    }, 800);
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle Enter key press
   */
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}

