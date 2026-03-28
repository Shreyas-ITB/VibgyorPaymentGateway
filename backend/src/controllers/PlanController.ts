import { Request, Response } from 'express';
import Plan from '../models/Plan';

/**
 * Get all plans
 */
export const getAllPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ duration: 1 });
    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

/**
 * Get plan by ID
 */
export const getPlanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
      return;
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan',
      error: error.message
    });
  }
};

/**
 * Create new plan
 */
export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, duration, price, features } = req.body;

    // Validate required fields
    if (!name || !displayName || !duration || price === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, displayName, duration, price'
      });
      return;
    }

    // Check if plan with same name already exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      res.status(409).json({
        success: false,
        message: 'Plan with this name already exists'
      });
      return;
    }

    const plan = new Plan({
      name,
      displayName,
      duration,
      price,
      features: features || [], // Default to empty array if not provided
      isActive: true
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
};

/**
 * Update plan
 */
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, displayName, duration, price, features, isActive } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
      return;
    }

    // Check if name is being changed and if it conflicts with another plan
    if (name && name !== plan.name) {
      const existingPlan = await Plan.findOne({ name, _id: { $ne: id } });
      if (existingPlan) {
        res.status(409).json({
          success: false,
          message: 'Plan with this name already exists'
        });
        return;
      }
    }

    // Update fields
    if (name) plan.name = name;
    if (displayName) plan.displayName = displayName;
    if (duration) plan.duration = duration;
    if (price !== undefined) plan.price = price;
    if (features !== undefined) plan.features = features;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
};

/**
 * Delete plan (soft delete by setting isActive to false)
 */
export const deletePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
      return;
    }

    plan.isActive = false;
    await plan.save();

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
};
