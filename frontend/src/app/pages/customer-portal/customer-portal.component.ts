import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CustomerService, CustomerData, SubscriptionData, PricingData, PaymentHistory, AuditLogEntry } from '../../services/customer.service';
import { AdminService } from '../../services/admin.service';
import { DocusealFormComponent } from '@docuseal/angular';
import { environment } from '../../../environments/environment';

// Declare Razorpay for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  _id: string;
  name: string;
  displayName: string;
  duration: number;
  price: number;
  features: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DocusealFormComponent],
  providers: [CustomerService, AdminService],
  templateUrl: './customer-portal.component.html',
  styleUrls: ['./customer-portal.component.css']
})
export class CustomerPortalComponent implements OnInit {
  encodedEmail: string = '';
  customerData: CustomerData | null = null;
  subscriptionData: SubscriptionData | null = null;
  pricingData: PricingData | null = null;
  paymentHistory: PaymentHistory[] = [];
  auditLog: AuditLogEntry[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  showNoSubscriptionMessage: boolean = false;
  daysUntilRenewal: number = 0;
  availablePlans: Plan[] = [];
  isLoadingPlans: boolean = false;
  
  // DocuSeal signing properties
  showDocuSealModal: boolean = false;
  
  // Renewal success modal
  showRenewalSuccessModal: boolean = false;
  renewalSuccessData: { newRenewalDate: Date; paymentId: string } | null = null;
  docuSealSigningUrl: string = environment.docusealDocumentLink;
  showSigningSuccessModal: boolean = false;
  hasSignedDocuments: boolean = false;
  
  // Renewal warning modal
  showRenewalWarningModal: boolean = false;
  renewalWarningMessage: string = '';
  isGracePeriodActive: boolean = false;
  
  // Signed documents
  isLoadingSignedDocuments: boolean = false;
  showNoDocumentsModal: boolean = false;
  noDocumentsMessage: string = '';
  noDocumentsAuditLogUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    // Check if documents have been signed (from localStorage)
    const signedStatus = localStorage.getItem('documents_signed');
    this.hasSignedDocuments = signedStatus === 'true';

    // Get encoded email from query params or localStorage
    this.route.queryParams.subscribe(params => {
      const usrParam = params['usr'];
      
      if (usrParam) {
        // Save to localStorage for future visits
        this.encodedEmail = usrParam;
        localStorage.setItem('customer_portal_usr', usrParam);
      } else {
        // Try to load from localStorage
        const cachedUsr = localStorage.getItem('customer_portal_usr');
        if (cachedUsr) {
          this.encodedEmail = cachedUsr;
        }
      }
      
      if (!this.encodedEmail) {
        this.errorMessage = 'Invalid access link. Please use the link provided in your email.';
        this.isLoading = false;
        return;
      }

      this.loadCustomerData();
    });
  }

  /**
   * Load customer data from API
   */
  loadCustomerData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.showNoSubscriptionMessage = false;

    this.customerService.getCustomerPortalData(this.encodedEmail).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.customerData = response.data.customer;
          this.subscriptionData = response.data.subscription;
          this.pricingData = response.data.pricing;
          this.paymentHistory = response.data.paymentHistory;
          this.auditLog = response.data.auditLog;
          this.daysUntilRenewal = response.data.subscription.daysUntilRenewal;
          
          // Show renewal warning modal if needed
          this.checkAndShowRenewalWarning();
        } else {
          this.showNoSubscriptionMessage = true;
          this.loadAvailablePlans(); // Load plans when no subscription found
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading customer data:', error);
        this.isLoading = false;
        
        if (error.status === 404) {
          this.showNoSubscriptionMessage = true;
          this.loadAvailablePlans(); // Load plans when no subscription found
        } else {
          this.errorMessage = 'Unable to load your subscription details. Please try again later.';
        }
      }
    });
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
      case 'Success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Expired':
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  /**
   * Get display text for order status (convert Active to Approved)
   */
  getOrderStatusText(status: string): string {
    return status === 'Active' ? 'Approved' : status;
  }

  /**
   * Get renewal urgency color
   */
  getRenewalUrgencyColor(): string {
    if (this.daysUntilRenewal <= 0) {
      return 'text-red-600 dark:text-red-400';
    } else if (this.daysUntilRenewal <= 7) {
      return 'text-red-600 dark:text-red-400';
    } else if (this.daysUntilRenewal <= 30) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-green-600 dark:text-green-400';
  }

  /**
   * Check and show renewal warning modal
   */
  checkAndShowRenewalWarning(): void {
    if (this.daysUntilRenewal <= 0) {
      this.isGracePeriodActive = true;
      this.renewalWarningMessage = 'Your subscription has expired! You have 1 month of grace period remaining. Please renew your plan immediately to avoid service interruption.';
    } else if (this.daysUntilRenewal <= 7) {
      this.isGracePeriodActive = false;
      this.renewalWarningMessage = 'Your subscription is expiring soon! Only ' + this.daysUntilRenewal + ' days remaining. Please renew your plan now to ensure uninterrupted service.';
    }
    
    // Show modal if there's a warning
    if (this.renewalWarningMessage) {
      this.showRenewalWarningModal = true;
    }
  }

  /**
   * Close renewal warning modal
   */
  closeRenewalWarningModal(): void {
    this.showRenewalWarningModal = false;
  }

  /**
   * Get display text for days until renewal (prevent negative numbers)
   */
  getDisplayDaysUntilRenewal(): string {
    if (this.daysUntilRenewal <= 0) {
      return 'Renew your plan now, system will deactivate the account';
    }
    return this.daysUntilRenewal + ' days remaining';
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format field name for display
   */
  formatFieldName(field: string): string {
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (value instanceof Date) {
      return this.formatDate(value);
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Download latest invoice
   */
  downloadLatestInvoice(): void {
    if (!this.customerData?.customerId) {
      alert('Unable to download invoice. Customer ID not found.');
      return;
    }

    console.log('Downloading invoice for customer:', this.customerData.customerId);
    this.customerService.downloadInvoice(this.customerData.customerId);
  }

  /**
   * Download invoice for specific payment (from payment history table)
   */
  downloadInvoice(payment: PaymentHistory): void {
    if (!this.customerData?.customerId) {
      alert('Unable to download invoice. Customer ID not found.');
      return;
    }

    console.log('Downloading invoice for payment:', payment.id);
    this.customerService.downloadInvoice(this.customerData.customerId);
  }

  /**
   * Download receipt for specific payment (from payment history table)
   */
  downloadReceipt(payment: PaymentHistory): void {
    if (!this.customerData?.customerId) {
      alert('Unable to download receipt. Customer ID not found.');
      return;
    }

    console.log('Downloading receipt for payment:', payment.id);
    this.customerService.downloadReceipt(this.customerData.customerId, payment.id);
  }

  /**
   * Check if renewal is allowed (within 15 days of due date)
   */
  isRenewalAllowed(): boolean {
    return this.daysUntilRenewal <= 15;
  }

  /**
   * Get renewal button tooltip message
   */
  getRenewalTooltip(): string {
    if (this.isRenewalAllowed()) {
      return 'Click to renew your subscription';
    }
    return `Renewal will be available ${this.daysUntilRenewal - 15} days before the due date`;
  }

  /**
   * Renew subscription with Razorpay payment
   */
  renewSubscription(): void {
    if (!this.isRenewalAllowed()) {
      alert(`Renewal is only available within 15 days of the due date. You can renew starting ${this.daysUntilRenewal - 15} days from now.`);
      return;
    }

    if (!this.customerData?.customerId) {
      alert('Unable to process renewal. Customer ID not found.');
      return;
    }

    // Create Razorpay order
    this.customerService.createRenewalOrder(this.customerData.customerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.launchRazorpayPayment(response.data);
        } else {
          alert('Failed to create renewal order: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error creating renewal order:', error);
        alert('Failed to create renewal order. Please try again or contact support.');
      }
    });
  }

  /**
   * Launch Razorpay payment popup
   */
  private launchRazorpayPayment(orderData: any): void {
    const options = {
      key: orderData.keyId,
      amount: orderData.amount * 100, // Amount in paise
      currency: orderData.currency,
      name: 'Vibgyor Payment Gateway',
      description: 'Subscription Renewal',
      order_id: orderData.orderId,
      prefill: {
        name: orderData.customerDetails.name,
        email: orderData.customerDetails.email,
        contact: orderData.customerDetails.contact
      },
      theme: {
        color: '#667EEA'
      },
      handler: (response: any) => {
        this.handlePaymentSuccess(response);
      },
      modal: {
        ondismiss: () => {
          console.log('Payment cancelled by user');
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  /**
   * Handle successful payment
   */
  private handlePaymentSuccess(response: any): void {
    if (!this.customerData?.customerId) return;

    // Verify payment on backend
    this.customerService.verifyRenewalPayment(this.customerData.customerId, response).subscribe({
      next: (verifyResponse) => {
        if (verifyResponse.success) {
          // Show success modal instead of alert
          this.renewalSuccessData = verifyResponse.data;
          this.showRenewalSuccessModal = true;
          // Reload customer data to show updated renewal date
          this.loadCustomerData();
        } else {
          alert('Payment verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
        }
      },
      error: (error) => {
        console.error('Error verifying payment:', error);
        alert('Payment verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
      }
    });
  }

  /**
   * Contact support
   */
  contactSupport(): void {
    console.log('Contacting support');
    // In production, this would open support form or redirect to support page
    alert('Support contact form would open here');
  }

  /**
   * Load available plans from API
   */
  loadAvailablePlans(): void {
    this.isLoadingPlans = true;
    
    this.adminService.getAllPlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans.map(plan => ({
          _id: plan._id,
          name: plan.name,
          displayName: plan.displayName,
          duration: plan.duration,
          price: plan.price,
          features: plan.features || [],
          isActive: plan.isActive
        }));
        this.isLoadingPlans = false;
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.isLoadingPlans = false;
      }
    });
  }

  /**
   * Contact sales for a specific plan
   */
  contactSalesForPlan(plan: Plan): void {
    const subject = `Inquiry about ${plan.displayName}`;
    const body = `Hi,\n\nI'm interested in the ${plan.displayName} (${plan.duration} months) for ${this.formatCurrency(plan.price)}.\n\nCould you please provide more information and help me get started?\n\nThank you!`;
    const mailtoLink = `mailto:sales@vibgyor.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }

  /**
   * Open DocuSeal signing modal
   */
  openDocuSealModal(): void {
    this.showDocuSealModal = true;
  }

  /**
   * Close DocuSeal signing modal
   */
  closeDocuSealModal(): void {
    this.showDocuSealModal = false;
  }

  /**
   * Close renewal success modal
   */
  closeRenewalSuccessModal(): void {
    this.showRenewalSuccessModal = false;
    this.renewalSuccessData = null;
  }

  /**
   * Handle DocuSeal form completion
   */
  onDocuSealComplete(event: any): void {
    console.log('Document signed successfully:', event);
    
    // Close the signing modal
    this.closeDocuSealModal();
    
    // Mark documents as signed in localStorage
    localStorage.setItem('documents_signed', 'true');
    this.hasSignedDocuments = true;
    
    // Save DocuSeal submission ID to backend
    if (event && event.submission_id && this.customerData?.customerId) {
      console.log('Saving DocuSeal submission ID:', event.submission_id);
      this.customerService.saveDocuSealSubmissionId(
        this.customerData.customerId,
        event.submission_id
      ).subscribe({
        next: () => {
          console.log('DocuSeal submission ID saved successfully');
        },
        error: (error) => {
          console.error('Error saving DocuSeal submission ID:', error);
        }
      });
    }
    
    // Show success modal
    this.showSigningSuccessModal = true;
  }

  /**
   * Close signing success modal and reload page
   */
  closeSigningSuccessModal(): void {
    this.showSigningSuccessModal = false;
    // Reload the page to refresh the portal and hide the alert
    window.location.reload();
  }

  /**
   * Close no documents modal
   */
  closeNoDocumentsModal(): void {
    this.showNoDocumentsModal = false;
    this.noDocumentsMessage = '';
    this.noDocumentsAuditLogUrl = null;
  }

  /**
   * Open audit log URL in new tab
   */
  openAuditLogUrl(): void {
    if (this.noDocumentsAuditLogUrl) {
      window.open(this.noDocumentsAuditLogUrl, '_blank');
    }
  }

  /**
   * Handle DocuSeal form decline
   */
  onDocuSealDecline(): void {
    console.log('Document signing declined');
    alert('Document signing was declined.');
    this.closeDocuSealModal();
  }

  /**
   * Handle DocuSeal form load
   */
  onDocuSealLoad(event: any): void {
    console.log('DocuSeal form loaded:', event);
  }

  /**
   * Download signed documents from DocuSeal
   */
  downloadSignedDocuments(): void {
    if (!this.hasSignedDocuments) {
      this.showNoDocumentsModal = true;
      this.noDocumentsMessage = 'Please sign the documents first before downloading.';
      return;
    }

    if (!this.customerData?.customerId) {
      this.showNoDocumentsModal = true;
      this.noDocumentsMessage = 'Unable to download documents. Customer ID not found.';
      return;
    }

    this.isLoadingSignedDocuments = true;

    this.customerService.downloadSignedDocuments(this.customerData.customerId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const documents = response.data.documents;
          
          // If no documents but audit log URL exists, open it
          if (documents.length === 0 && response.data.auditLogUrl) {
            console.log('Opening audit log URL:', response.data.auditLogUrl);
            window.open(response.data.auditLogUrl, '_blank');
            this.isLoadingSignedDocuments = false;
            return;
          }

          // If no documents and no audit log
          if (documents.length === 0) {
            this.showNoDocumentsModal = true;
            this.noDocumentsMessage = 'No signed documents found. The documents may not be ready yet. Please try again in a moment.';
            this.noDocumentsAuditLogUrl = null;
            this.isLoadingSignedDocuments = false;
            return;
          }

          // If only one document, download it directly
          if (documents.length === 1) {
            const doc = documents[0];
            if (doc.url) {
              window.open(doc.url, '_blank');
            } else {
              this.showNoDocumentsModal = true;
              this.noDocumentsMessage = 'Document URL not available.';
              this.noDocumentsAuditLogUrl = null;
            }
          } else {
            // If multiple documents, show a list for user to choose
            this.showDocumentDownloadList(documents);
          }
        } else {
          this.showNoDocumentsModal = true;
          this.noDocumentsMessage = 'No signed documents found. Please try again.';
          this.noDocumentsAuditLogUrl = null;
        }
        this.isLoadingSignedDocuments = false;
      },
      error: (error) => {
        console.error('Error downloading signed documents:', error);
        this.isLoadingSignedDocuments = false;
        
        this.showNoDocumentsModal = true;
        if (error.status === 404) {
          this.noDocumentsMessage = 'No signed documents found. The documents may not be ready yet. Please try again in a moment.';
        } else if (error.status === 500) {
          this.noDocumentsMessage = 'Server error while retrieving documents. Please try again later.';
        } else {
          this.noDocumentsMessage = 'Failed to download signed documents. Please try again later.';
        }
        this.noDocumentsAuditLogUrl = null;
      }
    });
  }

  /**
   * Show document download list when multiple documents exist
   */
  private showDocumentDownloadList(documents: any[]): void {
    let message = 'Multiple signed documents found:\n\n';
    documents.forEach((doc, index) => {
      message += `${index + 1}. ${doc.name}\n`;
    });
    message += '\nOpening all documents...';
    
    alert(message);
    
    // Open all documents in new tabs
    documents.forEach(doc => {
      if (doc.url) {
        window.open(doc.url, '_blank');
      }
    });
  }
}
