/**
 * Invoice Service for generating PDF invoices
 * Creates professional invoices with company details and payment information
 */

import PDFDocument from 'pdfkit';
import { ICustomer } from '../models/Customer';
import fs from 'fs';
import path from 'path';

export class InvoiceService {
  private invoicesDir: string;

  constructor() {
    // Create invoices directory if it doesn't exist
    this.invoicesDir = path.join(__dirname, '../../invoices');
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF for a customer
   */
  async generateInvoice(customer: ICustomer): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Generate invoice number
        const invoiceNumber = this.generateInvoiceNumber(customer);
        const fileName = `invoice-${customer.customerId}-${Date.now()}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Invoice ${invoiceNumber}`,
            Author: 'Vibgyor',
            Subject: `Invoice for ${customer.businessName}`
          }
        });

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Generate invoice content
        this.generateHeader(doc);
        this.generateCustomerInfo(doc, customer);
        this.generateInvoiceDetails(doc, customer, invoiceNumber);
        this.generateItemsTable(doc, customer);
        this.generateFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          console.log(`✓ Invoice generated: ${fileName}`);
          resolve(filePath);
        });

        stream.on('error', (error) => {
          console.error('Error writing PDF:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error generating invoice:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate invoice header with company logo and details
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

    // Invoice title
    doc
      .fillColor('#1E293B')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    // Draw line
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(2)
      .moveTo(50, 160)
      .lineTo(545, 160)
      .stroke();
  }

  /**
   * Generate customer information section
   */
  private generateCustomerInfo(doc: PDFKit.PDFDocument, customer: ICustomer): void {
    const startY = 180;

    // Bill To section
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, startY);

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
      .text(`Email: ${customer.businessEmail}`, 50, startY + 83);

    if (customer.gstNumber) {
      doc.text(`GST: ${customer.gstNumber}`, 50, startY + 98);
    }
  }

  /**
   * Generate invoice details (number, date, etc.)
   */
  private generateInvoiceDetails(
    doc: PDFKit.PDFDocument,
    customer: ICustomer,
    invoiceNumber: string
  ): void {
    const startY = 180;
    const rightX = 350;

    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Invoice Number:', rightX, startY)
      .text('Invoice Date:', rightX, startY + 20)
      .text('Payment Status:', rightX, startY + 40)
      .text('Plan:', rightX, startY + 60)
      .text('Period:', rightX, startY + 80);

    doc
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text(invoiceNumber, rightX + 100, startY)
      .text(new Date().toLocaleDateString('en-IN'), rightX + 100, startY + 20)
      .fillColor(customer.planStatus === 'active' ? '#10B981' : '#F59E0B')
      .text(customer.planStatus.toUpperCase(), rightX + 100, startY + 40)
      .fillColor('#1E293B')
      .text(customer.subscription.planName, rightX + 100, startY + 60)
      .text(customer.subscription.planType, rightX + 100, startY + 80);
  }

  /**
   * Generate items table with pricing
   */
  private generateItemsTable(doc: PDFKit.PDFDocument, customer: ICustomer): void {
    const tableTop = 350;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 420;
    const amountX = 490;

    // Table header
    doc
      .fillColor('#F1F5F9')
      .rect(50, tableTop, 495, 25)
      .fill();

    doc
      .fillColor('#1E293B')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ITEM', itemCodeX + 5, tableTop + 8)
      .text('DESCRIPTION', descriptionX, tableTop + 8)
      .text('QTY', quantityX, tableTop + 8)
      .text('PRICE', priceX, tableTop + 8)
      .text('AMOUNT', amountX, tableTop + 8);

    // Draw line
    doc
      .strokeColor('#CBD5E1')
      .lineWidth(1)
      .moveTo(50, tableTop + 25)
      .lineTo(545, tableTop + 25)
      .stroke();

    let currentY = tableTop + 35;

    // Plan item
    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica')
      .text('1', itemCodeX + 5, currentY)
      .text(customer.subscription.planName, descriptionX, currentY)
      .text('1', quantityX, currentY)
      .text(this.formatCurrency(customer.pricing.planPrice), priceX, currentY, { width: 60, align: 'right' })
      .text(this.formatCurrency(customer.pricing.planPrice), amountX, currentY, { width: 50, align: 'right' });

    currentY += 25;

    // Addons
    if (customer.pricing.addons && customer.pricing.addons.length > 0) {
      customer.pricing.addons.forEach((addon, index) => {
        const addonPrice = customer.pricing.addonsPrice / customer.pricing.addons.length;
        doc
          .text(`${index + 2}`, itemCodeX + 5, currentY)
          .text(addon, descriptionX, currentY, { width: 180 })
          .text('1', quantityX, currentY)
          .text(this.formatCurrency(addonPrice), priceX, currentY, { width: 60, align: 'right' })
          .text(this.formatCurrency(addonPrice), amountX, currentY, { width: 50, align: 'right' });
        currentY += 25;
      });
    }

    // Draw line before totals
    doc
      .strokeColor('#CBD5E1')
      .lineWidth(1)
      .moveTo(350, currentY + 10)
      .lineTo(545, currentY + 10)
      .stroke();

    currentY += 25;

    // Subtotal
    const subtotal = customer.pricing.planPrice + customer.pricing.addonsPrice;
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', priceX - 50, currentY)
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text(this.formatCurrency(subtotal), amountX, currentY, { width: 50, align: 'right' });

    currentY += 20;

    // Discount
    const discount = subtotal - customer.pricing.offerPrice;
    if (discount > 0) {
      doc
        .fillColor('#64748B')
        .fontSize(10)
        .font('Helvetica')
        .text('Discount:', priceX - 50, currentY)
        .fillColor('#EF4444')
        .font('Helvetica-Bold')
        .text(`-${this.formatCurrency(discount)}`, amountX, currentY, { width: 50, align: 'right' });

      currentY += 20;
    }

    // Offers applied
    if (customer.pricing.offers && customer.pricing.offers.length > 0) {
      doc
        .fillColor('#10B981')
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(`Offers: ${customer.pricing.offers.join(', ')}`, descriptionX, currentY, { width: 180 });

      currentY += 20;
    }

    // Draw line before total
    doc
      .strokeColor('#1E293B')
      .lineWidth(2)
      .moveTo(350, currentY)
      .lineTo(545, currentY)
      .stroke();

    currentY += 15;

    // Total
    doc
      .fillColor('#1E293B')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', priceX - 50, currentY)
      .fillColor('#667EEA')
      .fontSize(14)
      .text(this.formatCurrency(customer.pricing.offerPrice), amountX, currentY, { width: 50, align: 'right' });

    currentY += 30;

    // Amount in words
    doc
      .fillColor('#64748B')
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`Amount in words: ${this.numberToWords(customer.pricing.offerPrice)} Rupees Only`, 50, currentY, { width: 495 });
  }

  /**
   * Generate footer with terms and thank you message
   */
  private generateFooter(doc: PDFKit.PDFDocument): void {
    const footerY = 700;

    // Terms and conditions
    doc
      .fillColor('#64748B')
      .fontSize(8)
      .font('Helvetica')
      .text('Terms & Conditions:', 50, footerY)
      .text('1. Payment is due within 15 days of invoice date.', 50, footerY + 15)
      .text('2. Late payments may result in service suspension.', 50, footerY + 28)
      .text('3. All prices are in Indian Rupees (INR).', 50, footerY + 41);

    // Thank you message
    doc
      .fillColor('#667EEA')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Thank you for your business!', 50, footerY + 70, { align: 'center', width: 495 });

    // Footer line
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .moveTo(50, 780)
      .lineTo(545, 780)
      .stroke();

    // Company info at bottom
    doc
      .fillColor('#94A3B8')
      .fontSize(8)
      .font('Helvetica')
      .text('Vibgyor Payment Gateway | www.vibgyor.com | support@vibgyor.com', 50, 785, { align: 'center', width: 495 });
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(customer: ICustomer): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const customerCode = customer.customerId.split('-')[1].substring(0, 6);
    return `INV-${year}${month}-${customerCode}`;
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
   * Get invoice file path
   */
  getInvoicePath(fileName: string): string {
    return path.join(this.invoicesDir, fileName);
  }

  /**
   * Delete old invoices (cleanup)
   */
  async cleanupOldInvoices(daysOld: number = 30): Promise<void> {
    try {
      const files = fs.readdirSync(this.invoicesDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.invoicesDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old invoice: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning up old invoices:', error);
    }
  }
}
