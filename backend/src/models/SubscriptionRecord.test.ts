/**
 * Unit tests for SubscriptionRecord model
 */

import { SubscriptionRecord } from './SubscriptionRecord';

describe('SubscriptionRecord Model', () => {
  it('should create a valid subscription record', () => {
    const subscription: SubscriptionRecord = {
      subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
      planId: 'basic',
      amount: 10000,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      status: 'completed'
    };

    expect(subscription.subscriptionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(subscription.planId).toBe('basic');
    expect(subscription.amount).toBe(10000);
    expect(subscription.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    expect(subscription.status).toBe('completed');
  });

  it('should support all status values', () => {
    const statuses: Array<'pending' | 'completed' | 'failed'> = ['pending', 'completed', 'failed'];
    
    statuses.forEach(status => {
      const subscription: SubscriptionRecord = {
        subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
        planId: 'test',
        amount: 1000,
        createdAt: new Date(),
        status
      };
      
      expect(subscription.status).toBe(status);
    });
  });

  it('should handle different plan IDs', () => {
    const planIds = ['basic', 'pro', 'enterprise', 'custom'];
    
    planIds.forEach(planId => {
      const subscription: SubscriptionRecord = {
        subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
        planId,
        amount: 1000,
        createdAt: new Date(),
        status: 'completed'
      };
      
      expect(subscription.planId).toBe(planId);
    });
  });
});
