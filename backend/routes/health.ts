import express, { Router } from 'express';
import supabase from '../src/config/db';

const router: Router = express.Router();

/**
 * @route GET /api/health
 * @desc Check API health status and Supabase connection
 * @access Public
 */
router.get('/', async (_req, res) => {
  try {
    // Test Supabase connection by querying settings table
    const { data, error } = await supabase
      .from('settings')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({
      status: 'ok',
      message: 'API is healthy - Supabase connected',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'API unhealthy - Supabase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
