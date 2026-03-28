import mongoose, { Schema, Document } from 'mongoose';

export interface IAddon extends Document {
  name: string;
  displayName: string;
  price: number;
  description?: string;
  applicablePlans: string[]; // Array of plan names this addon applies to
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddonSchema: Schema = new Schema(
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
    price: {
      type: Number,
      required: true,
      min: 0
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

export default mongoose.model<IAddon>('Addon', AddonSchema);
