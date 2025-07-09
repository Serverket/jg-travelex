import express from 'express';
import {
  getAllSurchargeFactors,
  getSurchargeFactorById,
  createSurchargeFactor,
  updateSurchargeFactor,
  deleteSurchargeFactor
} from '../controllers/surchargeFactorController';

const router = express.Router();

// GET all surcharge factors
router.get('/', getAllSurchargeFactors);

// GET single surcharge factor
router.get('/:id', getSurchargeFactorById);

// POST create surcharge factor
router.post('/', createSurchargeFactor);

// PUT update surcharge factor
router.put('/:id', updateSurchargeFactor);

// DELETE surcharge factor
router.delete('/:id', deleteSurchargeFactor);

export default router;
