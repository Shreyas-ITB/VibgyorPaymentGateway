/**
 * Unit tests for IPaymentProvider interface and related types
 */

import { IPaymentProvider, OrderResponse } from './IPaymentProvider';

describe('IPaymentProvider Interface', () => {
  describe('OrderResponse', () => {
    it('should have correct structure', () => {
      const orderResponse: OrderResponse = {
        orderId: 'order_123',
        amount: 10000,
        currency: 'INR'
      };

      expect(orderResponse.orderId).toBe('order_123');
      expect(orderResponse.amount).toBe(10000);
      expect(orderResponse.currency).toBe('INR');
    });
  });

  describe('IPaymentProvider implementation', () => {
    it('should be implementable by a mock provider', async () => {
      // Create a mock implementation to verify the interface is correct
      class MockProvider implements IPaymentProvider {
        async createOrder(amount: number, currency: string, _metadata: any): Promise<OrderResponse> {
          return {
            orderId: 'mock_order_123',
            amount,
            currency
          };
        }

        async verifyPayment(orderId: string, paymentId: string, _signature: string): Promise<boolean> {
          return orderId === 'mock_order_123' && paymentId === 'mock_payment_123';
        }

        getProviderKey(): string {
          return 'mock_key_123';
        }
      }

      const provider = new MockProvider();
      
      // Test createOrder
      const order = await provider.createOrder(10000, 'INR', { planId: 'basic' });
      expect(order.orderId).toBe('mock_order_123');
      expect(order.amount).toBe(10000);
      expect(order.currency).toBe('INR');

      // Test verifyPayment
      const isValid = await provider.verifyPayment('mock_order_123', 'mock_payment_123', 'signature');
      expect(isValid).toBe(true);

      const isInvalid = await provider.verifyPayment('wrong_order', 'wrong_payment', 'signature');
      expect(isInvalid).toBe(false);

      // Test getProviderKey
      const key = provider.getProviderKey();
      expect(key).toBe('mock_key_123');
    });
  });
});
