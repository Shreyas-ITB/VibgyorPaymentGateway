import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  customerId: string;
  businessName: string;
  businessEmail: string;
  contactPerson: string;
  phone: string;
  address: string;
  gstNumber?: string;
  planStatus: 'active' | 'dormant' | 'inactive';
  isDeactivated: boolean;
  docusealSubmissionId?: string;
  teamMembers: {
    salesPerson: string;
    responsiblePerson: string;
    approvedBy: string;
  };
  subscription: {
    planName: string;
    planType: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
    status: 'Active' | 'Expired' | 'Pending' | 'Deactivated';
    startDate: Date;
    nextRenewal: Date;
    amount: number;
  };
  pricing: {
    planPrice: number;
    addonsPrice: number;
    offerPrice: number;
    renewalPrice: number;
    addons: string[];
    offers: string[];
  };
  paymentLink?: {
    id: string;
    shortUrl: string;
    status: 'created' | 'paid' | 'expired' | 'cancelled';
    createdAt: Date;
    expiresAt: Date;
  };
  paymentHistory: Array<{
    paymentId: string;
    date: Date;
    amount: number;
    status: 'Success' | 'Failed' | 'Pending';
    method: string;
    invoiceUrl?: string;
  }>;
  auditLog: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    details?: string;
    changes?: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    businessName: {
      type: String,
      required: true
    },
    businessEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    contactPerson: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    gstNumber: {
      type: String,
      default: null
    },
    planStatus: {
      type: String,
      enum: ['active', 'dormant', 'inactive'],
      default: 'active'
    },
    isDeactivated: {
      type: Boolean,
      default: false
    },
    docusealSubmissionId: {
      type: String,
      default: null,
      index: true
    },
    teamMembers: {
      salesPerson: {
        type: String,
        required: true
      },
      responsiblePerson: {
        type: String,
        required: true
      },
      approvedBy: {
        type: String,
        default: 'Pending'
      }
    },
    subscription: {
      planName: {
        type: String,
        required: true
      },
      planType: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
        required: true
      },
      status: {
        type: String,
        enum: ['Active', 'Expired', 'Pending', 'Deactivated'],
        default: 'Pending'
      },
      startDate: {
        type: Date,
        required: true
      },
      nextRenewal: {
        type: Date,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    },
    pricing: {
      planPrice: {
        type: Number,
        required: true
      },
      addonsPrice: {
        type: Number,
        default: 0
      },
      offerPrice: {
        type: Number,
        required: true
      },
      renewalPrice: {
        type: Number,
        required: true
      },
      addons: {
        type: [String],
        default: []
      },
      offers: {
        type: [String],
        default: []
      }
    },
    paymentLink: {
      id: {
        type: String,
        default: null
      },
      shortUrl: {
        type: String,
        default: null
      },
      status: {
        type: String,
        enum: ['created', 'paid', 'expired', 'cancelled'],
        default: null
      },
      createdAt: {
        type: Date,
        default: null
      },
      expiresAt: {
        type: Date,
        default: null
      }
    },
    paymentHistory: [
      {
        paymentId: {
          type: String,
          required: true
        },
        date: {
          type: Date,
          required: true
        },
        amount: {
          type: Number,
          required: true
        },
        status: {
          type: String,
          enum: ['Success', 'Failed', 'Pending'],
          required: true
        },
        method: {
          type: String,
          required: true
        },
        invoiceUrl: {
          type: String,
          default: null
        }
      }
    ],
    auditLog: [
      {
        timestamp: {
          type: Date,
          required: true,
          default: Date.now
        },
        action: {
          type: String,
          required: true
        },
        performedBy: {
          type: String,
          required: true
        },
        details: {
          type: String,
          default: null
        },
        changes: [
          {
            field: {
              type: String,
              required: true
            },
            oldValue: {
              type: Schema.Types.Mixed,
              default: null
            },
            newValue: {
              type: Schema.Types.Mixed,
              default: null
            }
          }
        ]
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
