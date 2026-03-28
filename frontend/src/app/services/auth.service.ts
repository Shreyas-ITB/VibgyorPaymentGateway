import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface LoginCredentials {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'admin_auth_token';
  private readonly TOKEN_EXPIRY_KEY = 'admin_token_expiry';
  private readonly TOKEN_EXPIRY_HOURS = 72;

  // Get credentials from environment configuration
  private readonly ADMIN_USERNAME = environment.adminUsername;
  private readonly ADMIN_PASSWORD = environment.adminPassword;

  constructor(private router: Router) {}

  /**
   * Login with username and password
   */
  login(credentials: LoginCredentials): { success: boolean; message: string } {
    // Validate credentials
    if (credentials.username === this.ADMIN_USERNAME && credentials.password === this.ADMIN_PASSWORD) {
      // Generate JWT token (mock implementation)
      const token = this.generateToken(credentials.username);
      const expiresAt = Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      // Store token and expiry
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt.toString());

      return { success: true, message: 'Login successful' };
    }

    return { success: false, message: 'Invalid username or password' };
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (!token || !expiryStr) {
      return false;
    }

    const expiry = parseInt(expiryStr, 10);
    const now = Date.now();

    // Check if token is expired
    if (now > expiry) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    if (this.isAuthenticated()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): Date | null {
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (expiryStr) {
      return new Date(parseInt(expiryStr, 10));
    }
    return null;
  }

  /**
   * Get remaining time until token expires (in hours)
   */
  getRemainingTime(): number {
    const expiry = this.getTokenExpiry();
    if (!expiry) {
      return 0;
    }

    const now = Date.now();
    const remaining = expiry.getTime() - now;
    return Math.max(0, remaining / (60 * 60 * 1000)); // Convert to hours
  }

  /**
   * Generate mock JWT token
   * In production, this would be done by the backend
   */
  private generateToken(username: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      username,
      iat: Date.now(),
      exp: Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    }));
    const signature = btoa(`${header}.${payload}.secret`);
    
    return `${header}.${payload}.${signature}`;
  }
}
