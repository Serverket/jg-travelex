import { Request, Response } from 'express';
import DiscountModel, { Discount } from '../models/discounts';

export const getAllDiscounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const discounts = await DiscountModel.findAll();
    res.status(200).json(discounts);
  } catch (error) {
    console.error('Error getting discounts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDiscountById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const discount = await DiscountModel.findById(id);
    
    if (!discount) {
      res.status(404).json({ message: 'Discount not found' });
      return;
    }
    
    res.status(200).json(discount);
  } catch (error) {
    console.error('Error getting discount:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rate, type } = req.body;
    
    // Basic validation
    if (!name || rate === undefined || !type) {
      res.status(400).json({ message: 'Name, rate, and type are required' });
      return;
    }
    
    // Validate type
    if (type !== 'percentage' && type !== 'fixed') {
      res.status(400).json({ message: 'Type must be either percentage or fixed' });
      return;
    }
    
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      res.status(400).json({ message: 'Rate must be a valid non-negative number' });
      return;
    }
    
    const discountId = await DiscountModel.create({
      name,
      rate: parsedRate,
      type: type as 'percentage' | 'fixed'
    });
    
    res.status(201).json({ 
      message: 'Discount created successfully',
      discountId
    });
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, rate, type } = req.body;
    
    // Check if discount exists
    const existingDiscount = await DiscountModel.findById(id);
    if (!existingDiscount) {
      res.status(404).json({ message: 'Discount not found' });
      return;
    }
    
    // Validate data if provided
    const updateData: Partial<Discount> = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (rate !== undefined) {
      const parsedRate = parseFloat(rate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        res.status(400).json({ message: 'Rate must be a valid non-negative number' });
        return;
      }
      updateData.rate = parsedRate;
    }
    
    if (type !== undefined) {
      if (type !== 'percentage' && type !== 'fixed') {
        res.status(400).json({ message: 'Type must be either percentage or fixed' });
        return;
      }
      updateData.type = type as 'percentage' | 'fixed';
    }
    
    // Update discount
    const success = await DiscountModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update discount' });
      return;
    }
    
    res.status(200).json({ message: 'Discount updated successfully' });
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if discount exists
    const existingDiscount = await DiscountModel.findById(id);
    if (!existingDiscount) {
      res.status(404).json({ message: 'Discount not found' });
      return;
    }
    
    // Delete discount
    const success = await DiscountModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete discount' });
      return;
    }
    
    res.status(200).json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
