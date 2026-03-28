import { Request, Response } from 'express';
import SpecialOffer from '../models/SpecialOffer';

/**
 * Get all special offers
 */
export const getAllSpecialOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const offers = await SpecialOffer.find({ isActive: true }).sort({ displayName: 1 });
    res.json({
      success: true,
      data: offers
    });
  } catch (error: any) {
    console.error('Error fetching special offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch special offers',
      error: error.message
    });
  }
};

/**
 * Get special offer by ID
 */
export const getSpecialOfferById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const offer = await SpecialOffer.findById(id);

    if (!offer) {
      res.status(404).json({
        success: false,
        message: 'Special offer not found'
      });
      return;
    }

    res.json({
      success: true,
      data: offer
    });
  } catch (error: any) {
    console.error('Error fetching special offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch special offer',
      error: error.message
    });
  }
};

/**
 * Create new special offer
 */
export const createSpecialOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, freeMonths, discountPercentage, description, applicablePlans } = req.body;

    // Validate required fields
    if (!name || !displayName) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, displayName'
      });
      return;
    }

    // Check if offer with same name already exists
    const existingOffer = await SpecialOffer.findOne({ name });
    if (existingOffer) {
      res.status(409).json({
        success: false,
        message: 'Special offer with this name already exists'
      });
      return;
    }

    const offer = new SpecialOffer({
      name,
      displayName,
      freeMonths: freeMonths || 0,
      discountPercentage,
      description,
      applicablePlans: applicablePlans || [], // Default to empty array (applies to all plans)
      isActive: true
    });

    await offer.save();

    res.status(201).json({
      success: true,
      message: 'Special offer created successfully',
      data: offer
    });
  } catch (error: any) {
    console.error('Error creating special offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create special offer',
      error: error.message
    });
  }
};

/**
 * Update special offer
 */
export const updateSpecialOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, displayName, freeMonths, discountPercentage, description, applicablePlans, isActive } = req.body;

    const offer = await SpecialOffer.findById(id);
    if (!offer) {
      res.status(404).json({
        success: false,
        message: 'Special offer not found'
      });
      return;
    }

    // Check if name is being changed and if it conflicts with another offer
    if (name && name !== offer.name) {
      const existingOffer = await SpecialOffer.findOne({ name, _id: { $ne: id } });
      if (existingOffer) {
        res.status(409).json({
          success: false,
          message: 'Special offer with this name already exists'
        });
        return;
      }
    }

    // Update fields
    if (name) offer.name = name;
    if (displayName) offer.displayName = displayName;
    if (freeMonths !== undefined) offer.freeMonths = freeMonths;
    if (discountPercentage !== undefined) offer.discountPercentage = discountPercentage;
    if (description !== undefined) offer.description = description;
    if (applicablePlans !== undefined) offer.applicablePlans = applicablePlans;
    if (isActive !== undefined) offer.isActive = isActive;

    await offer.save();

    res.json({
      success: true,
      message: 'Special offer updated successfully',
      data: offer
    });
  } catch (error: any) {
    console.error('Error updating special offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update special offer',
      error: error.message
    });
  }
};

/**
 * Delete special offer (soft delete by setting isActive to false)
 */
export const deleteSpecialOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const offer = await SpecialOffer.findById(id);
    if (!offer) {
      res.status(404).json({
        success: false,
        message: 'Special offer not found'
      });
      return;
    }

    offer.isActive = false;
    await offer.save();

    res.json({
      success: true,
      message: 'Special offer deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting special offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete special offer',
      error: error.message
    });
  }
};
