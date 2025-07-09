import express from 'express';
import {
  getAllOrders,
  getOrdersByUserId,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder
} from '../controllers/orderController';

const router = express.Router();

// GET all orders
router.get('/', getAllOrders);

// GET orders by user ID
router.get('/user/:userId', getOrdersByUserId);

// GET single order
router.get('/:id', getOrderById);

// POST create order
router.post('/', createOrder);

// PUT update order
router.put('/:id', updateOrder);

// DELETE order
router.delete('/:id', deleteOrder);

export default router;
