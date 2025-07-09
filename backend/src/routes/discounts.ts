import express from 'express';
import {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount
} from '../controllers/discountController';

const router = express.Router();

// GET all discounts
router.get('/', getAllDiscounts);

// GET single discount
router.get('/:id', getDiscountById);

// POST create discount
router.post('/', createDiscount);

// PUT update discount
router.put('/:id', updateDiscount);

// DELETE discount
router.delete('/:id', deleteDiscount);

export default router;
