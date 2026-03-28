import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CustomerData {
  customerId: string;
  businessName: string;
  businessEmail: string;
  contactPerson: string;
  phone: string;
  address: string;
  gstNumber?: string;
  isDeactivated: boolean;
  teamMembers?: {
    salesPerson: string;
    responsiblePerson: string;
    approvedBy: string;
  };
}

export interface SubscriptionData {
  planName: string;
  planType: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  status: 'Active' | 'Expired' | 'Pending';
  startDate: Date;
  nextRenewal: Date;
  amount: number;
  daysUntilRenewal: number;
}

export interface PricingData {
  planPrice: number;
  addonsPrice: number;
  offerPrice: number;
  renewalPrice: number;
  addons: string[];
  offers: string[];
}

export interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  status: 'Success' | 'Failed' | 'Pending';
  method: string;
  invoiceUrl?: string;
}

export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface CustomerPortalResponse {
  success: boolean;
  message: string;
  data: {
    customer: CustomerData;
    subscription: SubscriptionData;
    pricing: PricingData;
    paymentHistory: PaymentHistory[];
    auditLog: AuditLogEntry[];
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Encode email to base64
   */
  encodeEmail(email: string): string {
    return btoa(email.toLowerCase().trim());
  }

  /**
   * Decode base64 to email
   */
  decodeEmail(encodedEmail: string): string {
    try {
      return atob(encodedEmail);
    } catch (error) {
      console.error('Error decoding email:', error);
      return '';
    }
  }

  /**
   * Get customer portal data by base64 encoded email
   */
  getCustomerPortalData(encodedEmail: string): Observable<CustomerPortalResponse> {
    const url = `${this.apiUrl}/customer/portal?usr=${encodedEmail}`;
    
    return this.http.get<CustomerPortalResponse>(url).pipe(
      map(response => {
        // Convert date strings to Date objects
        if (response.data) {
          response.data.subscription.startDate = new Date(response.data.subscription.startDate);
          response.data.subscription.nextRenewal = new Date(response.data.subscription.nextRenewal);
          response.data.paymentHistory = response.data.paymentHistory.map(payment => ({
            ...payment,
            date: new Date(payment.date)
          }));
          response.data.auditLog = response.data.auditLog.map(log => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        }
        return response;
      }),
      catchError(error => {
        console.error('Error fetching customer portal data:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create or update customer (for testing/admin purposes)
   */
  createOrUpdateCustomer(customerData: any): Observable<any> {
    const url = `${this.apiUrl}/customer/create`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(url, customerData, { headers }).pipe(
      catchError(error => {
        console.error('Error creating/updating customer:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download invoice PDF for a customer
   */
  downloadInvoice(customerId: string): void {
    const url = `${this.apiUrl}/customer/invoice/${customerId}`;
    
    // Open the download URL in a new window to trigger download
    window.open(url, '_blank');
  }

  /**
   * Create renewal order for Razorpay payment
   */
  createRenewalOrder(customerId: string): Observable<any> {
    const url = `${this.apiUrl}/customer/renewal-order/${customerId}`;
    
    return this.http.post(url, {}).pipe(
      catchError(error => {
        console.error('Error creating renewal order:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify renewal payment
   */
  verifyRenewalPayment(customerId: string, paymentData: any): Observable<any> {
    const url = `${this.apiUrl}/customer/verify-renewal/${customerId}`;
    
    return this.http.post(url, paymentData).pipe(
      catchError(error => {
        console.error('Error verifying renewal payment:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download signed documents from DocuSeal
   */
  downloadSignedDocuments(customerId: string): Observable<any> {
    const url = `${this.apiUrl}/customer/signed-documents/${customerId}`;
    
    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Error downloading signed documents:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save DocuSeal submission ID for a customer
   */
  saveDocuSealSubmissionId(customerId: string, submissionId: string): Observable<any> {
    const url = `${this.apiUrl}/customer/save-docuseal-id/${customerId}`;
    
    return this.http.post(url, { submissionId }).pipe(
      catchError(error => {
        console.error('Error saving DocuSeal submission ID:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download payment receipt for a specific payment
   */
  downloadReceipt(customerId: string, paymentId: string): void {
    const url = `${this.apiUrl}/customer/receipt/${customerId}/${paymentId}`;
    
    // Open the download URL in a new window to trigger download
    window.open(url, '_blank');
  }
}
