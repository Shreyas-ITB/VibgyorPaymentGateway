import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  displayName: string;
  duration: number; // in months
  price: number;
  features: string[]; // Array of plan features
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema(
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
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function(features: string[]) {
          // Ensure all features are non-empty strings
          return features.every(feature => feature && feature.trim().length > 0);
        },
        message: 'All features must be non-empty strings'
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

export default mongoose.model<IPlan>('Plan', PlanSchema);
