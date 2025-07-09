import express from 'express';
import {
  getSettings,
  updateSettings
} from '../controllers/settingsController';

const router = express.Router();

// GET settings
router.get('/', getSettings);

// PUT update settings
router.put('/', updateSettings);

export default router;
