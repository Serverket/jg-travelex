import { Request, Response } from 'express';
import SurchargeFactorModel, { SurchargeFactor } from '../models/surchargeFactors';

export const getAllSurchargeFactors = async (req: Request, res: Response): Promise<void> => {
  try {
    const surchargeFactors = await SurchargeFactorModel.findAll();
    res.status(200).json(surchargeFactors);
  } catch (error) {
    console.error('Error getting surcharge factors:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSurchargeFactorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const surchargeFactor = await SurchargeFactorModel.findById(id);
    
    if (!surchargeFactor) {
      res.status(404).json({ message: 'Surcharge factor not found' });
      return;
    }
    
    res.status(200).json(surchargeFactor);
  } catch (error) {
    console.error('Error getting surcharge factor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSurchargeFactor = async (req: Request, res: Response): Promise<void> => {
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
    
    const surchargeFactorId = await SurchargeFactorModel.create({
      name,
      rate: parsedRate,
      type: type as 'percentage' | 'fixed'
    });
    
    res.status(201).json({ 
      message: 'Surcharge factor created successfully',
      surchargeFactorId
    });
  } catch (error) {
    console.error('Error creating surcharge factor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSurchargeFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, rate, type } = req.body;
    
    // Check if surcharge factor exists
    const existingSurchargeFactor = await SurchargeFactorModel.findById(id);
    if (!existingSurchargeFactor) {
      res.status(404).json({ message: 'Surcharge factor not found' });
      return;
    }
    
    // Validate data if provided
    const updateData: Partial<SurchargeFactor> = {};
    
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
    
    // Update surcharge factor
    const success = await SurchargeFactorModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update surcharge factor' });
      return;
    }
    
    res.status(200).json({ message: 'Surcharge factor updated successfully' });
  } catch (error) {
    console.error('Error updating surcharge factor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSurchargeFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if surcharge factor exists
    const existingSurchargeFactor = await SurchargeFactorModel.findById(id);
    if (!existingSurchargeFactor) {
      res.status(404).json({ message: 'Surcharge factor not found' });
      return;
    }
    
    // Delete surcharge factor
    const success = await SurchargeFactorModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete surcharge factor' });
      return;
    }
    
    res.status(200).json({ message: 'Surcharge factor deleted successfully' });
  } catch (error) {
    console.error('Error deleting surcharge factor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
