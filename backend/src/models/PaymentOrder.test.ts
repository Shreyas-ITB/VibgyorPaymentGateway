/**
 * Unit tests for PaymentOrder model
 */

import { PaymentOrder } from './PaymentOrder';

describe('PaymentOrder Model', () => {
  it('should create a valid payment order with razorpay provider', () => {
    const order: PaymentOrder = {
      orderId: 'order_123',
      planId: 'basic',
      amount: 10000,
      currency: 'INR',
      provider: 'razorpay',
      status: 'created',
      createdAt: new Date('2024-01-01T00:00:00Z')
    };

    expect(order.orderId).toBe('order_123');
    expect(order.planId).toBe('basic');
    expect(order.amount).toBe(10000);
    expect(order.currency).toBe('INR');
    expect(order.provider).toBe('razorpay');
    expect(order.status).toBe('created');
    expect(order.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should create a valid payment order with pinelabs provider', () => {
    const order: PaymentOrder = {
      orderId: 'order_456',
      planId: 'pro',
      amount: 20000,
      currency: 'INR',
      provider: 'pinelabs',
      status: 'completed',
      createdAt: new Date('2024-01-02T00:00:00Z')
    };

    expect(order.provider).toBe('pinelabs');
    expect(order.status).toBe('completed');
  });

  it('should support all status values', () => {
    const statuses: Array<'created' | 'completed' | 'failed'> = ['created', 'completed', 'failed'];
    
    statuses.forEach(status => {
      const order: PaymentOrder = {
        orderId: 'order_test',
        planId: 'test',
        amount: 1000,
        currency: 'INR',
        provider: 'razorpay',
        status,
        createdAt: new Date()
      };
      
      expect(order.status).toBe(status);
    });
  });
});
