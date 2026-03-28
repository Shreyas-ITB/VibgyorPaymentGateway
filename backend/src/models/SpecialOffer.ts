import mongoose, { Schema, Document } from 'mongoose';

export interface ISpecialOffer extends Document {
  name: string;
  displayName: string;
  freeMonths: number;
  discountPercentage?: number;
  description?: string;
  applicablePlans: string[]; // Array of plan names this offer applies to
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SpecialOfferSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    freeMonths: {
      type: Number,
      default: 0,
      min: 0
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    description: {
      type: String,
      trim: true
    },
    applicablePlans: {
      type: [String],
      default: [], // Empty array means applies to all plans
      validate: {
        validator: function(plans: string[]) {
          // Validate that plan names are valid (quarterly, yearly, etc.)
          const validPlans = ['quarterly', 'yearly'];
          return plans.every(plan => validPlans.includes(plan));
        },
        message: 'Invalid plan name in applicablePlans'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ISpecialOffer>('SpecialOffer', SpecialOfferSchema);
