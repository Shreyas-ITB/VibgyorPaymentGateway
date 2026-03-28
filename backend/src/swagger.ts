/**
 * Swagger/OpenAPI Configuration
 */

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Vibgyor Payment Gateway API',
    version: '1.0.0',
    description: 'API for handling payment operations with Razorpay and PineLabs',
    contact: {
      name: 'API Support'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.vibgyor.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Payment',
      description: 'Payment operations'
    },
    {
      name: 'Health',
      description: 'Health check endpoints'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/payment/initiate': {
      post: {
        tags: ['Payment'],
        summary: 'Initiate a payment order',
        description: 'Creates a payment order with the configured payment provider (Razorpay or PineLabs)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId', 'amount', 'billingCycle'],
                properties: {
                  planId: {
                    type: 'string',
                    description: 'Unique identifier for the subscription plan',
                    example: 'basic'
                  },
                  amount: {
                    type: 'number',
                    description: 'Payment amount in smallest currency unit (paise for INR)',
                    example: 99900
                  },
                  billingCycle: {
                    type: 'string',
                    enum: ['monthly', 'annual'],
                    description: 'Billing cycle for the subscription',
                    example: 'monthly'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'object',
                      properties: {
                        orderId: {
                          type: 'string',
                          description: 'Payment order ID from provider'
                        },
                        amount: {
                          type: 'number',
                          description: 'Order amount'
                        },
                        currency: {
                          type: 'string',
                          example: 'INR'
                        },
                        provider: {
                          type: 'string',
                          enum: ['razorpay', 'pinelabs'],
                          description: 'Payment provider name'
                        },
                        providerKey: {
                          type: 'string',
                          description: 'Public key for the payment provider'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/api/payment/verify': {
      post: {
        tags: ['Payment'],
        summary: 'Verify a completed payment',
        description: 'Verifies payment signature and generates subscription record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'paymentId', 'signature', 'planId', 'amount'],
                properties: {
                  orderId: {
                    type: 'string',
                    description: 'Order ID from payment initiation'
                  },
                  paymentId: {
                    type: 'string',
                    description: 'Payment ID from provider'
                  },
                  signature: {
                    type: 'string',
                    description: 'Payment signature for verification'
                  },
                  planId: {
                    type: 'string',
                    description: 'Subscription plan ID'
                  },
                  amount: {
                    type: 'number',
                    description: 'Payment amount'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    data: {
                      type: 'object',
                      properties: {
                        subscriptionId: {
                          type: 'string',
                          description: 'Generated subscription ID'
                        },
                        planId: {
                          type: 'string'
                        },
                        status: {
                          type: 'string',
                          example: 'active'
                        },
                        startDate: {
                          type: 'string',
                          format: 'date-time'
                        },
                        endDate: {
                          type: 'string',
                          format: 'date-time'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Payment verification failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Error message'
              }
            }
          }
        }
      }
    }
  }
};
