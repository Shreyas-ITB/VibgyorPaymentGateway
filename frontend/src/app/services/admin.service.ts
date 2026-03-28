import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Order {
  id: string;
  customerId: string;
  clientName: string;
  businessName: string;
  businessEmail: string;
  phone: string;
  address: string;
  gstNumber: string;
  plan: string;
  status: 'Active' | 'Expired' | 'Pending' | 'Deactivated';
  startDate: Date;
  renewalDate: Date;
  renewalPrice: number;
  planStatus: 'active' | 'dormant' | 'inactive';
  isDeactivated: boolean;
  documents: string[];
  paymentLink?: {
    id: string;
    shortUrl: string;
    status: 'created' | 'paid' | 'expired' | 'cancelled';
    createdAt: Date;
    expiresAt: Date;
  };
  auditLog: Array<{
    action: string;
    timestamp: Date;
    user: string;
    details?: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
  teamMembers?: {
    salesPerson: string;
    responsiblePerson: string;
    approvedBy: string;
  };
  pricing?: {
    planPrice: number;
    addonsPrice: number;
    offerPrice: number;
    renewalPrice: number;
    addons: string[];
    offers: string[];
  };
}

export interface CalendarDay {
  date: Date | null;
  day: number;
  renewals: Order[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all customers/orders
   */
  getAllCustomers(): Observable<Order[]> {
    const url = `${this.apiUrl}/admin/customers`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map((customer: any) => this.mapCustomerToOrder(customer));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching customers:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get customers with renewals in a specific month
   */
  getCustomersByMonth(year: number, month: number): Observable<Order[]> {
    const url = `${this.apiUrl}/admin/customers/renewals?year=${year}&month=${month}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map((customer: any) => this.mapCustomerToOrder(customer));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching renewals:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get customer by ID
   */
  getCustomerById(customerId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/customers/${customerId}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error fetching customer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update customer/order
   */
  updateCustomer(customerId: string, updates: Partial<Order>): Observable<any> {
    const url = `${this.apiUrl}/admin/customers/${customerId}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.put(url, updates, { headers }).pipe(
      catchError(error => {
        console.error('Error updating customer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete customer/order
   */
  deleteCustomer(customerId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/customers/${customerId}`;
    
    return this.http.delete(url).pipe(
      catchError(error => {
        console.error('Error deleting customer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new customer/order
   */
  createCustomer(customerData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/customers`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, customerData, { headers }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        console.error('Error creating customer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate payment link for a customer
   */
  generatePaymentLink(customerId: string, amount: number, description: string): Observable<any> {
    const url = `${this.apiUrl}/admin/customers/${customerId}/payment-link`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, { amount, description }, { headers }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        console.error('Error generating payment link:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check payment status for a customer
   */
  checkPaymentStatus(customerId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/customers/${customerId}/check-payment`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, {}, { headers }).pipe(
      map(response => {
        return response;
      }),
      catchError(error => {
        console.error('Error checking payment status:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Map customer data from API to Order interface
   */
  private mapCustomerToOrder(customer: any): Order {
    return {
      id: customer.customerId,  // Use customerId, not _id
      customerId: customer.customerId,
      clientName: customer.contactPerson,
      businessName: customer.businessName,
      businessEmail: customer.businessEmail,
      phone: customer.phone,
      address: customer.address,
      gstNumber: customer.gstNumber || '',
      plan: customer.subscription.planName,
      status: customer.subscription.status,
      startDate: new Date(customer.subscription.startDate),
      renewalDate: new Date(customer.subscription.nextRenewal),
      renewalPrice: customer.subscription.amount,
      planStatus: customer.planStatus || 'active',
      isDeactivated: customer.isDeactivated || false,
      documents: [],
      paymentLink: customer.paymentLink ? {
        id: customer.paymentLink.id,
        shortUrl: customer.paymentLink.shortUrl,
        status: customer.paymentLink.status,
        createdAt: new Date(customer.paymentLink.createdAt),
        expiresAt: new Date(customer.paymentLink.expiresAt)
      } : undefined,
      auditLog: (customer.auditLog || []).map((log: any) => ({
        action: log.action,
        timestamp: new Date(log.timestamp),
        user: log.performedBy,
        details: log.details,
        changes: log.changes || []
      })),
      // Add team members
      teamMembers: {
        salesPerson: customer.teamMembers?.salesPerson || 'N/A',
        responsiblePerson: customer.teamMembers?.responsiblePerson || 'N/A',
        approvedBy: customer.teamMembers?.approvedBy || 'Pending'
      },
      // Add pricing details
      pricing: {
        planPrice: customer.pricing?.planPrice || customer.subscription.amount,
        addonsPrice: customer.pricing?.addonsPrice || 0,
        offerPrice: customer.pricing?.offerPrice || customer.subscription.amount,
        renewalPrice: customer.pricing?.renewalPrice || customer.subscription.amount,
        addons: customer.pricing?.addons || [],
        offers: customer.pricing?.offers || []
      }
    };
  }

  // ==================== PLAN MANAGEMENT ====================

  /**
   * Get all plans
   */
  getAllPlans(): Observable<any[]> {
    const url = `${this.apiUrl}/admin/plans`;
    return this.http.get<any>(url).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('Error fetching plans:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new plan
   */
  createPlan(planData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/plans`;
    return this.http.post(url, planData).pipe(
      catchError(error => {
        console.error('Error creating plan:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update plan
   */
  updatePlan(planId: string, planData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/plans/${planId}`;
    return this.http.put(url, planData).pipe(
      catchError(error => {
        console.error('Error updating plan:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete plan
   */
  deletePlan(planId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/plans/${planId}`;
    return this.http.delete(url).pipe(
      catchError(error => {
        console.error('Error deleting plan:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== ADDON MANAGEMENT ====================

  /**
   * Get all addons
   */
  getAllAddons(): Observable<any[]> {
    const url = `${this.apiUrl}/admin/addons`;
    return this.http.get<any>(url).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('Error fetching addons:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new addon
   */
  createAddon(addonData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/addons`;
    return this.http.post(url, addonData).pipe(
      catchError(error => {
        console.error('Error creating addon:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update addon
   */
  updateAddon(addonId: string, addonData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/addons/${addonId}`;
    return this.http.put(url, addonData).pipe(
      catchError(error => {
        console.error('Error updating addon:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete addon
   */
  deleteAddon(addonId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/addons/${addonId}`;
    return this.http.delete(url).pipe(
      catchError(error => {
        console.error('Error deleting addon:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== SPECIAL OFFER MANAGEMENT ====================

  /**
   * Get all special offers
   */
  getAllSpecialOffers(): Observable<any[]> {
    const url = `${this.apiUrl}/admin/special-offers`;
    return this.http.get<any>(url).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('Error fetching special offers:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new special offer
   */
  createSpecialOffer(offerData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/special-offers`;
    return this.http.post(url, offerData).pipe(
      catchError(error => {
        console.error('Error creating special offer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update special offer
   */
  updateSpecialOffer(offerId: string, offerData: any): Observable<any> {
    const url = `${this.apiUrl}/admin/special-offers/${offerId}`;
    return this.http.put(url, offerData).pipe(
      catchError(error => {
        console.error('Error updating special offer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete special offer
   */
  deleteSpecialOffer(offerId: string): Observable<any> {
    const url = `${this.apiUrl}/admin/special-offers/${offerId}`;
    return this.http.delete(url).pipe(
      catchError(error => {
        console.error('Error deleting special offer:', error);
        return throwError(() => error);
      })
    );
  }

}
