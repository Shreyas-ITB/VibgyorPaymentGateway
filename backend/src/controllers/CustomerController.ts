import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { InvoiceService } from '../services/InvoiceService';
import { ReceiptService } from '../services/ReceiptService';

const invoiceService = new InvoiceService();
const receiptService = new ReceiptService();

/**
 * Decode base64 encoded email
 */
const decodeBase64Email = (encodedEmail: string): string | null => {
  try {
    const decoded = Buffer.from(encodedEmail, 'base64').toString('utf-8');
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(decoded)) {
      return decoded.toLowerCase().trim();
    }
    return null;
  } catch (error) {
    console.error('Error decoding base64 email:', error);
    return null;
  }
};

/**
 * Get customer details by base64 encoded email
 * GET /api/customer/portal?usr=<base64_email>
 */
export const getCustomerPortalData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usr } = req.query;

    // Validate usr parameter
    if (!usr || typeof usr !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Invalid or missing usr parameter'
      });
      return;
    }

    // Decode base64 email
    const email = decodeBase64Email(usr);
    
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format in usr parameter'
      });
      return;
    }

    // Find customer by email
    const customer = await Customer.findOne({ businessEmail: email });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'No subscription found',
        data: null
      });
      return;
    }

    // Calculate days until renewal
    const today = new Date();
    const nextRenewal = new Date(customer.subscription.nextRenewal);
    const diffTime = nextRenewal.getTime() - today.getTime();
    const daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Return customer data
    res.status(200).json({
      success: true,
      message: 'Customer data retrieved successfully',
      data: {
        customer: {
          customerId: customer.customerId,
          businessName: customer.businessName,
          businessEmail: customer.businessEmail,
          contactPerson: customer.contactPerson,
          phone: customer.phone,
          address: customer.address,
          gstNumber: customer.gstNumber,
          isDeactivated: customer.isDeactivated || false,
          teamMembers: customer.teamMembers
        },
        subscription: {
          planName: customer.subscription.planName,
          planType: customer.subscription.planType,
          status: customer.subscription.status,
          startDate: customer.subscription.startDate,
          nextRenewal: customer.subscription.nextRenewal,
          amount: customer.subscription.amount,
          daysUntilRenewal
        },
        pricing: {
          planPrice: customer.pricing.planPrice,
          addonsPrice: customer.pricing.addonsPrice,
          offerPrice: customer.pricing.offerPrice,
          renewalPrice: customer.pricing.renewalPrice,
          addons: customer.pricing.addons,
          offers: customer.pricing.offers
        },
        paymentHistory: customer.paymentHistory.map(payment => ({
          id: payment.paymentId,
          date: payment.date,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          invoiceUrl: payment.invoiceUrl
        })),
        auditLog: customer.auditLog.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          performedBy: log.performedBy,
          details: log.details,
          changes: log.changes
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    });
  } catch (error) {
    console.error('Error fetching customer portal data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Create or update customer (Admin only - for testing/seeding)
 * POST /api/customer/create
 */
export const createOrUpdateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerData = req.body;

    // Validate required fields
    if (!customerData.businessEmail) {
      res.status(400).json({
        success: false,
        message: 'Business email is required'
      });
      return;
    }

    // Check if customer exists
    const existingCustomer = await Customer.findOne({ 
      businessEmail: customerData.businessEmail.toLowerCase().trim() 
    });

    if (existingCustomer) {
      // Update existing customer
      Object.assign(existingCustomer, customerData);
      await existingCustomer.save();

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: existingCustomer
      });
    } else {
      // Create new customer
      const newCustomer = new Customer(customerData);
      await newCustomer.save();

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: newCustomer
      });
    }
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};


/**
 * Generate and download invoice for customer
 * GET /api/customer/invoice/:customerId
 */
export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Generate invoice PDF
    const invoicePath = await invoiceService.generateInvoice(customer);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${customerId}.pdf"`);

    // Stream the PDF file
    const fileStream = require('fs').createReadStream(invoicePath);
    fileStream.pipe(res);

    // Clean up file after sending (optional)
    fileStream.on('end', () => {
      // Optionally delete the file after sending
      // require('fs').unlinkSync(invoicePath);
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Create Razorpay order for renewal payment
 * POST /api/customer/renewal-order/:customerId
 */
export const createRenewalOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Determine renewal amount (use renewalPrice if set, otherwise use offerPrice)
    const renewalAmount = customer.pricing?.renewalPrice || customer.pricing?.offerPrice || 0;

    if (renewalAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid renewal amount'
      });
      return;
    }

    // Check Razorpay limit (50,000 in test mode)
    if (renewalAmount > 50000) {
      res.status(400).json({
        success: false,
        message: 'Amount exceeds Razorpay test mode limit of ₹50,000'
      });
      return;
    }

    // Create Razorpay order
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Generate short receipt ID (max 40 chars for Razorpay)
    // Format: ren_<last8ofCustomerId>_<timestamp>
    const shortCustomerId = customerId.slice(-8);
    const shortTimestamp = Date.now().toString().slice(-10);
    const receiptId = `ren_${shortCustomerId}_${shortTimestamp}`;

    const options = {
      amount: renewalAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: receiptId,
      notes: {
        customerId: customerId,
        businessName: customer.businessName,
        type: 'renewal'
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      message: 'Renewal order created successfully',
      data: {
        orderId: order.id,
        amount: renewalAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        customerDetails: {
          name: customer.contactPerson,
          email: customer.businessEmail,
          contact: customer.phone || '0000000000'
        }
      }
    });

  } catch (error) {
    console.error('Error creating renewal order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create renewal order',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Save DocuSeal submission ID for a customer
 * POST /api/customer/save-docuseal-id/:customerId
 */
export const saveDocuSealSubmissionId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { submissionId } = req.body;

    if (!submissionId) {
      res.status(400).json({
        success: false,
        message: 'Submission ID is required'
      });
      return;
    }

    // Find and update customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Save the DocuSeal submission ID
    customer.docusealSubmissionId = submissionId;
    await customer.save();

    console.log(`Saved DocuSeal submission ID ${submissionId} for customer ${customerId}`);

    res.status(200).json({
      success: true,
      message: 'DocuSeal submission ID saved successfully',
      data: {
        customerId,
        submissionId
      }
    });

  } catch (error) {
    console.error('Error saving DocuSeal submission ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save DocuSeal submission ID',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Download signed documents from DocuSeal
 * GET /api/customer/signed-documents/:customerId
 */
export const downloadSignedDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Check if we have a stored DocuSeal submission ID
    if (!customer.docusealSubmissionId) {
      res.status(404).json({
        success: false,
        message: 'No signed documents found. Please sign the documents first.'
      });
      return;
    }

    // Initialize DocuSeal API using the SDK
    const docuseal = require('@docuseal/api');
    docuseal.configure({
      key: process.env.DOCUSEAL_API_KEY,
      url: process.env.DOCUSEAL_API_URL
    });

    const submissionId = customer.docusealSubmissionId;
    console.log('Fetching submission for customer:', customerId, 'Submission ID:', submissionId);

    // Get submission directly using the submission ID
    let submission: any;
    try {
      console.log('Attempting to get submission directly with ID:', submissionId);
      submission = await docuseal.getSubmission({
        id: submissionId
      });
      console.log('Successfully retrieved submission directly');
    } catch (err: any) {
      console.log('Direct getSubmission failed:', err.message);
      
      // Fallback: Get all submissions and find by ID
      try {
        console.log('Attempting to list all submissions and filter...');
        const { data: allSubmissions } = await docuseal.listSubmissions({});
        
        console.log('Total submissions found:', allSubmissions?.length || 0);
        
        if (allSubmissions && allSubmissions.length > 0) {
          // Log first few submissions to debug
          console.log('First submission sample:', JSON.stringify(allSubmissions[0], null, 2));
          
          // Find submission by ID
          submission = allSubmissions.find((sub: any) => 
            sub.id === submissionId || 
            sub.submission_id === submissionId ||
            String(sub.id) === String(submissionId)
          );
          
          if (submission) {
            console.log('Found submission by filtering all submissions');
          } else {
            console.log('Submission not found in filtered results');
          }
        }
      } catch (filterErr) {
        console.error('Fallback filter method also failed:', filterErr);
      }
    }

    if (!submission) {
      console.log('No submission found for ID:', submissionId);
      res.status(404).json({
        success: false,
        message: 'Submission not found. Please ensure the document has been signed.'
      });
      return;
    }

    console.log('Retrieved submission ID:', submission.id);

    // Check if submission has documents array
    if (submission.documents && submission.documents.length > 0) {
      // Extract document download URLs
      const documents = submission.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name || 'Signed Document',
        url: doc.download_url || doc.url,
        completedAt: submission.completed_at,
        status: submission.status
      }));

      console.log('Returning documents:', documents.length);

      res.status(200).json({
        success: true,
        message: 'Signed documents retrieved successfully',
        data: {
          documents,
          submissionStatus: submission.status,
          completedAt: submission.completed_at,
          submitterEmail: submission.email,
          auditLogUrl: submission.audit_log_url
        }
      });
    } else {
      // No documents array, but submission exists - return audit log URL
      console.log('No documents array in submission, returning audit log URL');
      
      res.status(200).json({
        success: true,
        message: 'Submission found but no documents available',
        data: {
          documents: [],
          submissionStatus: submission.status,
          completedAt: submission.completed_at,
          submitterEmail: submission.email,
          auditLogUrl: submission.audit_log_url,
          hasAuditLog: !!submission.audit_log_url,
          submitters: submission.submitters || []
        }
      });
    }

  } catch (error) {
    console.error('Error downloading signed documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve signed documents',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Verify renewal payment
 * POST /api/customer/verify-renewal/:customerId
 */
export const verifyRenewalPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
      return;
    }

    // Payment verified successfully
    // Update renewal date based on plan type
    const currentRenewalDate = new Date(customer.subscription.nextRenewal);
    
    // Calculate plan duration in months
    let planDurationMonths: number;
    switch (customer.subscription.planType) {
      case 'Monthly':
        planDurationMonths = 1;
        break;
      case 'Quarterly':
        planDurationMonths = 3;
        break;
      case 'Half-Yearly':
        planDurationMonths = 6;
        break;
      case 'Yearly':
        planDurationMonths = 12;
        break;
      default:
        planDurationMonths = 1;
    }
    
    const newRenewalDate = new Date(currentRenewalDate);
    newRenewalDate.setMonth(newRenewalDate.getMonth() + planDurationMonths);

    customer.subscription.nextRenewal = newRenewalDate;
    customer.subscription.status = 'Active';
    
    // Reactivate if customer was dormant or inactive
    if (customer.planStatus === 'dormant' || customer.planStatus === 'inactive') {
      customer.planStatus = 'active';
      customer.isDeactivated = false;
    }
    
    // Add payment to history
    customer.paymentHistory.push({
      paymentId: razorpay_payment_id,
      date: new Date(),
      amount: customer.pricing?.renewalPrice || customer.pricing?.offerPrice || 0,
      status: 'Success',
      method: 'Razorpay',
      invoiceUrl: ''
    });

    // Add audit log entry
    customer.auditLog.push({
      timestamp: new Date(),
      action: 'Renewal Payment Completed',
      performedBy: customer.contactPerson,
      details: `Renewal payment of ₹${customer.pricing?.renewalPrice || customer.pricing?.offerPrice} completed successfully`,
      changes: [{
        field: 'nextRenewal',
        oldValue: currentRenewalDate.toISOString(),
        newValue: newRenewalDate.toISOString()
      }]
    });

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Renewal payment verified successfully',
      data: {
        newRenewalDate: newRenewalDate,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Error verifying renewal payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify renewal payment',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Download payment receipt for a specific payment
 * GET /api/customer/receipt/:customerId/:paymentId
 */
export const downloadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, paymentId } = req.params;

    // Find customer
    const customer = await Customer.findOne({ customerId });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Find payment in history
    const payment = customer.paymentHistory.find(p => p.paymentId === paymentId);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Generate receipt PDF
    const receiptPath = await receiptService.generateReceipt(customer, {
      paymentId: payment.paymentId,
      date: payment.date,
      amount: payment.amount,
      status: payment.status,
      method: payment.method
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${customerId}-${paymentId}.pdf"`);

    // Stream the PDF file
    const fileStream = require('fs').createReadStream(receiptPath);
    fileStream.pipe(res);

    // Clean up file after sending (optional)
    fileStream.on('end', () => {
      // Optionally delete the file after sending
      // require('fs').unlinkSync(receiptPath);
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};
