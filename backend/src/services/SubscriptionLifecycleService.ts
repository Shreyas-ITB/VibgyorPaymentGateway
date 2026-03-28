/**
 * Subscription Lifecycle Service
 * Manages the complete subscription lifecycle including:
 * - Email reminders (10, 5, 2 days before due)
 * - Dormant status (on due date if unpaid)
 * - Inactive status (30 days after due date if still unpaid)
 * - Auto-deactivation (when inactive)
 */

import Customer from '../models/Customer';
import { EmailService } from './EmailService';

export class SubscriptionLifecycleService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Main lifecycle check - runs daily
   */
  async runLifecycleCheck(): Promise<void> {
    try {
      console.log('🔄 Starting subscription lifecycle check...');

      await this.sendPaymentReminders();
      await this.processDueSubscriptions();
      await this.processExpiredDormantSubscriptions();

      console.log('✓ Subscription lifecycle check completed');
    } catch (error) {
      console.error('Error in subscription lifecycle check:', error);
    }
  }

  /**
   * Send payment reminders (10, 5, 2 days before due)
   */
  private async sendPaymentReminders(): Promise<void> {
    const reminderDays = [10, 5, 2];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const days of reminderDays) {
      await this.sendRemindersForDay(days, today);
    }
  }

  /**
   * Send reminders for specific day
   */
  private async sendRemindersForDay(days: number, today: Date): Promise<void> {
    try {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Find customers with renewals on target date
      // Only active customers with approved status
      const customers = await Customer.find({
        'subscription.nextRenewal': {
          $gte: targetDate,
          $lte: targetDateEnd
        },
        'subscription.status': 'Active',
        'planStatus': 'active',
        'isDeactivated': false
      });

      console.log(`📧 Found ${customers.length} customers for ${days}-day reminder`);

      for (const customer of customers) {
        try {
          if (!this.wasReminderSentRecently(customer, days)) {
            await this.emailService.sendPaymentReminder(customer, days);
            await this.logAction(customer, `Payment Reminder Sent (${days} days)`, 
              `Automated reminder email sent to ${customer.businessEmail}`);
            console.log(`  ✓ Sent ${days}-day reminder to ${customer.businessEmail}`);
          }
        } catch (error) {
          console.error(`  ✗ Error sending reminder to ${customer.businessEmail}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error sending ${days}-day reminders:`, error);
    }
  }

  /**
   * Process subscriptions that are due today (unpaid)
   * Change planStatus from 'active' to 'dormant'
   */
  private async processDueSubscriptions(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Find customers whose renewal is due today
      // Still active but haven't paid
      const customers = await Customer.find({
        'subscription.nextRenewal': {
          $gte: today,
          $lte: todayEnd
        },
        'subscription.status': 'Active', // Still showing as active
        'planStatus': 'active', // Payment status is active
        'isDeactivated': false
      });

      console.log(`⏰ Found ${customers.length} subscriptions due today`);

      for (const customer of customers) {
        try {
          // Check if payment was made today
          const paidToday = this.wasPaymentMadeToday(customer);
          
          if (!paidToday) {
            // No payment made - move to dormant
            customer.planStatus = 'dormant';
            customer.subscription.status = 'Expired';
            
            await customer.save();
            
            await this.logAction(customer, 'Status Changed to Dormant', 
              'Subscription due date reached without payment. Entering 30-day grace period.');
            
            // Send dormant notification email
            await this.emailService.sendDormantNotification(customer);
            
            console.log(`  ⚠️  Moved ${customer.businessEmail} to dormant status`);
          }
        } catch (error) {
          console.error(`  ✗ Error processing due subscription for ${customer.businessEmail}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing due subscriptions:', error);
    }
  }

  /**
   * Process dormant subscriptions that have been dormant for 30 days
   * Change planStatus to 'inactive' and auto-deactivate
   */
  private async processExpiredDormantSubscriptions(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate 30 days ago
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const thirtyDaysAgoEnd = new Date(thirtyDaysAgo);
      thirtyDaysAgoEnd.setHours(23, 59, 59, 999);

      // Find customers who have been dormant for 30 days
      const customers = await Customer.find({
        'subscription.nextRenewal': {
          $gte: thirtyDaysAgo,
          $lte: thirtyDaysAgoEnd
        },
        'planStatus': 'dormant',
        'isDeactivated': false
      });

      console.log(`🚫 Found ${customers.length} dormant subscriptions expired (30 days)`);

      for (const customer of customers) {
        try {
          // Check if payment was made during dormant period
          const paidDuringDormant = this.wasPaymentMadeDuringDormant(customer);
          
          if (!paidDuringDormant) {
            // No payment during dormant period - deactivate
            customer.planStatus = 'inactive';
            customer.subscription.status = 'Deactivated';
            customer.isDeactivated = true;
            
            await customer.save();
            
            await this.logAction(customer, 'Auto-Deactivated', 
              'Subscription deactivated after 30-day dormant period without payment.');
            
            // Send deactivation notification email
            await this.emailService.sendDeactivationNotification(customer);
            
            console.log(`  🔴 Auto-deactivated ${customer.businessEmail} after 30-day dormant period`);
          }
        } catch (error) {
          console.error(`  ✗ Error processing expired dormant subscription for ${customer.businessEmail}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing expired dormant subscriptions:', error);
    }
  }

  /**
   * Check if reminder was sent recently (within last 24 hours)
   */
  private wasReminderSentRecently(customer: any, days: number): boolean {
    const reminderAction = `Payment Reminder Sent (${days} days)`;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return customer.auditLog.some((log: any) => 
      log.action === reminderAction && 
      new Date(log.timestamp) > oneDayAgo
    );
  }

  /**
   * Check if payment was made today
   */
  private wasPaymentMadeToday(customer: any): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return customer.paymentHistory.some((payment: any) => {
      const paymentDate = new Date(payment.date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate.getTime() === today.getTime() && payment.status === 'Success';
    });
  }

  /**
   * Check if payment was made during dormant period (last 30 days)
   */
  private wasPaymentMadeDuringDormant(customer: any): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return customer.paymentHistory.some((payment: any) => 
      new Date(payment.date) > thirtyDaysAgo && payment.status === 'Success'
    );
  }

  /**
   * Log action to customer audit log
   */
  private async logAction(customer: any, action: string, details: string): Promise<void> {
    customer.auditLog.push({
      timestamp: new Date(),
      action,
      performedBy: 'System',
      details,
      changes: []
    });
    await customer.save();
  }
}
