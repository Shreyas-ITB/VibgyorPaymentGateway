import { Request, Response } from 'express';
import Addon from '../models/Addon';

/**
 * Get all addons
 */
export const getAllAddons = async (req: Request, res: Response): Promise<void> => {
  try {
    const addons = await Addon.find({ isActive: true }).sort({ displayName: 1 });
    res.json({
      success: true,
      data: addons
    });
  } catch (error: any) {
    console.error('Error fetching addons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addons',
      error: error.message
    });
  }
};

/**
 * Get addon by ID
 */
export const getAddonById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const addon = await Addon.findById(id);

    if (!addon) {
      res.status(404).json({
        success: false,
        message: 'Addon not found'
      });
      return;
    }

    res.json({
      success: true,
      data: addon
    });
  } catch (error: any) {
    console.error('Error fetching addon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addon',
      error: error.message
    });
  }
};

/**
 * Create new addon
 */
export const createAddon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, price, description, applicablePlans } = req.body;

    // Validate required fields
    if (!name || !displayName || price === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, displayName, price'
      });
      return;
    }

    // Check if addon with same name already exists
    const existingAddon = await Addon.findOne({ name });
    if (existingAddon) {
      res.status(409).json({
        success: false,
        message: 'Addon with this name already exists'
      });
      return;
    }

    const addon = new Addon({
      name,
      displayName,
      price,
      description,
      applicablePlans: applicablePlans || [], // Default to empty array (applies to all plans)
      isActive: true
    });

    await addon.save();

    res.status(201).json({
      success: true,
      message: 'Addon created successfully',
      data: addon
    });
  } catch (error: any) {
    console.error('Error creating addon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create addon',
      error: error.message
    });
  }
};

/**
 * Update addon
 */
export const updateAddon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, displayName, price, description, applicablePlans, isActive } = req.body;

    const addon = await Addon.findById(id);
    if (!addon) {
      res.status(404).json({
        success: false,
        message: 'Addon not found'
      });
      return;
    }

    // Check if name is being changed and if it conflicts with another addon
    if (name && name !== addon.name) {
      const existingAddon = await Addon.findOne({ name, _id: { $ne: id } });
      if (existingAddon) {
        res.status(409).json({
          success: false,
          message: 'Addon with this name already exists'
        });
        return;
      }
    }

    // Update fields
    if (name) addon.name = name;
    if (displayName) addon.displayName = displayName;
    if (price !== undefined) addon.price = price;
    if (description !== undefined) addon.description = description;
    if (applicablePlans !== undefined) addon.applicablePlans = applicablePlans;
    if (isActive !== undefined) addon.isActive = isActive;

    await addon.save();

    res.json({
      success: true,
      message: 'Addon updated successfully',
      data: addon
    });
  } catch (error: any) {
    console.error('Error updating addon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update addon',
      error: error.message
    });
  }
};

/**
 * Delete addon (soft delete by setting isActive to false)
 */
export const deleteAddon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const addon = await Addon.findById(id);
    if (!addon) {
      res.status(404).json({
        success: false,
        message: 'Addon not found'
      });
      return;
    }

    addon.isActive = false;
    await addon.save();

    res.json({
      success: true,
      message: 'Addon deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting addon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete addon',
      error: error.message
    });
  }
};
