import express, { Router } from 'express';
import db from '../src/config/db';

const router: Router = express.Router();

/**
 * @route GET /api/health
 * @desc Check API health status
 * @access Public
 */
router.get('/', async (_req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    
    return res.status(200).json({
      status: 'ok',
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'API is not healthy',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
