import { Request, Response } from 'express';
import SettingsModel, { Settings } from '../models/settings';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SettingsModel.getSettings();
    
    // If no settings exist yet, return default values
    if (!settings) {
      res.status(200).json({
        distance_rate: 0,
        duration_rate: 0
      });
      return;
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { distance_rate, duration_rate } = req.body;
    
    // Basic validation
    if (distance_rate === undefined || duration_rate === undefined) {
      res.status(400).json({ message: 'Distance rate and duration rate are required' });
      return;
    }
    
    // Parse rates to ensure they are numbers
    const settings: Settings = {
      distance_rate: parseFloat(distance_rate),
      duration_rate: parseFloat(duration_rate)
    };
    
    // Update settings
    const success = await SettingsModel.updateSettings(settings);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update settings' });
      return;
    }
    
    res.status(200).json({ 
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
