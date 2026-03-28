import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService, Order as AdminOrder } from '../../services/admin.service';
import { environment } from '../../../environments/environment';

interface Document {
  id: string;
  name: string;
  url: string;
  status: 'signed' | 'not-signed' | 'skipped';
}

interface Employee {
  _id: string;
  name: string;
  username: string;
  email: string;
  employ_id: string;
  is_verified: boolean;
  profile_picture: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: 'order_created' | 'status_change' | 'payment_status_change' | 'plan_change' | 'price_change' | 'document_signed' | 'renewal' | 'edit' | 'note';
  description: string;
  action: string;
  details?: string;
  performedBy: string;
  user: string;
  oldValue?: string;
  newValue?: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

interface Order {
  id: string;
  status: 'approved' | 'pending' | 'rejected' | 'deactivated';
  planStatus: 'active' | 'dormant' | 'inactive';
  isDeactivated: boolean;
  clientDetails: {
    clientName: string;
    businessName: string;
    businessEmail: string;
    businessAddress: string;
    gstin: string;
    salesPerson: string;
    responsiblePerson: string;
    approvedBy: string;
  };
  planDetails: {
    planType: string;
    startDate: string;
    renewalDate: string;
  };
  paymentDetails: {
    planPrice: number;
    addonsPrice: number;
    offerPrice: number;
    renewalPrice: number;
    addons: string[];
    offers: string[];
  };
  paymentLink?: {
    id: string;
    shortUrl: string;
    status: 'created' | 'paid' | 'expired' | 'cancelled';
    createdAt: Date;
    expiresAt: Date;
  };
  documents: Document[];
  auditLog: AuditLog[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  providers: [AdminService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  orders: Order[] = [];
  allOrders: Order[] = []; // Store all orders for pagination
  paginatedOrders: Order[] = []; // Orders to display on current page
  isLoading: boolean = true;
  showDocumentsModal: boolean = false;
  showDetailsModal: boolean = false;
  showNewOrderModal: boolean = false;
  showDeleteConfirmModal: boolean = false;
  showErrorDialog: boolean = false;
  showAddAddonModal: boolean = false;
  showAddOfferModal: boolean = false;
  showManagePlansModal: boolean = false;
  showPlanFormModal: boolean = false;
  showAddonFormModal: boolean = false;
  showOfferFormModal: boolean = false;
  showDeletePlanConfirmModal: boolean = false;
  showDeleteAddonConfirmModal: boolean = false;
  showDeleteOfferConfirmModal: boolean = false;
  selectedOrder: Order | null = null;
  orderToDelete: Order | null = null;
  planToDelete: any = null;
  addonToDelete: any = null;
  offerToDelete: any = null;
  errorMessage: string = '';
  errorTitle: string = '';
  isEditMode: boolean = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Statistics
  statistics = {
    totalClients: 0,
    activeClients: 0,
    pendingClients: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0,
    renewalsMade: 0,
    newOrders: 0,
    failedPayments: 0,
    deactivatedClients: 0
  };

  // Hover popup state
  hoveredCard: string | null = null;

  // Edit form data
  editForm: any = {};

  // New addon/offer forms
  newAddon = { name: '', price: 0 };
  newOffer = { name: '', freeMonths: 0 };

  // Plan form data
  planForm: any = {
    _id: null,
    name: '',
    displayName: '',
    duration: 0,
    price: 0,
    features: []
  };

  // Current feature being added
  currentFeature: string = '';

  // Expose Math to template
  Math = Math;

  // Expose current year to template
  currentYear = new Date().getFullYear();

  // Addon form data
  addonForm: any = {
    _id: null,
    name: '',
    displayName: '',
    price: 0,
    description: '',
    applicablePlans: []
  };

  // Offer form data
  offerForm: any = {
    _id: null,
    name: '',
    displayName: '',
    freeMonths: 0,
    discountPercentage: 0,
    description: '',
    applicablePlans: []
  };

  isEditingPlan: boolean = false;
  isEditingAddon: boolean = false;
  isEditingOffer: boolean = false;

  // Calendar state
  currentMonth: Date = new Date();
  calendarDays: any[] = [];
  renewalsByDate: Map<string, Order[]> = new Map();

  // New Order Form Data
  newOrderForm = {
    clientName: '',
    businessName: '',
    businessEmail: '',
    gstin: '',
    businessAddress: '',
    planType: 'quarterly' as 'quarterly' | 'yearly',
    startDate: '',
    salesPerson: '',
    responsiblePerson: '',
    approvedBy: 'Pending',
    selectedAddons: [] as string[],
    selectedOffers: [] as string[],
    offerPrice: 0,
    renewalPrice: 0
  };

  // Available team members for dropdowns (will be populated from API)
  teamMembers: string[] = [];

  // Available plans (loaded from API)
  availablePlans: any[] = [];

  // Available addons (loaded from API)
  availableAddons: any[] = [];

  // Available offers (loaded from API)
  availableOffers: any[] = [];

  // Payment link state
  paymentLinkGenerated: boolean = false;
  generatedPaymentLink: string = '';

  constructor(
    private router: Router, 
    private authService: AuthService,
    private adminService: AdminService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadEmployees();
    this.loadPlans();
    this.loadAddons();
    this.loadOffers();
    this.generateCalendar();
    this.mapRenewalDates();
  }

  /**
   * Load employees from API
   */
  private loadEmployees(): void {
    this.http.get<any>(environment.employeeListApi).subscribe({
      next: (response) => {
        // Handle both array and object responses
        let employees: Employee[] = [];
        
        if (Array.isArray(response)) {
          employees = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          employees = response.data;
        } else if (response && response.employees && Array.isArray(response.employees)) {
          employees = response.employees;
        } else {
          console.warn('Unexpected employee API response format:', response);
          this.teamMembers = [];
          return;
        }
        
        // Filter only verified employees and extract their names
        this.teamMembers = employees
          .filter(emp => emp.is_verified === true)
          .map(emp => emp.name);
        
        console.log('Loaded employees:', this.teamMembers);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        // Fallback to empty array if API fails
        this.teamMembers = [];
      }
    });
  }

  /**
   * Load plans from API
   */
  private loadPlans(): void {
    this.adminService.getAllPlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans.map(plan => ({
          id: plan._id,
          name: plan.name,
          displayName: plan.displayName,
          duration: plan.duration,
          price: plan.price,
          features: plan.features || []
        }));
        console.log('Loaded plans:', this.availablePlans);
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.availablePlans = [];
      }
    });
  }

  /**
   * Load addons from API
   */
  private loadAddons(): void {
    this.adminService.getAllAddons().subscribe({
      next: (addons) => {
        this.availableAddons = addons.map(addon => ({
          id: addon._id,
          name: addon.name,
          displayName: addon.displayName,
          price: addon.price,
          description: addon.description,
          applicablePlans: addon.applicablePlans || []
        }));
        console.log('Loaded addons:', this.availableAddons);
      },
      error: (error) => {
        console.error('Error loading addons:', error);
        this.availableAddons = [];
      }
    });
  }

  /**
   * Load special offers from API
   */
  private loadOffers(): void {
    this.adminService.getAllSpecialOffers().subscribe({
      next: (offers) => {
        this.availableOffers = offers.map(offer => ({
          id: offer._id,
          name: offer.name,
          displayName: offer.displayName,
          freeMonths: offer.freeMonths,
          discountPercentage: offer.discountPercentage,
          description: offer.description,
          applicablePlans: offer.applicablePlans || []
        }));
        console.log('Loaded offers:', this.availableOffers);
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.availableOffers = [];
      }
    });
  }

  /**
   * Load orders from API
   */
  private loadOrders(): void {
    this.isLoading = true;
    
    this.adminService.getAllCustomers().subscribe({
      next: (customers) => {
        this.allOrders = this.mapCustomersToOrders(customers);
        this.orders = this.allOrders; // Keep reference for other methods
        this.calculateStatistics();
        this.updatePagination();
        this.mapRenewalDates();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoading = false;
        this.orders = [];
        this.allOrders = [];
        this.paginatedOrders = [];
      }
    });
  }

  /**
   * Calculate dashboard statistics
   */
  private calculateStatistics(): void {
    this.statistics.totalClients = this.allOrders.length;
    this.statistics.activeClients = this.allOrders.filter(o => o.status === 'approved' && o.planStatus === 'active').length;
    this.statistics.pendingClients = this.allOrders.filter(o => o.status === 'pending').length;
    this.statistics.deactivatedClients = this.allOrders.filter(o => o.isDeactivated || o.status === 'deactivated').length;
    
    // Calculate total revenue for current year only (resets each year)
    const currentYear = new Date().getFullYear();
    this.statistics.totalRevenue = this.allOrders
      .filter(o => {
        const orderDate = new Date(o.planDetails.startDate);
        return o.status === 'approved' && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.paymentDetails.offerPrice, 0);
    
    // Calculate monthly revenue (orders from current month)
    const currentMonth = new Date().getMonth();
    this.statistics.monthlyRevenue = this.allOrders
      .filter(o => {
        const orderDate = new Date(o.planDetails.startDate);
        return o.status === 'approved' && 
               orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.paymentDetails.offerPrice, 0);
    
    // Calculate average order value
    const approvedOrders = this.allOrders.filter(o => o.status === 'approved');
    this.statistics.averageOrderValue = approvedOrders.length > 0 
      ? this.statistics.totalRevenue / approvedOrders.length 
      : 0;

    // Calculate renewals made (orders with renewal date in the past or today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.statistics.renewalsMade = this.allOrders
      .filter(o => {
        const renewalDate = new Date(o.planDetails.renewalDate);
        renewalDate.setHours(0, 0, 0, 0);
        return o.status === 'approved' && renewalDate <= today;
      })
      .length;

    // Calculate new orders (orders created in current month)
    this.statistics.newOrders = this.allOrders
      .filter(o => {
        const orderDate = new Date(o.planDetails.startDate);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear;
      })
      .length;

    // Calculate failed payments (rejected orders)
    this.statistics.failedPayments = this.allOrders
      .filter(o => o.status === 'rejected')
      .length;
  }

  /**
   * Handle card hover for popup
   */
  onCardHover(cardName: string): void {
    this.hoveredCard = cardName;
  }

  /**
   * Handle card leave for popup
   */
  onCardLeave(): void {
    this.hoveredCard = null;
  }

  /**
   * Update pagination based on current page
   */
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.allOrders.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.allOrders.slice(startIndex, endIndex);
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  /**
   * Get page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page with 2 pages on each side
      let startPage = Math.max(1, this.currentPage - 2);
      let endPage = Math.min(this.totalPages, this.currentPage + 2);
      
      // Adjust if at the beginning or end
      if (this.currentPage <= 3) {
        endPage = maxPagesToShow;
      } else if (this.currentPage >= this.totalPages - 2) {
        startPage = this.totalPages - maxPagesToShow + 1;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Map API customers to dashboard orders
   */
  private mapCustomersToOrders(customers: AdminOrder[]): Order[] {
    return customers.map(customer => ({
      id: customer.id,
      status: this.mapStatus(customer.status),
      planStatus: customer.planStatus || 'active',
      isDeactivated: customer.isDeactivated || false,
      clientDetails: {
        clientName: customer.clientName,
        businessName: customer.businessName,
        businessEmail: customer.businessEmail,
        businessAddress: customer.address,
        gstin: customer.gstNumber,
        salesPerson: customer.teamMembers?.salesPerson || 'N/A',
        responsiblePerson: customer.teamMembers?.responsiblePerson || 'N/A',
        approvedBy: customer.teamMembers?.approvedBy || 'Pending'
      },
      planDetails: {
        planType: customer.plan,
        startDate: customer.startDate.toISOString().split('T')[0],
        renewalDate: customer.renewalDate.toISOString().split('T')[0]
      },
      paymentDetails: {
        planPrice: customer.pricing?.planPrice || customer.renewalPrice,
        addonsPrice: customer.pricing?.addonsPrice || 0,
        offerPrice: customer.pricing?.offerPrice || customer.renewalPrice,
        renewalPrice: customer.pricing?.renewalPrice || customer.renewalPrice,
        addons: customer.pricing?.addons || [],
        offers: customer.pricing?.offers || []
      },
      paymentLink: customer.paymentLink,
      documents: customer.documents.map((doc, index) => ({
        id: `doc-${index}`,
        name: doc,
        url: '#',
        status: 'signed' as const
      })),
      auditLog: customer.auditLog.map((log, index) => ({
        id: `log-${index}`,
        timestamp: log.timestamp.toISOString(),
        eventType: 'edit' as const,
        description: log.action,
        action: log.action,
        performedBy: log.user,
        user: log.user,
        details: log.details,
        changes: log.changes || []
      }))
    }));
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
        return 'rejected';
      case 'Deactivated':
        return 'deactivated';
      default:
        return 'pending';
    }
  }

  /**
   * Handle new order button click
   */
  onNewOrder(): void {
    this.showNewOrderModal = true;
    this.resetNewOrderForm();
    console.log('New Order modal opened');
  }

  /**
   * Reset new order form
   */
  resetNewOrderForm(): void {
    this.newOrderForm = {
      clientName: '',
      businessName: '',
      businessEmail: '',
      gstin: '',
      businessAddress: '',
      planType: 'quarterly',
      startDate: new Date().toISOString().split('T')[0], // Set to today's date in YYYY-MM-DD format
      salesPerson: '',
      responsiblePerson: '',
      approvedBy: 'Pending',
      selectedAddons: [],
      selectedOffers: [],
      offerPrice: 0,
      renewalPrice: 0
    };
    this.paymentLinkGenerated = false;
    this.generatedPaymentLink = '';
  }

  /**
   * Close new order modal
   */
  closeNewOrderModal(): void {
    this.showNewOrderModal = false;
    this.resetNewOrderForm();
  }

  /**
   * Handle approved by change - automatically set status to approved when an employee is selected
   */
  onApprovedByChange(): void {
    // This method is called when the approvedBy dropdown changes
    // The status will be set in the completeOrder method based on approvedBy value
    console.log('Approved by changed to:', this.newOrderForm.approvedBy);
  }

  /**
   * Handle approved by change in edit mode
   */
  onEditApprovedByChange(): void {
    if (this.editForm && this.editForm.clientDetails.approvedBy !== 'Pending') {
      // Automatically set status to approved when an employee is selected
      this.editForm.status = 'Active';
      console.log('Edit: Approved by changed to:', this.editForm.clientDetails.approvedBy, '- Status set to Active');
    } else if (this.editForm && this.editForm.clientDetails.approvedBy === 'Pending') {
      // Set status back to pending if "Pending" is selected
      this.editForm.status = 'Pending';
      console.log('Edit: Approved by set to Pending - Status set to Pending');
    }
  }

  /**
   * Get filtered addons based on selected plan
   */
  getFilteredAddons(): any[] {
    if (!this.newOrderForm.planType) {
      return []; // Don't show any addons if no plan is selected
    }
    
    return this.availableAddons.filter(addon => {
      // If applicablePlans is empty, it applies to all plans
      if (!addon.applicablePlans || addon.applicablePlans.length === 0) {
        return true;
      }
      // Check if the selected plan is in the addon's applicable plans
      return addon.applicablePlans.includes(this.newOrderForm.planType);
    });
  }

  /**
   * Get filtered offers based on selected plan
   */
  getFilteredOffers(): any[] {
    if (!this.newOrderForm.planType) {
      return []; // Don't show any offers if no plan is selected
    }
    
    return this.availableOffers.filter(offer => {
      // If applicablePlans is empty, it applies to all plans
      if (!offer.applicablePlans || offer.applicablePlans.length === 0) {
        return true;
      }
      // Check if the selected plan is in the offer's applicable plans
      return offer.applicablePlans.includes(this.newOrderForm.planType);
    });
  }

  /**
   * Handle plan type change - clear selected addons and offers when plan changes
   */
  onPlanTypeChangeInNewOrder(): void {
    // Clear selected addons and offers when plan type changes
    this.newOrderForm.selectedAddons = [];
    this.newOrderForm.selectedOffers = [];
    console.log('Plan type changed to:', this.newOrderForm.planType, '- Cleared addons and offers');
  }

  /**
   * Toggle addon selection
   */
  toggleAddon(addonId: string): void {
    const index = this.newOrderForm.selectedAddons.indexOf(addonId);
    if (index > -1) {
      this.newOrderForm.selectedAddons.splice(index, 1);
    } else {
      this.newOrderForm.selectedAddons.push(addonId);
    }
  }

  /**
   * Toggle offer selection
   */
  toggleOffer(offerId: string): void {
    const index = this.newOrderForm.selectedOffers.indexOf(offerId);
    if (index > -1) {
      this.newOrderForm.selectedOffers.splice(index, 1);
    } else {
      this.newOrderForm.selectedOffers.push(offerId);
    }
  }

  /**
   * Check if addon is selected
   */
  isAddonSelected(addonId: string): boolean {
    return this.newOrderForm.selectedAddons.includes(addonId);
  }

  /**
   * Check if offer is selected
   */
  isOfferSelected(offerId: string): boolean {
    return this.newOrderForm.selectedOffers.includes(offerId);
  }

  /**
   * Get plan base price
   */
  getPlanPrice(): number {
    const selectedPlan = this.availablePlans.find(p => p.name === this.newOrderForm.planType);
    return selectedPlan ? selectedPlan.price : 0;
  }

  /**
   * Get total addons price
   */
  getAddonsPrice(): number {
    return this.newOrderForm.selectedAddons.reduce((total, addonId) => {
      const addon = this.availableAddons.find(a => a.id === addonId);
      return total + (addon?.price || 0);
    }, 0);
  }

  /**
   * Get total price before discount
   */
  getTotalBeforeDiscount(): number {
    return this.getPlanPrice() + this.getAddonsPrice();
  }

  /**
   * Get calculated discount
   */
  getCalculatedDiscount(): number {
    const total = this.getTotalBeforeDiscount();
    const offerPrice = this.newOrderForm.offerPrice || 0;
    return total - offerPrice;
  }

  /**
   * Check if payment link button should be disabled
   */
  isPaymentLinkButtonDisabled(): boolean {
    // Disable if form is not valid
    if (!this.validateNewOrderForm()) {
      return true;
    }

    // Calculate the final offer price (total - discount)
    // getCalculatedDiscount() returns: total - discount amount entered
    const finalOfferPrice = this.getCalculatedDiscount();

    // Disable if final offer price is 0 or negative
    if (finalOfferPrice <= 0) {
      return true;
    }

    return false;
  }

  /**
   * Generate payment link
   */
  generatePaymentLink(): void {
    if (!this.validateNewOrderForm()) {
      this.showError('Validation Error', 'Please fill in all required fields before generating payment link.');
      return;
    }

    // Validate final offer price after discount
    const totalBeforeDiscount = this.getTotalBeforeDiscount();
    const discountAmount = this.newOrderForm.offerPrice || 0;
    const finalOfferPrice = totalBeforeDiscount - discountAmount;
    
    if (finalOfferPrice <= 0) {
      this.showError(
        'Invalid Discount', 
        `The discount amount (${this.formatCurrency(discountAmount)}) cannot be greater than or equal to the total price (${this.formatCurrency(totalBeforeDiscount)}). Final offer price would be ${this.formatCurrency(finalOfferPrice)}, which is invalid.`
      );
      return;
    }

    // First create the customer, then generate payment link
    this.isLoading = true;
    
    // Calculate renewal date
    const startDate = new Date(this.newOrderForm.startDate);
    let monthsToAdd = this.newOrderForm.planType === 'quarterly' ? 3 : 12;

    // Add free months from offers
    const freeMonths = this.newOrderForm.selectedOffers.reduce((total, offerId) => {
      const offer = this.availableOffers.find(o => o.id === offerId);
      return total + (offer?.freeMonths || 0);
    }, 0);

    monthsToAdd += freeMonths;

    const renewalDate = new Date(startDate);
    renewalDate.setMonth(renewalDate.getMonth() + monthsToAdd);

    const renewalPrice = this.newOrderForm.renewalPrice || totalBeforeDiscount;

    // Prepare customer data for API
    const customerData = {
      businessName: this.newOrderForm.businessName,
      businessEmail: this.newOrderForm.businessEmail,
      contactPerson: this.newOrderForm.clientName,
      phone: '0000000000', // Default phone, can be added to form later
      address: this.newOrderForm.businessAddress,
      gstNumber: this.newOrderForm.gstin,
      salesPerson: this.newOrderForm.salesPerson,
      responsiblePerson: this.newOrderForm.responsiblePerson,
      approvedBy: this.newOrderForm.approvedBy,
      planName: this.newOrderForm.planType === 'quarterly' ? 'Quarterly Plan' : 'Yearly Plan',
      planType: this.newOrderForm.planType === 'quarterly' ? 'Quarterly' : 'Yearly',
      startDate: startDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      amount: renewalPrice,
      planPrice: this.getPlanPrice(),
      addonsPrice: this.getAddonsPrice(),
      offerPrice: finalOfferPrice,
      renewalPrice: renewalPrice,
      addons: this.getSelectedAddonsNames(),
      offers: this.getSelectedOffersNames(),
      // Set status to 'Pending' initially (will become Active after payment)
      status: 'Pending'
    };

    // Call API to create customer
    this.adminService.createCustomer(customerData).subscribe({
      next: (response) => {
        console.log('Customer created successfully:', response);
        
        const customerId = response.data.customerId;
        
        // Now generate payment link
        this.adminService.generatePaymentLink(customerId, finalOfferPrice, `Payment for ${customerData.planName}`).subscribe({
          next: (paymentLinkResponse) => {
            console.log('Payment link generated:', paymentLinkResponse);
            
            this.generatedPaymentLink = paymentLinkResponse.data.paymentLink.shortUrl;
            this.paymentLinkGenerated = true;
            this.isLoading = false;
            
            this.showError('Success', 'Customer created and payment link generated successfully!');
          },
          error: (error) => {
            console.error('Error generating payment link:', error);
            this.isLoading = false;
            this.showError('Error', error.error?.message || 'Failed to generate payment link. Customer was created but payment link generation failed.');
          }
        });
      },
      error: (error) => {
        console.error('Error creating customer:', error);
        this.isLoading = false;
        
        let errorMessage = 'Failed to create order. Please try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 409) {
          errorMessage = 'A customer with this email already exists.';
        }
        
        this.showError('Error', errorMessage);
      }
    });
  }

  /**
   * Validate new order form
   */
  validateNewOrderForm(): boolean {
    return !!(
      this.newOrderForm.clientName &&
      this.newOrderForm.businessName &&
      this.newOrderForm.businessEmail &&
      this.newOrderForm.gstin &&
      this.newOrderForm.businessAddress &&
      this.newOrderForm.salesPerson &&
      this.newOrderForm.responsiblePerson
    );
  }

  /**
   * Copy payment link to clipboard
   */
  copyPaymentLink(): void {
    navigator.clipboard.writeText(this.generatedPaymentLink).then(() => {
      this.showError('Success', 'Payment link copied to clipboard!');
    });
  }

  /**
   * Copy payment link from order details
   */
  copyOrderPaymentLink(paymentLink: string): void {
    navigator.clipboard.writeText(paymentLink).then(() => {
      this.showError('Success', 'Payment link copied to clipboard!');
    });
  }

  /**
   * Complete order creation
   */
  completeOrder(): void {
    if (!this.paymentLinkGenerated) {
      this.showError('Error', 'Please generate payment link first before completing the order.');
      return;
    }

    // Customer already created and payment link generated
    // Just reload orders and close modal
    this.loadOrders();
    this.closeNewOrderModal();
    this.showError('Success', 'Order created successfully! Payment link has been generated and customer will be activated once payment is received.');
  }

  /**
   * Check payment status for a customer
   */
  checkPaymentStatus(customerId: string): void {
    this.isLoading = true;
    this.adminService.checkPaymentStatus(customerId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showError('Success', response.message);
          this.loadOrders();
          // Close details modal if open
          if (this.showDetailsModal) {
            this.closeDetailsModal();
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error checking payment status:', error);
        this.showError('Error', error.error?.message || 'Failed to check payment status');
        this.isLoading = false;
      }
    });
  }

  /**
   * Calculate renewal date based on plan type and offers
   */
  calculateRenewalDate(): string {
    const startDate = new Date();
    let monthsToAdd = this.newOrderForm.planType === 'quarterly' ? 3 : 12;

    // Add free months from offers
    const freeMonths = this.newOrderForm.selectedOffers.reduce((total, offerId) => {
      const offer = this.availableOffers.find(o => o.id === offerId);
      return total + (offer?.freeMonths || 0);
    }, 0);

    monthsToAdd += freeMonths;

    const renewalDate = new Date(startDate);
    renewalDate.setMonth(renewalDate.getMonth() + monthsToAdd);

    return renewalDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Get selected addons names with prices
   */
  getSelectedAddonsNames(): string[] {
    return this.newOrderForm.selectedAddons.map(addonId => {
      const addon = this.availableAddons.find(a => a.id === addonId);
      return addon ? `${addon.name} (+${this.formatCurrency(addon.price)})` : '';
    }).filter(name => name !== '');
  }

  /**
   * Get selected offers names
   */
  getSelectedOffersNames(): string[] {
    return this.newOrderForm.selectedOffers.map(offerId => {
      const offer = this.availableOffers.find(o => o.id === offerId);
      return offer?.name || '';
    }).filter(name => name !== '');
  }

  /**
   * Handle row click
   */
  onRowClick(order: Order): void {
    console.log('Order clicked:', order);
    // TODO: Open order details
  }

  /**
   * Handle view documents click
   */
  onViewDocuments(event: Event, order: Order): void {
    event.stopPropagation();
    this.selectedOrder = order;
    this.showDocumentsModal = true;
    console.log('View documents for:', order.clientDetails.businessName);
  }

  /**
   * Close documents modal
   */
  closeDocumentsModal(): void {
    this.showDocumentsModal = false;
    this.selectedOrder = null;
  }

  /**
   * Handle view details click
   */
  onViewDetails(event: Event, order: Order): void {
    event.stopPropagation();
    this.selectedOrder = order;
    this.showDetailsModal = true;
    console.log('View details for:', order.clientDetails.businessName);
  }

  /**
   * Close details modal
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedOrder = null;
    this.isEditMode = false;
    this.editForm = {};
  }

  /**
   * Calculate discount amount
   */
  getDiscount(order: Order): number {
    const totalBeforeDiscount = order.paymentDetails.planPrice + order.paymentDetails.addonsPrice;
    return totalBeforeDiscount - order.paymentDetails.offerPrice;
  }

  /**
   * Get final price after discount (what customer actually pays)
   */
  getFinalPrice(order: Order): number {
    return order.paymentDetails.offerPrice;
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
   * Get status badge classes
   */
  getStatusClasses(status: 'approved' | 'pending' | 'rejected' | 'deactivated'): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold inline-block';
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-900 text-green-200`;
      case 'pending':
        return `${baseClasses} bg-yellow-900 text-yellow-200`;
      case 'rejected':
        return `${baseClasses} bg-red-900 text-red-200`;
      case 'deactivated':
        return `${baseClasses} bg-red-900 text-red-200`;
      default:
        return baseClasses;
    }
  }

  /**
   * Get status display text
   */
  getStatusText(status: 'approved' | 'pending' | 'rejected' | 'deactivated'): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Show error dialog
   */
  showError(title: string, message: string): void {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorDialog = true;
  }

  /**
   * Close error dialog
   */
  closeErrorDialog(): void {
    this.showErrorDialog = false;
    this.errorTitle = '';
    this.errorMessage = '';
  }

  /**
   * Handle delete order click (now deactivate)
   */
  onDeleteOrder(event: Event, order: Order): void {
    event.stopPropagation();
    this.orderToDelete = order;
    this.showDeleteConfirmModal = true;
  }

  /**
   * Confirm deactivate order
   */
  confirmDeleteOrder(): void {
    if (this.orderToDelete) {
      const index = this.orders.findIndex(o => o.id === this.orderToDelete!.id);
      if (index > -1) {
        // Prepare update data to deactivate the customer
        // Set status to 'Deactivated' which will automatically set isDeactivated = true in backend
        // Also set planStatus to 'inactive'
        const updateData: Partial<AdminOrder> = {
          status: 'Deactivated',
          planStatus: 'inactive',
          performedBy: this.orderToDelete.clientDetails.responsiblePerson || 'Admin'
        } as any;

        // Call API to update customer status to deactivated
        this.adminService.updateCustomer(this.orderToDelete.id, updateData).subscribe({
          next: (response) => {
            if (response.success) {
              // Update local order status with correct values (lowercase to match interface)
              this.orders[index].status = 'deactivated';
              this.orders[index].planStatus = 'inactive';
              this.orders[index].isDeactivated = true;
              
              this.showError('Success', `Order for ${this.orderToDelete!.clientDetails.businessName} has been deactivated successfully.`);
              
              // Reload orders to get fresh data from database
              this.loadOrders();
            }
          },
          error: (error) => {
            console.error('Error deactivating customer:', error);
            this.showError('Deactivation Failed', error.error?.message || 'Failed to deactivate customer. Please try again.');
          }
        });
      }
    }
    this.closeDeleteConfirmModal();
  }

  /**
   * Close delete confirm modal
   */
  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.orderToDelete = null;
  }

  /**
   * Enable edit mode in details modal
   */
  enableEditMode(): void {
    if (this.selectedOrder) {
      this.isLoading = true;
      
      // Fetch fresh data from API
      this.adminService.getCustomerById(this.selectedOrder.id).subscribe({
        next: (customer) => {
          if (customer) {
            // Map customer data to edit form structure
            this.editForm = {
              id: customer.customerId,
              status: customer.subscription.status,
              planStatus: customer.planStatus || 'pending',
              clientDetails: {
                clientName: customer.contactPerson,
                businessName: customer.businessName,
                businessEmail: customer.businessEmail,
                businessAddress: customer.address,
                gstin: customer.gstNumber || '',
                salesPerson: customer.teamMembers?.salesPerson || '',
                responsiblePerson: customer.teamMembers?.responsiblePerson || '',
                approvedBy: customer.teamMembers?.approvedBy || 'Pending'
              },
              planDetails: {
                planType: customer.subscription.planType,
                startDate: customer.subscription.startDate,
                renewalDate: customer.subscription.nextRenewal
              },
              paymentDetails: {
                planPrice: customer.pricing?.planPrice || 0,
                addonsPrice: customer.pricing?.addonsPrice || 0,
                offerPrice: customer.pricing?.offerPrice || 0,
                renewalPrice: customer.pricing?.renewalPrice || customer.subscription.amount,
                addons: customer.pricing?.addons || [],
                offers: customer.pricing?.offers || []
              },
              documents: this.selectedOrder?.documents || [],
              auditLog: this.selectedOrder?.auditLog || []
            };
            
            this.isEditMode = true;
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error fetching customer details:', error);
          this.showError('Error', 'Failed to load customer details for editing.');
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Calculate free months from offers
   */
  calculateFreeMonthsFromOffers(offers: string[]): number {
    let freeMonths = 0;
    
    offers.forEach(offer => {
      // Check if offer contains "2 Months Free" or "1 Month Free"
      if (offer.includes('2 Months Free') || offer.includes('2 months free')) {
        freeMonths += 2;
      } else if (offer.includes('1 Month Free') || offer.includes('1 month free')) {
        freeMonths += 1;
      }
      // Note: Percentage discounts don't add free months
    });
    
    return freeMonths;
  }

  /**
   * Recalculate renewal date when plan type changes
   */
  onPlanTypeChange(): void {
    if (this.editForm && this.editForm.planDetails.startDate) {
      const startDate = new Date(this.editForm.planDetails.startDate);
      let monthsToAdd = this.editForm.planDetails.planType === 'Quarterly' ? 3 : 12;
      
      // Add free months from offers
      const freeMonths = this.calculateFreeMonthsFromOffers(this.editForm.paymentDetails.offers || []);
      monthsToAdd += freeMonths;
      
      const renewalDate = new Date(startDate);
      renewalDate.setMonth(renewalDate.getMonth() + monthsToAdd);
      
      this.editForm.planDetails.renewalDate = renewalDate.toISOString();
    }
  }

  /**
   * Recalculate renewal date when start date changes
   */
  onStartDateChange(): void {
    if (this.editForm && this.editForm.planDetails.startDate) {
      const startDate = new Date(this.editForm.planDetails.startDate);
      let monthsToAdd = this.editForm.planDetails.planType === 'Quarterly' ? 3 : 12;
      
      // Add free months from offers
      const freeMonths = this.calculateFreeMonthsFromOffers(this.editForm.paymentDetails.offers || []);
      monthsToAdd += freeMonths;
      
      const renewalDate = new Date(startDate);
      renewalDate.setMonth(renewalDate.getMonth() + monthsToAdd);
      
      this.editForm.planDetails.renewalDate = renewalDate.toISOString();
    }
  }

  /**
   * Cancel edit mode
   */
  cancelEditMode(): void {
    this.isEditMode = false;
    this.editForm = {};
  }

  /**
   * Save edited order
   */
  saveEditedOrder(): void {
    if (!this.editForm || !this.selectedOrder) return;

    // Validate required fields
    if (!this.editForm.clientDetails.clientName || 
        !this.editForm.clientDetails.businessName ||
        !this.editForm.clientDetails.gstin ||
        !this.editForm.clientDetails.businessAddress) {
      this.showError('Validation Error', 'Please fill in all required fields.');
      return;
    }

    // Prepare update data matching backend structure
    const updateData = {
      businessName: this.editForm.clientDetails.businessName,
      businessEmail: this.editForm.clientDetails.businessEmail,
      contactPerson: this.editForm.clientDetails.clientName,
      phone: this.selectedOrder.clientDetails.businessEmail, // Keep original phone
      address: this.editForm.clientDetails.businessAddress,
      gstNumber: this.editForm.clientDetails.gstin,
      salesPerson: this.editForm.clientDetails.salesPerson,
      responsiblePerson: this.editForm.clientDetails.responsiblePerson,
      approvedBy: this.editForm.clientDetails.approvedBy || 'Pending',
      planName: this.editForm.planDetails.planType, // Using planType as planName
      planType: this.editForm.planDetails.planType,
      status: this.editForm.status,
      planStatus: this.editForm.planStatus || 'pending',
      startDate: this.editForm.planDetails.startDate,
      renewalDate: this.editForm.planDetails.renewalDate,
      amount: this.editForm.paymentDetails.renewalPrice,
      planPrice: this.editForm.paymentDetails.planPrice,
      addonsPrice: this.editForm.paymentDetails.addonsPrice,
      offerPrice: this.editForm.paymentDetails.offerPrice,
      renewalPrice: this.editForm.paymentDetails.renewalPrice,
      addons: this.editForm.paymentDetails.addons || [],
      offers: this.editForm.paymentDetails.offers || [],
      performedBy: this.editForm.clientDetails.responsiblePerson || 'Admin' // Track who made the change
    };

    // Get the customerId from the order
    const customerId = this.selectedOrder.id;

    // Call API to update customer
    this.adminService.updateCustomer(customerId, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the order in the local array
          const index = this.orders.findIndex(o => o.id === this.selectedOrder!.id);
          if (index > -1) {
            this.orders[index] = { ...this.editForm };
            this.selectedOrder = this.orders[index];
          }
          
          this.isEditMode = false;
          this.showError('Success', 'Customer updated successfully!');
          
          // Reload orders to get fresh data
          this.loadOrders();
        }
      },
      error: (error) => {
        console.error('Error updating customer:', error);
        this.showError('Update Failed', error.error?.message || 'Failed to update customer. Please try again.');
      }
    });
  }

  /**
   * Open add addon modal
   */
  openAddAddonModal(): void {
    this.showManagePlansModal = false;
    this.showAddonFormModal = true;
    this.isEditingAddon = false;
    this.addonForm = {
      _id: null,
      name: '',
      displayName: '',
      price: 0,
      description: ''
    };
  }

  /**
   * Close add addon modal
   */
  closeAddAddonModal(): void {
    this.showAddonFormModal = false;
    this.isEditingAddon = false;
    this.addonForm = {
      _id: null,
      name: '',
      displayName: '',
      price: 0,
      description: '',
      applicablePlans: []
    };
  }

  /**
   * Edit addon
   */
  editAddon(addon: any): void {
    this.isEditingAddon = true;
    this.addonForm = {
      _id: addon.id,
      name: addon.name,
      displayName: addon.displayName,
      price: addon.price,
      description: addon.description || '',
      applicablePlans: addon.applicablePlans || []
    };
    this.showAddonFormModal = true;
  }

  /**
   * Save addon (create or update)
   */
  saveAddon(): void {
    if (!this.addonForm.displayName || this.addonForm.price <= 0) {
      this.showError('Validation Error', 'Please enter a valid addon name and price.');
      return;
    }

    // Generate name from displayName if not editing
    if (!this.isEditingAddon) {
      this.addonForm.name = this.addonForm.displayName.toLowerCase().replace(/\s+/g, '-');
    }

    const addonData = {
      name: this.addonForm.name,
      displayName: this.addonForm.displayName,
      price: this.addonForm.price,
      description: this.addonForm.description,
      applicablePlans: this.addonForm.applicablePlans
    };

    if (this.isEditingAddon && this.addonForm._id) {
      // Update existing addon
      this.adminService.updateAddon(this.addonForm._id, addonData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Addon updated successfully!');
            this.loadAddons();
            this.closeAddAddonModal();
          }
        },
        error: (error) => {
          console.error('Error updating addon:', error);
          this.showError('Error', error.error?.message || 'Failed to update addon.');
        }
      });
    } else {
      // Create new addon
      this.adminService.createAddon(addonData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Addon created successfully!');
            this.loadAddons();
            this.closeAddAddonModal();
          }
        },
        error: (error) => {
          console.error('Error creating addon:', error);
          this.showError('Error', error.error?.message || 'Failed to create addon.');
        }
      });
    }
  }

  /**
   * Delete addon
   */
  deleteAddon(addonId: string): void {
    const addon = this.availableAddons.find(a => a.id === addonId);
    console.log('Delete addon called with ID:', addonId);
    console.log('Found addon:', addon);
    console.log('Available addons:', this.availableAddons);
    if (addon) {
      this.addonToDelete = addon;
      this.showDeleteAddonConfirmModal = true;
    }
  }

  /**
   * Confirm addon deletion
   */
  confirmDeleteAddon(): void {
    if (this.addonToDelete) {
      this.adminService.deleteAddon(this.addonToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Addon deleted successfully!');
            this.loadAddons();
            this.closeDeleteAddonConfirmModal();
          }
        },
        error: (error) => {
          console.error('Error deleting addon:', error);
          this.showError('Error', error.error?.message || 'Failed to delete addon.');
          this.closeDeleteAddonConfirmModal();
        }
      });
    }
  }

  /**
   * Close delete addon confirmation modal
   */
  closeDeleteAddonConfirmModal(): void {
    this.showDeleteAddonConfirmModal = false;
    this.addonToDelete = null;
  }

  /**
   * Open add offer modal
   */
  openAddOfferModal(): void {
    this.showManagePlansModal = false;
    this.showOfferFormModal = true;
    this.isEditingOffer = false;
    this.offerForm = {
      _id: null,
      name: '',
      displayName: '',
      freeMonths: 0,
      discountPercentage: 0,
      description: ''
    };
  }

  /**
   * Close add offer modal
   */
  closeAddOfferModal(): void {
    this.showOfferFormModal = false;
    this.isEditingOffer = false;
    this.offerForm = {
      _id: null,
      name: '',
      displayName: '',
      freeMonths: 0,
      discountPercentage: 0,
      description: '',
      applicablePlans: []
    };
  }

  /**
   * Edit offer
   */
  editOffer(offer: any): void {
    this.isEditingOffer = true;
    this.offerForm = {
      _id: offer.id,
      name: offer.name,
      displayName: offer.displayName,
      freeMonths: offer.freeMonths || 0,
      discountPercentage: offer.discountPercentage || 0,
      description: offer.description || '',
      applicablePlans: offer.applicablePlans || []
    };
    this.showOfferFormModal = true;
  }

  /**
   * Save offer (create or update)
   */
  saveOffer(): void {
    if (!this.offerForm.displayName) {
      this.showError('Validation Error', 'Please enter a valid offer name.');
      return;
    }

    // Generate name from displayName if not editing
    if (!this.isEditingOffer) {
      this.offerForm.name = this.offerForm.displayName.toLowerCase().replace(/\s+/g, '-');
    }

    const offerData = {
      name: this.offerForm.name,
      displayName: this.offerForm.displayName,
      freeMonths: this.offerForm.freeMonths || 0,
      discountPercentage: this.offerForm.discountPercentage || 0,
      description: this.offerForm.description,
      applicablePlans: this.offerForm.applicablePlans
    };

    if (this.isEditingOffer && this.offerForm._id) {
      // Update existing offer
      this.adminService.updateSpecialOffer(this.offerForm._id, offerData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Special offer updated successfully!');
            this.loadOffers();
            this.closeAddOfferModal();
          }
        },
        error: (error) => {
          console.error('Error updating offer:', error);
          this.showError('Error', error.error?.message || 'Failed to update offer.');
        }
      });
    } else {
      // Create new offer
      this.adminService.createSpecialOffer(offerData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Special offer created successfully!');
            this.loadOffers();
            this.closeAddOfferModal();
          }
        },
        error: (error) => {
          console.error('Error creating offer:', error);
          this.showError('Error', error.error?.message || 'Failed to create offer.');
        }
      });
    }
  }

  /**
   * Delete offer
   */
  deleteOffer(offerId: string): void {
    const offer = this.availableOffers.find(o => o.id === offerId);
    if (offer) {
      this.offerToDelete = offer;
      this.showDeleteOfferConfirmModal = true;
    }
  }

  /**
   * Confirm offer deletion
   */
  confirmDeleteOffer(): void {
    if (this.offerToDelete) {
      this.adminService.deleteSpecialOffer(this.offerToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Special offer deleted successfully!');
            this.loadOffers();
            this.closeDeleteOfferConfirmModal();
          }
        },
        error: (error) => {
          console.error('Error deleting offer:', error);
          this.showError('Error', error.error?.message || 'Failed to delete offer.');
          this.closeDeleteOfferConfirmModal();
        }
      });
    }
  }

  /**
   * Close delete offer confirmation modal
   */
  closeDeleteOfferConfirmModal(): void {
    this.showDeleteOfferConfirmModal = false;
    this.offerToDelete = null;
  }

  /**
   * Get plan status badge classes (for payment status: active/dormant/inactive)
   */
  getPlanStatusClasses(status: 'active' | 'dormant' | 'inactive'): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold inline-block';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-900 text-green-200`;
      case 'dormant':
        return `${baseClasses} bg-yellow-900 text-yellow-200`;
      case 'inactive':
        return `${baseClasses} bg-red-900 text-red-200`;
      default:
        return baseClasses;
    }
  }

  /**
   * Get plan status display text (for payment status: active/dormant/inactive)
   */
  getPlanStatusText(status: 'active' | 'dormant' | 'inactive'): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Generate calendar for current month
   */
  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    this.calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push({ date: null, renewals: [] });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push({
        date: date,
        day: day,
        renewals: []
      });
    }
  }

  /**
   * Map renewal dates to calendar
   */
  mapRenewalDates(): void {
    this.renewalsByDate.clear();
    
    this.orders.forEach(order => {
      const renewalDateStr = order.planDetails.renewalDate;
      const dateKey = this.getDateKey(renewalDateStr);
      
      if (!this.renewalsByDate.has(dateKey)) {
        this.renewalsByDate.set(dateKey, []);
      }
      this.renewalsByDate.get(dateKey)!.push(order);
    });
    
    // Update calendar days with renewals
    this.calendarDays.forEach(day => {
      if (day.date) {
        const dateKey = this.formatDateKey(day.date);
        day.renewals = this.renewalsByDate.get(dateKey) || [];
      }
    });
  }

  /**
   * Get date key from date string (e.g., "01 Mar 2025")
   */
  getDateKey(dateStr: string): string {
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]];
      const year = parseInt(parts[2]);
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  /**
   * Format date to key
   */
  formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  /**
   * Get month name
   */
  getMonthName(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long' });
  }

  /**
   * Previous month
   */
  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
    this.mapRenewalDates();
  }

  /**
   * Next month
   */
  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
    this.mapRenewalDates();
  }

  /**
   * Is today
   */
  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Get document status badge classes
   */
  getDocumentStatusClasses(status: 'signed' | 'not-signed' | 'skipped'): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold inline-block';
    switch (status) {
      case 'signed':
        return `${baseClasses} bg-green-900 text-green-200`;
      case 'not-signed':
        return `${baseClasses} bg-red-900 text-red-200`;
      case 'skipped':
        return `${baseClasses} bg-gray-700 text-gray-300`;
      default:
        return baseClasses;
    }
  }

  /**
   * Get document status text
   */
  getDocumentStatusText(status: 'signed' | 'not-signed' | 'skipped'): string {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'not-signed':
        return 'Not Signed';
      case 'skipped':
        return 'Skipped';
      default:
        return status;
    }
  }

  /**
   * Mark document as signed
   */
  markDocumentAsSigned(document: Document): void {
    if (this.selectedOrder) {
      const orderIndex = this.orders.findIndex(o => o.id === this.selectedOrder!.id);
      if (orderIndex > -1) {
        const docIndex = this.orders[orderIndex].documents.findIndex(d => d.id === document.id);
        if (docIndex > -1) {
          this.orders[orderIndex].documents[docIndex].status = 'signed';
          
          // Add audit log entry
          const currentTimestamp = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          
          this.addAuditLogEntry(this.selectedOrder.id, {
            timestamp: currentTimestamp,
            eventType: 'document_signed',
            description: `${document.name} signed`,
            action: `${document.name} signed`,
            details: `Client signed the ${document.name} document`,
            performedBy: this.selectedOrder.clientDetails.clientName,
            user: this.selectedOrder.clientDetails.clientName
          });
          
          // Update selected order reference
          this.selectedOrder = this.orders[orderIndex];
        }
      }
    }
  }

  /**
   * Skip document
   */
  skipDocument(document: Document): void {
    if (this.selectedOrder) {
      const orderIndex = this.orders.findIndex(o => o.id === this.selectedOrder!.id);
      if (orderIndex > -1) {
        const docIndex = this.orders[orderIndex].documents.findIndex(d => d.id === document.id);
        if (docIndex > -1) {
          this.orders[orderIndex].documents[docIndex].status = 'skipped';
          
          // Add audit log entry
          const currentTimestamp = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          
          this.addAuditLogEntry(this.selectedOrder.id, {
            timestamp: currentTimestamp,
            eventType: 'edit',
            description: `${document.name} skipped`,
            action: `${document.name} skipped`,
            details: `Document ${document.name} was marked as skipped`,
            performedBy: this.selectedOrder.clientDetails.responsiblePerson,
            user: this.selectedOrder.clientDetails.responsiblePerson
          });
          
          // Update selected order reference
          this.selectedOrder = this.orders[orderIndex];
        }
      }
    }
  }

  /**
   * Open document in new tab
   */
  openDocument(url: string): void {
    window.open(url, '_blank');
  }

  /**
   * Format date from input (YYYY-MM-DD) to display format (DD MMM YYYY)
   */
  formatDateFromInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Format date to input format (YYYY-MM-DD) from display format (DD MMM YYYY)
   */
  formatDateToInput(dateString: string): string {
    if (!dateString) return '';
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const parts = dateString.split(' ');
    if (parts.length === 3) {
      const day = parts[0];
      const month = months[parts[1]];
      const year = parts[2];
      const date = new Date(parseInt(year), month, parseInt(day));
      return date.toISOString().split('T')[0];
    }
    return '';
  }

  /**
   * Get audit log icon based on event type
   */
  getAuditLogIcon(eventType: string): string {
    switch (eventType) {
      case 'order_created':
        return 'M12 4v16m8-8H4';
      case 'status_change':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'payment_status_change':
        return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
      case 'plan_change':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'price_change':
        return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'document_signed':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'renewal':
        return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
      case 'edit':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'note':
        return 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  /**
   * Get audit log color based on event type
   */
  getAuditLogColor(eventType: string): string {
    switch (eventType) {
      case 'order_created':
        return 'text-blue-400';
      case 'status_change':
        return 'text-green-400';
      case 'payment_status_change':
        return 'text-yellow-400';
      case 'plan_change':
        return 'text-purple-400';
      case 'price_change':
        return 'text-orange-400';
      case 'document_signed':
        return 'text-teal-400';
      case 'renewal':
        return 'text-indigo-400';
      case 'edit':
        return 'text-pink-400';
      case 'note':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Add audit log entry
   */
  addAuditLogEntry(orderId: string, entry: Omit<AuditLog, 'id'>): void {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const newEntry: AuditLog = {
        ...entry,
        id: `log${orderId}-${Date.now()}`
      };
      this.orders[orderIndex].auditLog.push(newEntry);
    }
  }

  navigateToCalendar() {
    this.router.navigate(['/calendar']);
  }

  // ==================== PLAN MANAGEMENT ====================

  /**
   * Open manage plans modal
   */
  openManagePlansModal(): void {
    this.showManagePlansModal = true;
  }

  /**
   * Close manage plans modal
   */
  closeManagePlansModal(): void {
    this.showManagePlansModal = false;
  }

  /**
   * Open plan form modal for creating new plan
   */
  openPlanFormModal(): void {
    this.isEditingPlan = false;
    this.planForm = {
      _id: null,
      name: '',
      displayName: '',
      duration: 0,
      price: 0,
      features: []
    };
    this.currentFeature = '';
    this.showPlanFormModal = true;
  }

  /**
   * Close plan form modal
   */
  closePlanFormModal(): void {
    this.showPlanFormModal = false;
    this.isEditingPlan = false;
    this.planForm = {
      _id: null,
      name: '',
      displayName: '',
      duration: 0,
      price: 0,
      features: []
    };
    this.currentFeature = '';
  }

  /**
   * Edit plan
   */
  editPlan(plan: any): void {
    this.isEditingPlan = true;
    this.planForm = {
      _id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      duration: plan.duration,
      price: plan.price,
      features: [...(plan.features || [])] // Create a copy of the features array
    };
    this.currentFeature = '';
    this.showPlanFormModal = true;
  }

  /**
   * Save plan (create or update)
   */
  savePlan(): void {
    if (!this.planForm.displayName || this.planForm.duration <= 0 || this.planForm.price <= 0) {
      this.showError('Validation Error', 'Please enter valid plan details.');
      return;
    }

    // Generate name from displayName if not editing
    if (!this.isEditingPlan) {
      this.planForm.name = this.planForm.displayName.toLowerCase().replace(/\s+/g, '-');
    }

    const planData = {
      name: this.planForm.name,
      displayName: this.planForm.displayName,
      duration: this.planForm.duration,
      price: this.planForm.price,
      features: this.planForm.features || []
    };

    if (this.isEditingPlan && this.planForm._id) {
      // Update existing plan
      this.adminService.updatePlan(this.planForm._id, planData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Plan updated successfully!');
            this.loadPlans();
            this.closePlanFormModal();
          }
        },
        error: (error) => {
          console.error('Error updating plan:', error);
          this.showError('Error', error.error?.message || 'Failed to update plan.');
        }
      });
    } else {
      // Create new plan
      this.adminService.createPlan(planData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Plan created successfully!');
            this.loadPlans();
            this.closePlanFormModal();
          }
        },
        error: (error) => {
          console.error('Error creating plan:', error);
          this.showError('Error', error.error?.message || 'Failed to create plan.');
        }
      });
    }
  }

  /**
   * Delete plan
   */
  deletePlan(planId: string): void {
    const plan = this.availablePlans.find(p => p.id === planId);
    console.log('Delete plan called with ID:', planId);
    console.log('Found plan:', plan);
    console.log('Available plans:', this.availablePlans);
    if (plan) {
      this.planToDelete = plan;
      this.showDeletePlanConfirmModal = true;
    }
  }

  /**
   * Confirm plan deletion
   */
  confirmDeletePlan(): void {
    if (this.planToDelete) {
      this.adminService.deletePlan(this.planToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showError('Success', 'Plan deleted successfully!');
            this.loadPlans();
            this.closeDeletePlanConfirmModal();
          }
        },
        error: (error) => {
          console.error('Error deleting plan:', error);
          this.showError('Error', error.error?.message || 'Failed to delete plan.');
          this.closeDeletePlanConfirmModal();
        }
      });
    }
  }

  /**
   * Close delete plan confirmation modal
   */
  closeDeletePlanConfirmModal(): void {
    this.showDeletePlanConfirmModal = false;
    this.planToDelete = null;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
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
  formatAuditValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
      const date = new Date(value);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number') {
      // Check if it looks like a price
      if (value > 1000) {
        return this.formatCurrency(value);
      }
    }
    return String(value);
  }

  /**
   * Format timestamp for audit log
   */
  formatAuditTimestamp(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Check if addon plan is selected
   */
  isAddonPlanSelected(planName: string): boolean {
    return this.addonForm.applicablePlans && this.addonForm.applicablePlans.includes(planName);
  }

  /**
   * Toggle addon plan selection
   */
  toggleAddonPlan(planName: string): void {
    if (!this.addonForm.applicablePlans) {
      this.addonForm.applicablePlans = [];
    }
    
    const index = this.addonForm.applicablePlans.indexOf(planName);
    if (index > -1) {
      this.addonForm.applicablePlans.splice(index, 1);
    } else {
      this.addonForm.applicablePlans.push(planName);
    }
  }

  /**
   * Check if offer plan is selected
   */
  isOfferPlanSelected(planName: string): boolean {
    return this.offerForm.applicablePlans && this.offerForm.applicablePlans.includes(planName);
  }

  /**
   * Toggle offer plan selection
   */
  toggleOfferPlan(planName: string): void {
    if (!this.offerForm.applicablePlans) {
      this.offerForm.applicablePlans = [];
    }
    
    const index = this.offerForm.applicablePlans.indexOf(planName);
    if (index > -1) {
      this.offerForm.applicablePlans.splice(index, 1);
    } else {
      this.offerForm.applicablePlans.push(planName);
    }
  }

  /**
   * Get applicable plans text for display
   */
  getApplicablePlansText(applicablePlans: string[]): string {
    if (!applicablePlans || applicablePlans.length === 0) {
      return 'All plans';
    }
    
    const planNames = applicablePlans.map(planName => {
      const plan = this.availablePlans.find(p => p.name === planName);
      return plan ? plan.displayName : planName;
    });
    
    return planNames.join(', ');
  }

  /**
   * Add feature to plan
   */
  addFeature(): void {
    if (this.currentFeature && this.currentFeature.trim()) {
      const feature = this.currentFeature.trim();
      if (!this.planForm.features) {
        this.planForm.features = [];
      }
      if (!this.planForm.features.includes(feature)) {
        this.planForm.features.push(feature);
        this.currentFeature = '';
      }
    }
  }

  /**
   * Remove feature from plan
   */
  removeFeature(index: number): void {
    if (this.planForm.features && index >= 0 && index < this.planForm.features.length) {
      this.planForm.features.splice(index, 1);
    }
  }

  /**
   * Handle Enter key press in feature input
   */
  onFeatureKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addFeature();
    }
  }
}
