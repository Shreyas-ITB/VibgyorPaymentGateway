import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { RazorpayProvider } from '../providers/RazorpayProvider';

/**
 * Handle Razorpay webhook events
 * POST /api/webhooks/razorpay
 */
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    if (!signature) {
      res.status(400).json({
        success: false,
        message: 'Missing webhook signature'
      });
      return;
    }

    // Verify webhook signature
    const razorpay = new RazorpayProvider();
    const isValid = razorpay.verifyWebhookSignature(webhookBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Received Razorpay webhook:', event);

    // Handle payment_link.paid event
    if (event === 'payment_link.paid') {
      await handlePaymentLinkPaid(payload);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * Handle payment_link.paid event
 */
async function handlePaymentLinkPaid(payload: any): Promise<void> {
  try {
    const paymentLinkEntity = payload.payment_link?.entity || payload.payment_link;
    const paymentEntity = payload.payment?.entity || payload.payment;

    if (!paymentLinkEntity || !paymentEntity) {
      console.error('Missing payment link or payment entity in webhook payload');
      return;
    }

    const paymentLinkId = paymentLinkEntity.id;
    const referenceId = paymentLinkEntity.reference_id;

    console.log('Processing payment_link.paid:', {
      paymentLinkId,
      referenceId,
      paymentId: paymentEntity.id
    });

    // Find customer by payment link ID
    const customer = await Customer.findOne({ 'paymentLink.id': paymentLinkId });

    if (!customer) {
      console.error('Customer not found for payment link:', paymentLinkId);
      return;
    }

    // Update payment link status
    if (customer.paymentLink) {
      customer.paymentLink.status = 'paid';
    }

    // Update plan status to active (payment received)
    // Note: subscription.status (approval status) remains unchanged - requires manual manager approval
    customer.planStatus = 'active';

    // Add payment to history
    customer.paymentHistory.push({
      paymentId: paymentEntity.id,
      date: new Date(paymentEntity.created_at * 1000),
      amount: paymentEntity.amount / 100, // Convert from paise to rupees
      status: 'Success',
      method: paymentEntity.method || 'online',
      invoiceUrl: paymentEntity.invoice_id || undefined
    });

    // Add audit log entry
    customer.auditLog.push({
      timestamp: new Date(),
      action: 'Payment Received',
      performedBy: 'System',
      details: `Payment of ₹${paymentEntity.amount / 100} received via ${paymentEntity.method}. Plan status updated to active.`,
      changes: [
        { field: 'planStatus', oldValue: 'dormant', newValue: 'active' }
      ]
    });

    await customer.save();

    console.log('Payment processed successfully for customer:', customer.customerId);
  } catch (error) {
    console.error('Error handling payment_link.paid event:', error);
    throw error;
  }
}
