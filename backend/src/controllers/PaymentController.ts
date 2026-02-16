/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentProviderFactory } from '../factories/PaymentProviderFactory';
import { SubscriptionService } from '../services/SubscriptionService';
import { 
  sanitizeInput, 
  validateSchema, 
  validateJsonContentType, 
  validateJsonBody 
} from '../middleware/validation';
import { 
  initiatePaymentSchema, 
  verifyPaymentSchema 
} from '../middleware/validation-schemas';

const router = Router();
const subscriptionService = new SubscriptionService();

/**
 * POST /api/payment/initiate
 * Initiate a payment order with the configured payment provider
 */
router.post('/initiate', 
  validateJsonContentType,
  validateJsonBody,
  sanitizeInput,
  validateSchema(initiatePaymentSchema),
  async (req: Request, res: Response) => {
  try {
    // Extract validated and sanitized data
    const { planId, amount, billingCycle } = req.body;

    // Get configured payment provider
    const provider = PaymentProviderFactory.createProvider();

    // Convert amount to paise (smallest currency unit for INR)
    // Razorpay expects amounts in paise: 1 INR = 100 paise
    const amountInPaise = Math.round(amount * 100);

    // Create payment order
    const orderResponse = await provider.createOrder(
      amountInPaise,
      'INR', // Default currency
      {
        planId,
        billingCycle
      }
    );

    // Return response with provider details
    const providerName = (process.env.PAYMENT_PROVIDER?.toLowerCase() || 'razorpay') as 'razorpay' | 'pinelabs';
    
    console.log('Payment initiated:', {
      provider: providerName,
      orderId: orderResponse.orderId,
      amount: orderResponse.amount
    });
    
    return res.status(200).json({
      orderId: orderResponse.orderId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
      provider: providerName,
      providerKey: provider.getProviderKey()
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_INIT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initiate payment'
      }
    });
  }
});

/**
 * POST /api/payment/verify
 * Verify a completed payment and generate subscription
 */
router.post('/verify',
  validateJsonContentType,
  validateJsonBody,
  sanitizeInput,
  validateSchema(verifyPaymentSchema),
  async (req: Request, res: Response) => {
  try {
    // Extract validated and sanitized data
    const { orderId, paymentId, signature, planId, amount } = req.body;

    // Get the payment provider
    const paymentProvider = PaymentProviderFactory.createProvider();

    // Verify the payment signature
    const isValid = await paymentProvider.verifyPayment(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'PAYMENT_VERIFICATION_FAILED',
          message: 'Payment signature verification failed'
        }
      });
    }

    // Generate subscription ID and store payment details
    const subscription = subscriptionService.createSubscription(planId, amount);

    // Return subscription data
    return res.status(200).json({
      success: true,
      subscriptionId: subscription.subscriptionId,
      amount: subscription.amount,
      planId: subscription.planId
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify payment'
      }
    });
  }
});

/**
 * POST /api/webhook/razorpay
 * Handle Razorpay webhook notifications
 */
router.post('/webhook/razorpay',
  validateJsonContentType,
  validateJsonBody,
  sanitizeInput,
  async (req: Request, res: Response) => {
  try {
    // Extract webhook signature from headers
    const webhookSignature = req.headers['x-razorpay-signature'] as string;

    if (!webhookSignature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature is missing'
        }
      });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    // Check if signatures have the same length before using timingSafeEqual
    let isValid = false;
    if (webhookSignature.length === expectedSignature.length) {
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(webhookSignature)
        );
      } catch (error) {
        isValid = false;
      }
    }

    if (!isValid) {
      console.warn('Invalid Razorpay webhook signature');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed'
        }
      });
    }

    // Extract payment details from webhook payload
    const { event, payload } = req.body;

    // Only process payment.captured events
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount;

      // Extract plan ID from order notes/metadata
      // In a real implementation, we would fetch the order details from storage
      const planId = payment.notes?.planId || 'unknown';

      // Check if subscription already exists for this payment (idempotency)
      const existingSubscription = subscriptionService.getSubscriptionByPaymentId(paymentId);
      if (existingSubscription) {
        console.log('Duplicate webhook received for payment:', paymentId, 'Subscription already exists:', existingSubscription.subscriptionId);
        return res.status(200).json({ success: true });
      }

      // Verify the payment using the provider
      const provider = PaymentProviderFactory.createProvider();
      
      // For webhooks, we construct a signature to verify
      const signatureBody = `${orderId}|${paymentId}`;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(signatureBody)
        .digest('hex');

      const isPaymentValid = await provider.verifyPayment(orderId, paymentId, signature);

      if (isPaymentValid) {
        // Generate subscription ID and store data with payment ID for idempotency
        const subscription = subscriptionService.createSubscription(planId, amount, paymentId);

        console.log('Razorpay payment verified and subscription created:', subscription.subscriptionId);
      }
    }

    // Always return 200 OK for valid webhooks
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    
    // Return 200 to prevent webhook retries for processing errors
    return res.status(200).json({ success: true });
  }
});

/**
 * POST /api/webhook/pinelabs
 * Handle PineLabs webhook notifications
 */
router.post('/webhook/pinelabs',
  validateJsonContentType,
  validateJsonBody,
  sanitizeInput,
  async (req: Request, res: Response) => {
  try {
    // Extract webhook signature from headers or body
    const webhookSignature = req.headers['x-pinelabs-signature'] as string || req.body.signature;

    if (!webhookSignature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature is missing'
        }
      });
    }

    // Extract payment details from webhook payload
    const { order_id, payment_id, amount, status, plan_id } = req.body;

    if (!order_id || !payment_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required webhook fields'
        }
      });
    }

    // Verify webhook signature using PineLabs provider
    const provider = PaymentProviderFactory.createProvider();
    const isValid = await provider.verifyPayment(order_id, payment_id, webhookSignature);

    if (!isValid) {
      console.warn('Invalid PineLabs webhook signature');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed'
        }
      });
    }

    // Only process successful payments
    if (status === 'success' || status === 'captured') {
      const planId = plan_id || 'unknown';

      // Check if subscription already exists for this payment (idempotency)
      const existingSubscription = subscriptionService.getSubscriptionByPaymentId(payment_id);
      if (existingSubscription) {
        console.log('Duplicate webhook received for payment:', payment_id, 'Subscription already exists:', existingSubscription.subscriptionId);
        return res.status(200).json({ success: true });
      }

      // Generate subscription ID and store data with payment ID for idempotency
      const subscription = subscriptionService.createSubscription(planId, amount, payment_id);

      console.log('PineLabs payment verified and subscription created:', subscription.subscriptionId);
    }

    // Always return 200 OK for valid webhooks
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('PineLabs webhook processing error:', error);
    
    // Return 200 to prevent webhook retries for processing errors
    return res.status(200).json({ success: true });
  }
});

export default router;
