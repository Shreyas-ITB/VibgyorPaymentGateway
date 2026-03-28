import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibgyor-payment-gateway';

/**
 * Seed customer data for testing
 */
const seedCustomer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Sample customer data
    const customerData = {
      customerId: 'CUST001',
      businessName: 'Acme Corporation Pvt Ltd',
      businessEmail: 'contact@acmecorp.com',
      contactPerson: 'John Doe',
      phone: '+91 98765 43210',
      address: '123 Business Park, MG Road, Bangalore - 560001',
      gstNumber: '29ABCDE1234F1Z5',
      teamMembers: {
        salesPerson: 'Arjun Mehta',
        responsiblePerson: 'Sanjay Gupta',
        approvedBy: 'Ramesh Iyer'
      },
      subscription: {
        planName: 'Professional Plan',
        planType: 'Yearly',
        status: 'Active',
        startDate: new Date('2025-01-15'),
        nextRenewal: new Date('2026-01-15'),
        amount: 12000
      },
      pricing: {
        planPrice: 300000,
        addonsPrice: 50000,
        offerPrice: 300000,
        renewalPrice: 320000,
        addons: ['Priority Support (+₹25,000)', 'Advanced Analytics (+₹25,000)'],
        offers: ['2 Months Free Plan']
      },
      paymentHistory: [
        {
          paymentId: 'PAY001',
          date: new Date('2025-01-15'),
          amount: 12000,
          status: 'Success',
          method: 'Razorpay',
          invoiceUrl: 'https://example.com/invoice/PAY001.pdf'
        },
        {
          paymentId: 'PAY002',
          date: new Date('2024-01-15'),
          amount: 12000,
          status: 'Success',
          method: 'Razorpay',
          invoiceUrl: 'https://example.com/invoice/PAY002.pdf'
        },
        {
          paymentId: 'PAY003',
          date: new Date('2023-01-15'),
          amount: 10000,
          status: 'Success',
          method: 'Pine Labs',
          invoiceUrl: 'https://example.com/invoice/PAY003.pdf'
        }
      ]
    };

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ businessEmail: customerData.businessEmail });

    if (existingCustomer) {
      console.log('Customer already exists. Updating...');
      Object.assign(existingCustomer, customerData);
      await existingCustomer.save();
      console.log('✓ Customer updated successfully');
    } else {
      console.log('Creating new customer...');
      const newCustomer = new Customer(customerData);
      await newCustomer.save();
      console.log('✓ Customer created successfully');
    }

    // Display customer info
    console.log('\n=== Customer Details ===');
    console.log('Email:', customerData.businessEmail);
    console.log('Base64 Email:', Buffer.from(customerData.businessEmail).toString('base64'));
    console.log('\nAccess URL:');
    console.log(`http://localhost:5173/customer-portal?usr=${Buffer.from(customerData.businessEmail).toString('base64')}`);
    console.log('========================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding customer:', error);
    process.exit(1);
  }
};

// Run seed function
seedCustomer();
