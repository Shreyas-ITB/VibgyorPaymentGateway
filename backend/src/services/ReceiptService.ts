/**
 * Receipt Service for generating PDF payment receipts
 * Creates professional payment receipts for each transaction
 */

import PDFDocument from 'pdfkit';
import { ICustomer } from '../models/Customer';
import fs from 'fs';
import path from 'path';

export interface PaymentReceiptData {
  paymentId: string;
  date: Date;
  amount: number;
  status: 'Success' | 'Failed' | 'Pending';
  method: string;
}

export class ReceiptService {
  private receiptsDir: string;

  constructor() {
    // Create receipts directory if it doesn't exist
    this.receiptsDir = path.join(__dirname, '../../receipts');
    if (!fs.existsSync(this.receiptsDir)) {
      fs.mkdirSync(this.receiptsDir, { recursive: true });
    }
  }

  /**
   * Generate payment receipt PDF
   */
  async generateReceipt(customer: ICustomer, payment: PaymentReceiptData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Generate receipt number
        const receiptNumber = this.generateReceiptNumber(payment);
        const fileName = `receipt-${customer.customerId}-${payment.paymentId}-${Date.now()}.pdf`;
        const filePath = path.join(this.receiptsDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Receipt ${receiptNumber}`,
            Author: 'Vibgyor',
            Subject: `Payment Receipt for ${customer.businessName}`
          }
        });

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Generate receipt content
        this.generateHeader(doc);
        this.generateReceiptDetails(doc, payment, receiptNumber);
        this.generatePayerInfo(doc, customer);
        this.generatePaymentInfo(doc, customer, payment);
        this.generateFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          console.log(`✓ Receipt generated: ${fileName}`);
          resolve(filePath);
        });

        stream.on('error', (error) => {
          console.error('Error writing receipt PDF:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error generating receipt:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate receipt header with company logo and details
   */
  private generateHeader(doc: PDFKit.PDFDocument): void {
    const companyGST = process.env.COMPANY_GST || '29XXXXX1234X1ZX';
    const companyEmail = process.env.COMPANY_EMAIL || 'billing@vibgyor.com';
    const companyPhone = process.env.COMPANY_PHONE || '+91 1234567890';

    doc
      .fillColor('#667EEA')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('VIBGYOR', 50, 50);

    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Payment Gateway Services', 50, 85)
      .text(`GST: ${companyGST}`, 50, 100)
      .text(`Email: ${companyEmail}`, 50, 115)
      .text(`Phone: ${companyPhone}`, 50, 130);

    // Receipt title
    doc
      .fillColor('#1E293B')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', 400, 50, { align: 'right' });

    // Draw line
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(2)
      .moveTo(50, 160)
      .lineTo(545, 160)
      .stroke();
  }

  /**
   * Generate receipt details (number, date, etc.)
   */
  private generateReceiptDetails(
    doc: PDFKit.PDFDocument,
    payment: PaymentReceiptData,
    receiptNumber: string
  ): void {
    const startY = 180;
    const rightX = 350;

    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Receipt Number:', startY, startY)
      .text('Receipt Date:', startY, startY + 20)
      .text('Payment ID:', startY, startY + 40)
      .text('Payment Status:', startY, startY + 60)
      .text('Payment Method:', startY, startY + 80);

    doc
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text(receiptNumber, rightX, startY)
      .text(new Date(payment.date).toLocaleDateString('en-IN'), rightX, startY + 20)
      .text(payment.paymentId, rightX, startY + 40);

    // Status with color
    const statusColor = payment.status === 'Success' ? '#10B981' : payment.status === 'Failed' ? '#EF4444' : '#F59E0B';
    doc
      .fillColor(statusColor)
      .text(payment.status.toUpperCase(), rightX, startY + 60)
      .fillColor('#1E293B')
      .text(payment.method, rightX, startY + 80);
  }

  /**
   * Generate payer information section
   */
  private generatePayerInfo(doc: PDFKit.PDFDocument, customer: ICustomer): void {
    const startY = 300;

    // Payer section
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIVED FROM:', 50, startY);

    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(customer.businessName, 50, startY + 20);

    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica')
      .text(customer.contactPerson, 50, startY + 38)
      .text(customer.address, 50, startY + 53, { width: 250 })
      .text(`Email: ${customer.businessEmail}`, 50, startY + 83)
      .text(`Phone: ${customer.phone}`, 50, startY + 98);

    if (customer.gstNumber) {
      doc.text(`GST: ${customer.gstNumber}`, 50, startY + 113);
    }

    // Customer ID
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Customer ID:', 350, startY)
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text(customer.customerId, 350, startY + 20);
  }

  /**
   * Generate payment information section
   */
  private generatePaymentInfo(
    doc: PDFKit.PDFDocument,
    customer: ICustomer,
    payment: PaymentReceiptData
  ): void {
    const startY = 420;

    // Payment details box
    doc
      .fillColor('#F1F5F9')
      .rect(50, startY, 495, 120)
      .fill();

    doc
      .strokeColor('#CBD5E1')
      .lineWidth(1)
      .rect(50, startY, 495, 120)
      .stroke();

    // Payment details
    doc
      .fillColor('#64748B')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 60, startY + 10);

    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica')
      .text('Plan/Service:', 60, startY + 30)
      .text('Payment Amount:', 60, startY + 50)
      .text('Payment Date:', 60, startY + 70)
      .text('Transaction Reference:', 60, startY + 90);

    doc
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text(customer.subscription.planName, 250, startY + 30)
      .text(this.formatCurrency(payment.amount), 250, startY + 50)
      .text(new Date(payment.date).toLocaleDateString('en-IN'), 250, startY + 70)
      .text(payment.paymentId, 250, startY + 90);

    // Amount in words
    const amountInWords = this.numberToWords(Math.floor(payment.amount));
    doc
      .fillColor('#64748B')
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`Amount in words: ${amountInWords} Rupees Only`, 60, startY + 110);
  }

  /**
   * Generate footer with terms and thank you message
   */
  private generateFooter(doc: PDFKit.PDFDocument): void {
    const footerY = 600;

    // Thank you message
    doc
      .fillColor('#667EEA')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Thank you for your payment!', 50, footerY, { align: 'center', width: 495 });

    // Important notes
    doc
      .fillColor('#64748B')
      .fontSize(8)
      .font('Helvetica')
      .text('Important Notes:', 50, footerY + 30)
      .text('1. This is a computer-generated receipt and does not require a signature.', 50, footerY + 43)
      .text('2. Please keep this receipt for your records and tax purposes.', 50, footerY + 56)
      .text('3. For any queries, please contact our support team.', 50, footerY + 69);

    // Footer line
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .moveTo(50, 750)
      .lineTo(545, 750)
      .stroke();

    // Company info at bottom
    doc
      .fillColor('#94A3B8')
      .fontSize(8)
      .font('Helvetica')
      .text('Vibgyor Payment Gateway | www.vibgyor.com | support@vibgyor.com', 50, 755, { align: 'center', width: 495 });

    // Receipt validity
    doc
      .fillColor('#94A3B8')
      .fontSize(7)
      .font('Helvetica-Oblique')
      .text('Generated on: ' + new Date().toLocaleString('en-IN'), 50, 770, { align: 'center', width: 495 });
  }

  /**
   * Generate receipt number
   */
  private generateReceiptNumber(payment: PaymentReceiptData): string {
    const date = new Date(payment.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const paymentIdShort = payment.paymentId.substring(0, 8).toUpperCase();
    return `RCP-${year}${month}${day}-${paymentIdShort}`;
  }

  /**
   * Format currency in Indian Rupees with Rs. prefix
   */
  private formatCurrency(amount: number): string {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
    return `Rs. ${formatted}`;
  }

  /**
   * Convert number to words (Indian numbering system)
   */
  private numberToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const remainder = num % 100;

    let words = '';

    if (crores > 0) {
      words += this.convertTwoDigits(crores) + ' Crore ';
    }

    if (lakhs > 0) {
      words += this.convertTwoDigits(lakhs) + ' Lakh ';
    }

    if (thousands > 0) {
      words += this.convertTwoDigits(thousands) + ' Thousand ';
    }

    if (hundreds > 0) {
      words += ones[hundreds] + ' Hundred ';
    }

    if (remainder > 0) {
      if (remainder < 10) {
        words += ones[remainder];
      } else if (remainder < 20) {
        words += teens[remainder - 10];
      } else {
        words += tens[Math.floor(remainder / 10)];
        if (remainder % 10 > 0) {
          words += ' ' + ones[remainder % 10];
        }
      }
    }

    return words.trim();
  }

  /**
   * Helper to convert two digit numbers to words
   */
  private convertTwoDigits(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num < 10) {
      return ones[num];
    } else if (num < 20) {
      return teens[num - 10];
    } else {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
  }

  /**
   * Get receipt file path
   */
  getReceiptPath(fileName: string): string {
    return path.join(this.receiptsDir, fileName);
  }

  /**
   * Delete old receipts (cleanup)
   */
  async cleanupOldReceipts(daysOld: number = 30): Promise<void> {
    try {
      const files = fs.readdirSync(this.receiptsDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.receiptsDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old receipt: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning up old receipts:', error);
    }
  }
}
