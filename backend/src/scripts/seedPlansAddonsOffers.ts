import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan';
import Addon from '../models/Addon';
import SpecialOffer from '../models/SpecialOffer';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibgyor-payment-gateway';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Plan.deleteMany({});
    await Addon.deleteMany({});
    await SpecialOffer.deleteMany({});
    console.log('✓ Cleared existing data');

    // Seed Plans
    const plans = [
      {
        name: 'quarterly',
        displayName: 'Quarterly Plan',
        duration: 3,
        price: 75000,
        features: [
          'Basic payment processing',
          'Standard customer support',
          'Monthly reports',
          'Basic analytics dashboard',
          'Email notifications'
        ],
        isActive: true
      },
      {
        name: 'yearly',
        displayName: 'Yearly Plan',
        duration: 12,
        price: 300000,
        features: [
          'Advanced payment processing',
          'Priority customer support',
          'Real-time reports',
          'Advanced analytics dashboard',
          'SMS & Email notifications',
          'Custom integrations',
          'Dedicated account manager',
          'API access',
          'Multi-currency support'
        ],
        isActive: true
      }
    ];

    await Plan.insertMany(plans);
    console.log('✓ Seeded plans');

    // Seed Addons
    const addons = [
      { name: 'priority-support', displayName: 'Priority Support', price: 25000, description: '24/7 priority customer support', applicablePlans: ['quarterly', 'yearly'], isActive: true },
      { name: 'advanced-analytics', displayName: 'Advanced Analytics', price: 25000, description: 'Advanced analytics and reporting', applicablePlans: ['yearly'], isActive: true },
      { name: 'email-support', displayName: 'Email Support', price: 10000, description: 'Dedicated email support', applicablePlans: ['quarterly'], isActive: true },
      { name: '24-7-support', displayName: '24/7 Support', price: 40000, description: 'Round-the-clock support', applicablePlans: ['yearly'], isActive: true },
      { name: 'custom-integration', displayName: 'Custom Integration', price: 35000, description: 'Custom API integration', applicablePlans: ['yearly'], isActive: true },
      { name: 'dedicated-manager', displayName: 'Dedicated Manager', price: 25000, description: 'Dedicated account manager', applicablePlans: ['quarterly', 'yearly'], isActive: true },
      { name: 'training-sessions', displayName: 'Training Sessions', price: 8000, description: 'Training and onboarding sessions', applicablePlans: ['quarterly'], isActive: true },
      { name: 'api-access', displayName: 'API Access', price: 10000, description: 'Full API access', applicablePlans: ['quarterly', 'yearly'], isActive: true },
      { name: 'basic-analytics', displayName: 'Basic Analytics', price: 7000, description: 'Basic analytics dashboard', applicablePlans: ['quarterly'], isActive: true }
    ];

    await Addon.insertMany(addons);
    console.log('✓ Seeded addons');

    // Seed Special Offers
    const offers = [
      { name: '2-months-free', displayName: '2 Months Free Plan', freeMonths: 2, description: 'Get 2 months free with your subscription', applicablePlans: ['yearly'], isActive: true },
      { name: '1-month-free', displayName: '1 Month Free Plan', freeMonths: 1, description: 'Get 1 month free with your subscription', applicablePlans: ['quarterly'], isActive: true },
      { name: '10-percent-renewal', displayName: '10% Discount on Renewal', freeMonths: 0, discountPercentage: 10, description: '10% discount on renewal', applicablePlans: ['quarterly', 'yearly'], isActive: true }
    ];

    await SpecialOffer.insertMany(offers);
    console.log('✓ Seeded special offers');

    console.log('✓ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seed failed:', error);
    process.exit(1);
  }
};

seedData();
