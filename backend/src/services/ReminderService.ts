/**
 * Reminder Service for checking and sending payment reminders
 * Runs daily to check for upcoming renewals
 */

import Customer from '../models/Customer';
import { EmailService } from './EmailService';

export class ReminderService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Check for customers with upcoming renewals and send reminders
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      console.log('🔔 Starting payment reminder check...');

      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      // Check for renewals in 10, 5, and 2 days
      const reminderDays = [10, 5, 2];

      for (const days of reminderDays) {
        await this.sendRemindersForDay(days, now);
      }

      console.log('✓ Payment reminder check completed');
    } catch (error) {
      console.error('Error in reminder service:', error);
    }
  }

  /**
   * Send reminders for a specific number of days
   */
  private async sendRemindersForDay(days: number, today: Date): Promise<void> {
    try {
      // Calculate the target date (today + days)
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      
      // Set to end of day for comparison
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Find customers with renewals on the target date
      // Only send to active customers with active plan status
      const customers = await Customer.find({
        'subscription.nextRenewal': {
          $gte: targetDate,
          $lte: targetDateEnd
        },
        'subscription.status': { $ne: 'Deactivated' }, // Don't send to deactivated customers
        'planStatus': 'active', // Only send to customers with active payment status
        'isDeactivated': false
      });

      console.log(`Found ${customers.length} customers with renewals in ${days} days`);

      // Send emails
      for (const customer of customers) {
        try {
          // Check if we already sent a reminder for this day
          const lastReminderSent = this.getLastReminderSent(customer, days);
          
          if (!lastReminderSent) {
            await this.emailService.sendPaymentReminder(customer, days);
            
            // Update customer with reminder sent info
            await this.markReminderSent(customer, days);
            
            console.log(`✓ Sent ${days}-day reminder to ${customer.businessEmail}`);
          } else {
            console.log(`⊘ Already sent ${days}-day reminder to ${customer.businessEmail}`);
          }
        } catch (error) {
          console.error(`Error sending reminder to ${customer.businessEmail}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error sending ${days}-day reminders:`, error);
    }
  }

  /**
   * Check if reminder was already sent for this renewal period
   */
  private getLastReminderSent(customer: any, days: number): boolean {
    // Check audit log for recent reminder
    const reminderAction = `Payment Reminder Sent (${days} days)`;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentReminder = customer.auditLog.find((log: any) => 
      log.action === reminderAction && 
      new Date(log.timestamp) > oneDayAgo
    );

    return !!recentReminder;
  }

  /**
   * Mark reminder as sent in audit log
   */
  private async markReminderSent(customer: any, days: number): Promise<void> {
    customer.auditLog.push({
      timestamp: new Date(),
      action: `Payment Reminder Sent (${days} days)`,
      performedBy: 'System',
      details: `Automated payment reminder email sent to ${customer.businessEmail}`,
      changes: []
    });

    await customer.save();
  }

  /**
   * Manual trigger for testing
   */
  async sendTestReminder(customerId: string, days: number): Promise<void> {
    try {
      const customer = await Customer.findOne({ customerId });

      if (!customer) {
        throw new Error('Customer not found');
      }

      await this.emailService.sendPaymentReminder(customer, days);
      await this.markReminderSent(customer, days);

      console.log(`✓ Test reminder sent to ${customer.businessEmail}`);
    } catch (error) {
      console.error('Error sending test reminder:', error);
      throw error;
    }
  }
}
