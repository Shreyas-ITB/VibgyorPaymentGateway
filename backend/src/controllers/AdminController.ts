import { Request, Response } from 'express';
import Customer from '../models/Customer';

/**
 * Get all customers
 * GET /api/admin/customers
 */
export const getAllCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: customers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Get customers with renewals in a specific month
 * GET /api/admin/customers/renewals?year=2026&month=3
 */
export const getCustomersByMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        message: 'Year and month parameters are required'
      });
      return;
    }

    const yearNum = parseInt(year as string, 10);
    const monthNum = parseInt(month as string, 10);

    // Create date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Find customers with renewals in this month
    const customers = await Customer.find({
      'subscription.nextRenewal': {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ 'subscription.nextRenewal': 1 });

    res.status(200).json({
      success: true,
      message: 'Renewals retrieved successfully',
      data: customers
    });
  } catch (error) {
    console.error('Error fetching renewals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Get customer by ID
 * GET /api/admin/customers/:customerId
 */
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Update customer
 * PUT /api/admin/customers/:customerId
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const {
      businessName,
      businessEmail,
      contactPerson,
      phone,
      address,
      gstNumber,
      salesPerson,
      responsiblePerson,
      approvedBy,
      planName,
      planType,
      status,
      planStatus,
      startDate,
      renewalDate,
      amount,
      planPrice,
      addonsPrice,
      offerPrice,
      renewalPrice,
      addons,
      offers,
      performedBy = 'Admin' // Who made the change
    } = req.body;

    // Find the customer first
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Track changes for audit log
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    let actionDescription = 'Customer Updated';

    // Update basic fields if provided and track changes
    if (businessName !== undefined && customer.businessName !== businessName) {
      changes.push({ field: 'businessName', oldValue: customer.businessName, newValue: businessName });
      customer.businessName = businessName;
    }
    if (businessEmail !== undefined && customer.businessEmail !== businessEmail.toLowerCase()) {
      changes.push({ field: 'businessEmail', oldValue: customer.businessEmail, newValue: businessEmail.toLowerCase() });
      customer.businessEmail = businessEmail.toLowerCase();
    }
    if (contactPerson !== undefined && customer.contactPerson !== contactPerson) {
      changes.push({ field: 'contactPerson', oldValue: customer.contactPerson, newValue: contactPerson });
      customer.contactPerson = contactPerson;
    }
    if (phone !== undefined && customer.phone !== phone) {
      changes.push({ field: 'phone', oldValue: customer.phone, newValue: phone });
      customer.phone = phone;
    }
    if (address !== undefined && customer.address !== address) {
      changes.push({ field: 'address', oldValue: customer.address, newValue: address });
      customer.address = address;
    }
    if (gstNumber !== undefined && customer.gstNumber !== gstNumber) {
      changes.push({ field: 'gstNumber', oldValue: customer.gstNumber, newValue: gstNumber });
      customer.gstNumber = gstNumber;
    }

    // Update team members if provided and track changes
    if (salesPerson !== undefined && customer.teamMembers.salesPerson !== salesPerson) {
      changes.push({ field: 'salesPerson', oldValue: customer.teamMembers.salesPerson, newValue: salesPerson });
      customer.teamMembers.salesPerson = salesPerson;
    }
    if (responsiblePerson !== undefined && customer.teamMembers.responsiblePerson !== responsiblePerson) {
      changes.push({ field: 'responsiblePerson', oldValue: customer.teamMembers.responsiblePerson, newValue: responsiblePerson });
      customer.teamMembers.responsiblePerson = responsiblePerson;
    }
    if (approvedBy !== undefined && customer.teamMembers.approvedBy !== approvedBy) {
      changes.push({ field: 'approvedBy', oldValue: customer.teamMembers.approvedBy, newValue: approvedBy });
      customer.teamMembers.approvedBy = approvedBy;
    }

    // Update subscription if provided and track changes
    if (planName !== undefined && customer.subscription.planName !== planName) {
      changes.push({ field: 'planName', oldValue: customer.subscription.planName, newValue: planName });
      customer.subscription.planName = planName;
      actionDescription = 'Plan Changed';
    }
    if (planType !== undefined && customer.subscription.planType !== planType) {
      changes.push({ field: 'planType', oldValue: customer.subscription.planType, newValue: planType });
      customer.subscription.planType = planType;
      actionDescription = 'Plan Type Changed';
    }
    if (status !== undefined && customer.subscription.status !== status) {
      changes.push({ field: 'status', oldValue: customer.subscription.status, newValue: status });
      customer.subscription.status = status;
      
      // Automatically set isDeactivated based on status
      const wasDeactivated = customer.isDeactivated;
      customer.isDeactivated = (status === 'Deactivated');
      
      if (wasDeactivated !== customer.isDeactivated) {
        changes.push({ field: 'isDeactivated', oldValue: wasDeactivated, newValue: customer.isDeactivated });
      }
      
      // Automatically set planStatus to 'inactive' when deactivating
      if (status === 'Deactivated' && customer.planStatus !== 'inactive') {
        changes.push({ field: 'planStatus', oldValue: customer.planStatus, newValue: 'inactive' });
        customer.planStatus = 'inactive';
      }
      
      actionDescription = status === 'Deactivated' ? 'Order Deactivated' : 'Subscription Status Changed';
    }
    
    // Update planStatus (payment status)
    if (planStatus !== undefined && customer.planStatus !== planStatus) {
      changes.push({ field: 'planStatus', oldValue: customer.planStatus, newValue: planStatus });
      customer.planStatus = planStatus;
      actionDescription = 'Plan Status Changed';
    }
    
    if (startDate !== undefined) {
      const newStartDate = new Date(startDate);
      if (customer.subscription.startDate.getTime() !== newStartDate.getTime()) {
        changes.push({ field: 'startDate', oldValue: customer.subscription.startDate, newValue: newStartDate });
        customer.subscription.startDate = newStartDate;
      }
    }
    if (renewalDate !== undefined) {
      const newRenewalDate = new Date(renewalDate);
      if (customer.subscription.nextRenewal.getTime() !== newRenewalDate.getTime()) {
        changes.push({ field: 'nextRenewal', oldValue: customer.subscription.nextRenewal, newValue: newRenewalDate });
        customer.subscription.nextRenewal = newRenewalDate;
      }
    }
    if (amount !== undefined && customer.subscription.amount !== amount) {
      changes.push({ field: 'amount', oldValue: customer.subscription.amount, newValue: amount });
      customer.subscription.amount = amount;
    }

    // Update pricing if provided and track changes
    if (planPrice !== undefined && customer.pricing.planPrice !== planPrice) {
      changes.push({ field: 'planPrice', oldValue: customer.pricing.planPrice, newValue: planPrice });
      customer.pricing.planPrice = planPrice;
    }
    if (addonsPrice !== undefined && customer.pricing.addonsPrice !== addonsPrice) {
      changes.push({ field: 'addonsPrice', oldValue: customer.pricing.addonsPrice, newValue: addonsPrice });
      customer.pricing.addonsPrice = addonsPrice;
    }
    if (offerPrice !== undefined && customer.pricing.offerPrice !== offerPrice) {
      changes.push({ field: 'offerPrice', oldValue: customer.pricing.offerPrice, newValue: offerPrice });
      customer.pricing.offerPrice = offerPrice;
    }
    if (renewalPrice !== undefined && customer.pricing.renewalPrice !== renewalPrice) {
      changes.push({ field: 'renewalPrice', oldValue: customer.pricing.renewalPrice, newValue: renewalPrice });
      customer.pricing.renewalPrice = renewalPrice;
    }
    if (addons !== undefined && JSON.stringify(customer.pricing.addons) !== JSON.stringify(addons)) {
      changes.push({ field: 'addons', oldValue: customer.pricing.addons, newValue: addons });
      customer.pricing.addons = addons;
    }
    if (offers !== undefined && JSON.stringify(customer.pricing.offers) !== JSON.stringify(offers)) {
      changes.push({ field: 'offers', oldValue: customer.pricing.offers, newValue: offers });
      customer.pricing.offers = offers;
    }

    // Add audit log entry if there were changes
    if (changes.length > 0) {
      customer.auditLog.push({
        timestamp: new Date(),
        action: actionDescription,
        performedBy,
        details: `${changes.length} field(s) updated`,
        changes
      } as any);
    }

    // Save the updated customer
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Delete customer
 * DELETE /api/admin/customers/:customerId
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOneAndDelete({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
      data: { customerId }
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Create new customer
 * POST /api/admin/customers
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      businessName,
      businessEmail,
      contactPerson,
      phone,
      address,
      gstNumber,
      salesPerson,
      responsiblePerson,
      approvedBy = 'Pending',
      planName,
      planType,
      startDate,
      renewalDate,
      amount,
      planPrice,
      addonsPrice = 0,
      offerPrice,
      renewalPrice,
      addons = [],
      offers = [],
      status = 'Pending'
    } = req.body;

    // Validate required fields
    if (!businessName || !businessEmail || !contactPerson || !phone || !address || 
        !salesPerson || !responsiblePerson || !planName || !planType || 
        !startDate || !renewalDate || !amount || !planPrice || !offerPrice || !renewalPrice) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    // Check if customer with this email already exists
    const existingCustomer = await Customer.findOne({ businessEmail: businessEmail.toLowerCase() });
    if (existingCustomer) {
      res.status(409).json({
        success: false,
        message: 'Customer with this email already exists'
      });
      return;
    }

    // Generate unique customer ID
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create new customer
    const customer = new Customer({
      customerId,
      businessName,
      businessEmail: businessEmail.toLowerCase(),
      contactPerson,
      phone,
      address,
      gstNumber: gstNumber || null,
      teamMembers: {
        salesPerson,
        responsiblePerson,
        approvedBy
      },
      subscription: {
        planName,
        planType,
        status,
        startDate: new Date(startDate),
        nextRenewal: new Date(renewalDate),
        amount
      },
      pricing: {
        planPrice,
        addonsPrice,
        offerPrice,
        renewalPrice,
        addons,
        offers
      },
      paymentHistory: [],
      auditLog: [
        {
          timestamp: new Date(),
          action: 'Customer Created',
          performedBy: salesPerson,
          details: `New customer account created for ${businessName}`,
          changes: [
            { field: 'businessName', oldValue: null, newValue: businessName },
            { field: 'businessEmail', oldValue: null, newValue: businessEmail.toLowerCase() },
            { field: 'planName', oldValue: null, newValue: planName },
            { field: 'planType', oldValue: null, newValue: planType },
            { field: 'status', oldValue: null, newValue: status },
            { field: 'offerPrice', oldValue: null, newValue: offerPrice },
            { field: 'renewalPrice', oldValue: null, newValue: renewalPrice }
          ]
        }
      ]
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Handle duplicate key error
    if ((error as any).code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Customer with this email or ID already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Generate payment link for a customer
 * POST /api/admin/customers/:customerId/payment-link
 */
export const generatePaymentLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { amount, description } = req.body;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Validate amount (Razorpay test mode limit is typically ₹50,000)
    const maxAmount = 50000; // ₹50,000 for test mode
    if (amount > maxAmount) {
      res.status(400).json({
        success: false,
        message: `Amount (₹${amount.toLocaleString('en-IN')}) exceeds Razorpay test mode limit of ₹${maxAmount.toLocaleString('en-IN')}. Please use a lower amount or switch to live mode.`
      });
      return;
    }

    console.log('Generating payment link:', {
      customerId,
      amount,
      amountInPaise: amount * 100,
      customer: customer.businessName,
      phone: customer.phone
    });

    // Import RazorpayProvider
    const { RazorpayProvider } = await import('../providers/RazorpayProvider');
    const razorpay = new RazorpayProvider();

    // Create payment link with shortened reference_id (max 40 chars)
    // Use last 8 chars of customerId + timestamp (last 10 digits)
    const shortCustomerId = customerId.slice(-8);
    const timestamp = Date.now().toString().slice(-10);
    const referenceId = `${shortCustomerId}_${timestamp}`;

    // Use valid test phone number if customer phone is invalid (all zeros or repeating digits)
    const validPhone = /^(\d)\1{9}$/.test(customer.phone) ? '9876543210' : customer.phone;

    const paymentLink = await razorpay.createPaymentLink(
      amount * 100, // Convert to paise
      'INR',
      {
        name: customer.contactPerson,
        email: customer.businessEmail,
        contact: validPhone
      },
      description || `Payment for ${customer.subscription.planName}`,
      referenceId,
      process.env.PAYMENT_CALLBACK_URL
    );

    // Update customer with payment link details
    customer.paymentLink = {
      id: paymentLink.id,
      shortUrl: paymentLink.shortUrl,
      status: 'created',
      createdAt: paymentLink.createdAt,
      expiresAt: paymentLink.expiresAt
    };

    // Set plan status to dormant (waiting for payment)
    customer.planStatus = 'dormant';

    // Add audit log
    customer.auditLog.push({
      timestamp: new Date(),
      action: 'Payment Link Generated',
      performedBy: customer.teamMembers.responsiblePerson || 'Admin',
      details: `Payment link generated for ${amount} INR`,
      changes: []
    });

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Payment link generated successfully',
      data: {
        paymentLink: customer.paymentLink
      }
    });
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment link',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Check payment link status and update customer if paid
 * POST /api/admin/customers/:customerId/check-payment
 */
export const checkPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    if (!customer.paymentLink || !customer.paymentLink.id) {
      res.status(400).json({
        success: false,
        message: 'No payment link found for this customer'
      });
      return;
    }

    // Import RazorpayProvider
    const { RazorpayProvider } = await import('../providers/RazorpayProvider');
    const razorpay = new RazorpayProvider();

    // Fetch payment link status from Razorpay
    const paymentLinkData = await razorpay.fetchPaymentLinkStatus(customer.paymentLink.id);

    console.log('Payment link status:', {
      id: paymentLinkData.id,
      status: paymentLinkData.status,
      amount_paid: paymentLinkData.amount_paid
    });

    // Update customer payment link status
    customer.paymentLink.status = paymentLinkData.status;

    // If payment link is paid, update customer status
    if (paymentLinkData.status === 'paid') {
      // Update plan status to active (payment verified)
      // Note: subscription.status (approval status) remains unchanged - requires manual manager approval
      customer.planStatus = 'active';

      // Add payment to history if not already added
      const paymentExists = customer.paymentHistory.some(
        p => p.paymentId === paymentLinkData.payments?.[0]?.payment_id
      );

      if (!paymentExists && paymentLinkData.payments && paymentLinkData.payments.length > 0) {
        const payment = paymentLinkData.payments[0];
        customer.paymentHistory.push({
          paymentId: payment.payment_id,
          date: new Date(payment.created_at * 1000),
          amount: payment.amount / 100,
          status: 'Success',
          method: payment.method || 'online',
          invoiceUrl: undefined
        });
      }

      // Add audit log
      customer.auditLog.push({
        timestamp: new Date(),
        action: 'Payment Verified',
        performedBy: 'System',
        details: `Payment of ₹${paymentLinkData.amount_paid / 100} verified. Plan status updated to active.`,
        changes: [
          { field: 'planStatus', oldValue: 'dormant', newValue: 'active' }
        ]
      });

      await customer.save();

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully. Plan status updated to active. Order approval status remains unchanged and requires manual verification.',
        data: {
          status: paymentLinkData.status,
          amountPaid: paymentLinkData.amount_paid / 100,
          customer: {
            planStatus: customer.planStatus,
            subscriptionStatus: customer.subscription.status
          }
        }
      });
    } else {
      await customer.save();

      // Provide user-friendly message based on status
      let statusMessage = '';
      if (paymentLinkData.status === 'created') {
        statusMessage = 'Customer hasn\'t made the payment yet. The payment link is still active and waiting for payment.';
      } else if (paymentLinkData.status === 'expired') {
        statusMessage = 'Payment link has expired. Please generate a new payment link.';
      } else if (paymentLinkData.status === 'cancelled') {
        statusMessage = 'Payment link was cancelled.';
      } else {
        statusMessage = `Payment link status: ${paymentLinkData.status}`;
      }

      res.status(200).json({
        success: true,
        message: statusMessage,
        data: {
          status: paymentLinkData.status,
          amountPaid: paymentLinkData.amount_paid / 100
        }
      });
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Test lifecycle check (manual trigger)
 * POST /api/admin/test-lifecycle
 */
export const testLifecycleCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const { SchedulerService } = require('../services');
    const scheduler = new SchedulerService();
    
    await scheduler.runLifecycleCheckNow();
    
    res.status(200).json({
      success: true,
      message: 'Lifecycle check completed successfully. Check server logs for details.'
    });
  } catch (error) {
    console.error('Error running lifecycle check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run lifecycle check',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};
