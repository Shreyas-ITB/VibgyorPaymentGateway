/**
 * Email Service for sending payment reminder emails
 * Uses Gmail SMTP with Nodemailer
 */

import nodemailer from 'nodemailer';
import { ICustomer } from '../models/Customer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter using Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(
    customer: ICustomer,
    daysUntilDue: number
  ): Promise<void> {
    try {
      const subject = this.getEmailSubject(daysUntilDue, customer.businessName);
      const html = this.generateEmailTemplate(customer, daysUntilDue);

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Vibgyor Payment System'}" <${process.env.SMTP_USER}>`,
        to: customer.businessEmail,
        subject: subject,
        html: html
      };

      await this.transporter.sendMail(mailOptions);
      
      console.log(`Payment reminder email sent to ${customer.businessEmail} (${daysUntilDue} days)`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Get email subject based on days until due
   */
  private getEmailSubject(daysUntilDue: number, businessName: string): string {
    if (daysUntilDue === 10) {
      return `Payment Reminder: Your subscription renewal is due in 10 days - ${businessName}`;
    } else if (daysUntilDue === 5) {
      return `Important: Your subscription renewal is due in 5 days - ${businessName}`;
    } else if (daysUntilDue === 2) {
      return `Urgent: Your subscription renewal is due in 2 days - ${businessName}`;
    }
    return `Payment Reminder - ${businessName}`;
  }

  /**
   * Generate beautiful HTML email template
   */
  private generateEmailTemplate(customer: ICustomer, daysUntilDue: number): string {
    const renewalDate = new Date(customer.subscription.nextRenewal);
    const formattedDate = renewalDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const amount = customer.pricing.renewalPrice.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    });

    const urgencyColor = daysUntilDue === 2 ? '#EF4444' : daysUntilDue === 5 ? '#F59E0B' : '#3B82F6';
    const urgencyText = daysUntilDue === 2 ? 'URGENT' : daysUntilDue === 5 ? 'IMPORTANT' : 'REMINDER';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0F172A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                💳 Payment Reminder
              </h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 14px; font-weight: 500;">
                Vibgyor Payment System
              </p>
            </td>
          </tr>

          <!-- Urgency Badge -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <div style="background-color: ${urgencyColor}; color: #FFFFFF; padding: 12px 20px; border-radius: 8px; text-align: center; font-weight: 700; font-size: 14px; letter-spacing: 1px;">
                ${urgencyText}: ${daysUntilDue} DAYS UNTIL PAYMENT DUE
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <p style="margin: 0 0 20px 0; color: #E2E8F0; font-size: 16px; line-height: 1.6;">
                Dear <strong style="color: #FFFFFF;">${customer.contactPerson}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                This is a friendly reminder that your subscription payment for <strong style="color: #FFFFFF;">${customer.businessName}</strong> is due in <strong style="color: ${urgencyColor};">${daysUntilDue} days</strong>.
              </p>

              <!-- Payment Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #334155; border-radius: 12px; margin: 25px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #475569;">
                          <span style="color: #94A3B8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Plan</span>
                          <div style="color: #FFFFFF; font-size: 16px; font-weight: 600; margin-top: 5px;">${customer.subscription.planName}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #475569;">
                          <span style="color: #94A3B8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Renewal Date</span>
                          <div style="color: #FFFFFF; font-size: 16px; font-weight: 600; margin-top: 5px;">${formattedDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #94A3B8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</span>
                          <div style="color: #10B981; font-size: 24px; font-weight: 700; margin-top: 5px;">${amount}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CUSTOMER_PORTAL_URL || 'http://localhost:4200/customer-portal'}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">
                      View Payment Details →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                To ensure uninterrupted service, please make your payment before the due date. If you have any questions or concerns, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 10px 0; color: #64748B; font-size: 13px;">
                This is an automated reminder from Vibgyor Payment System
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                © ${new Date().getFullYear()} Vibgyor. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send dormant status notification
   */
  async sendDormantNotification(customer: ICustomer): Promise<void> {
    try {
      const subject = `⚠️ Payment Overdue - Grace Period Started - ${customer.businessName}`;
      const html = this.generateDormantEmailTemplate(customer);

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Vibgyor Payment System'}" <${process.env.SMTP_USER}>`,
        to: customer.businessEmail,
        subject: subject,
        html: html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Dormant notification sent to ${customer.businessEmail}`);
    } catch (error) {
      console.error('Error sending dormant notification:', error);
      throw error;
    }
  }

  /**
   * Send deactivation notification
   */
  async sendDeactivationNotification(customer: ICustomer): Promise<void> {
    try {
      const subject = `🚫 Subscription Deactivated - ${customer.businessName}`;
      const html = this.generateDeactivationEmailTemplate(customer);

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Vibgyor Payment System'}" <${process.env.SMTP_USER}>`,
        to: customer.businessEmail,
        subject: subject,
        html: html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Deactivation notification sent to ${customer.businessEmail}`);
    } catch (error) {
      console.error('Error sending deactivation notification:', error);
      throw error;
    }
  }

  /**
   * Generate dormant status email template
   */
  private generateDormantEmailTemplate(customer: ICustomer): string {
    const amount = customer.pricing.renewalPrice.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Overdue</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0F172A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
                ⚠️ Payment Overdue
              </h1>
              <p style="margin: 10px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                Grace Period Started
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #E2E8F0; font-size: 16px; line-height: 1.6;">
                Dear <strong style="color: #FFFFFF;">${customer.contactPerson}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                Your subscription payment for <strong style="color: #FFFFFF;">${customer.businessName}</strong> was due today but we haven't received payment yet.
              </p>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">
                  🕐 You have entered a 30-day grace period
                </p>
                <p style="margin: 10px 0 0 0; color: #78350F; font-size: 13px;">
                  Your account status is now "Dormant". Please make payment within 30 days to avoid deactivation.
                </p>
              </div>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #334155; border-radius: 12px; margin: 25px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="color: #94A3B8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</div>
                    <div style="color: #F59E0B; font-size: 28px; font-weight: 700; margin-top: 5px;">${amount}</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CUSTOMER_PORTAL_URL || 'http://localhost:4200/customer-portal'}" 
                       style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Make Payment Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                If payment is not received within 30 days, your subscription will be automatically deactivated.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0F172A; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #475569; font-size: 12px;">
                © ${new Date().getFullYear()} Vibgyor. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate deactivation email template
   */
  private generateDeactivationEmailTemplate(customer: ICustomer): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Deactivated</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0F172A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #991B1B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
                🚫 Subscription Deactivated
              </h1>
              <p style="margin: 10px 0 0 0; color: #FEE2E2; font-size: 14px; font-weight: 500;">
                Account Status: Inactive
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #E2E8F0; font-size: 16px; line-height: 1.6;">
                Dear <strong style="color: #FFFFFF;">${customer.contactPerson}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                Your subscription for <strong style="color: #FFFFFF;">${customer.businessName}</strong> has been automatically deactivated due to non-payment after the 30-day grace period.
              </p>

              <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #991B1B; font-size: 14px; font-weight: 600;">
                  Your account is now inactive
                </p>
                <p style="margin: 10px 0 0 0; color: #7F1D1D; font-size: 13px;">
                  To reactivate your subscription, please contact our support team.
                </p>
              </div>

              <p style="margin: 25px 0 0 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                If you believe this is an error or would like to discuss reactivation options, please contact us immediately.
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="mailto:${process.env.COMPANY_EMAIL || 'support@vibgyor.com'}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Contact Support
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0F172A; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #475569; font-size: 12px;">
                © ${new Date().getFullYear()} Vibgyor. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✓ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('✗ Email service configuration error:', error);
      return false;
    }
  }
}
