import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService, Order as AdminOrder } from '../../services/admin.service';

interface CalendarDay {
  date: Date | null;
  day: number;
  renewals: any[];
}

interface Order {
  id: string;
  status: 'approved' | 'pending' | 'rejected' | 'deactivated';
  planStatus: 'active' | 'dormant' | 'inactive';
  clientDetails: {
    clientName: string;
    businessName: string;
    businessEmail: string;
    businessAddress: string;
    gstin: string;
  };
  planDetails: {
    planType: string;
    startDate: string;
    renewalDate: string;
  };
  paymentDetails: {
    renewalPrice: number;
  };
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  providers: [AdminService],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  orders: Order[] = [];
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    
    this.adminService.getAllCustomers().subscribe({
      next: (customers) => {
        this.orders = this.mapCustomersToOrders(customers);
        console.log('Loaded orders count:', this.orders.length);
        console.log('Sample order renewal dates:', this.orders.slice(0, 3).map(o => ({
          business: o.clientDetails?.businessName,
          renewalDate: o.planDetails?.renewalDate
        })));
        this.generateCalendar();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.orders = [];
        this.generateCalendar();
        this.isLoading = false;
      }
    });
  }

  /**
   * Map API customers to calendar orders
   */
  private mapCustomersToOrders(customers: AdminOrder[]): Order[] {
    return customers.map(customer => {
      // Use subscription.nextRenewal directly as a Date object
      const renewalDate = new Date(customer.renewalDate);
      
      console.log('Mapping customer:', {
        business: customer.businessName,
        renewalDate: customer.renewalDate,
        parsed: renewalDate,
        formatted: this.formatDateToDisplay(renewalDate)
      });
      
      return {
        id: customer.id,
        status: this.mapStatus(customer.status),
        planStatus: (customer.planStatus || 'active') as 'active' | 'dormant' | 'inactive',
        clientDetails: {
          clientName: customer.clientName,
          businessName: customer.businessName,
          businessEmail: customer.businessEmail,
          businessAddress: customer.address,
          gstin: customer.gstNumber
        },
        planDetails: {
          planType: customer.plan,
          startDate: customer.startDate.toISOString().split('T')[0],
          renewalDate: renewalDate.toISOString().split('T')[0] // Store as YYYY-MM-DD
        },
        paymentDetails: {
          renewalPrice: customer.renewalPrice
        }
      };
    });
  }

  /**
   * Map customer status to order status
   */
  private mapStatus(status: string): 'approved' | 'pending' | 'rejected' | 'deactivated' {
    switch (status) {
      case 'Active':
        return 'approved';
      case 'Pending':
        return 'pending';
      case 'Expired':
        return 'deactivated';
      default:
        return 'pending';
    }
  }

  /**
   * Format date to display format (DD MMM YYYY)
   */
  private formatDateToDisplay(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    console.log('Generating calendar for:', this.getMonthName());
    console.log('Total orders loaded:', this.orders.length);
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    this.calendarDays = [];
    
    // Add empty days for the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push({ date: null, day: 0, renewals: [] });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const renewals = this.getRenewalsForDate(date);
      
      if (renewals.length > 0) {
        console.log(`Day ${day} has ${renewals.length} renewals:`, 
          renewals.map(r => r.clientDetails?.businessName));
      }
      
      this.calendarDays.push({ date, day, renewals });
    }
    
    const daysWithRenewals = this.calendarDays.filter(d => d.renewals.length > 0);
    console.log('Calendar days with renewals:', daysWithRenewals.length);
    if (daysWithRenewals.length > 0) {
      console.log('Sample days with renewals:', daysWithRenewals.slice(0, 3).map(d => ({
        day: d.day,
        count: d.renewals.length,
        businesses: d.renewals.map(r => r.clientDetails?.businessName)
      })));
    }
  }

  getRenewalsForDate(date: Date): any[] {
    const renewals = this.orders.filter(order => {
      if (!order.planDetails?.renewalDate) return false;
      
      try {
        // Parse the YYYY-MM-DD format
        const renewalDate = new Date(order.planDetails.renewalDate);
        
        const matches = renewalDate.getDate() === date.getDate() &&
               renewalDate.getMonth() === date.getMonth() &&
               renewalDate.getFullYear() === date.getFullYear();
        
        if (matches) {
          console.log('Found renewal match:', {
            business: order.clientDetails?.businessName,
            renewalDate: order.planDetails.renewalDate,
            calendarDate: date.toISOString().split('T')[0]
          });
        }
        
        return matches;
      } catch (error) {
        console.error('Error parsing date:', order.planDetails.renewalDate, error);
        return false;
      }
    });
    
    return renewals;
  }

  /**
   * Get renewals that were paid/renewed today (start date is today)
   * Only show for the current date
   */
  getRenewedTodayForDate(date: Date): any[] {
    // Only show renewed today for the actual current date
    if (!this.isToday(date)) {
      return [];
    }
    
    return this.orders.filter(order => {
      if (!order.planDetails?.startDate) return false;
      
      try {
        const startDate = new Date(order.planDetails.startDate);
        
        return startDate.getDate() === date.getDate() &&
               startDate.getMonth() === date.getMonth() &&
               startDate.getFullYear() === date.getFullYear();
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Check if a date has renewals that were paid today
   * Only returns true for the current date
   */
  hasRenewedToday(date: Date | null): boolean {
    if (!date) return false;
    // Only show renewed today indicator for the actual current date
    if (!this.isToday(date)) return false;
    return this.getRenewedTodayForDate(date).length > 0;
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  getMonthName(): string {
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  navigateToDashboard() {
    this.router.navigate(['/admindash']);
  }

  getTotalRenewals(): number {
    return this.calendarDays.reduce((sum, day) => sum + day.renewals.length, 0);
  }

  getDaysWithRenewals(): number {
    return this.calendarDays.filter(day => day.renewals.length > 0).length;
  }

  getBusiestDayCount(): number {
    return this.calendarDays.reduce((max, day) => 
      day.renewals.length > max ? day.renewals.length : max, 0
    );
  }

  /**
   * Calculate total revenue for a specific day
   */
  calculateDayRevenue(renewals: any[]): number {
    return renewals.reduce((total, renewal) => 
      total + (renewal.paymentDetails?.renewalPrice || 0), 0
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
  }
}
