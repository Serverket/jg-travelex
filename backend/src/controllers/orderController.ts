import { Request, Response } from 'express';
import OrderModel, { Order, OrderItem } from '../models/orders';

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await OrderModel.findAll();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrdersByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const orders = await OrderModel.findByUserId(userId);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error getting orders by user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.findById(id);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      status,
      total_amount,
      items
    } = req.body;
    
    // Basic validation
    if (!user_id || total_amount === undefined || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Required fields are missing or invalid' });
      return;
    }
    
    // Parse user ID and total amount
    const parsedUserId = parseInt(user_id);
    const parsedTotalAmount = parseFloat(total_amount);
    
    if (isNaN(parsedTotalAmount) || parsedTotalAmount < 0) {
      res.status(400).json({ message: 'Total amount must be a valid non-negative number' });
      return;
    }
    
    // Validate order items
    const orderItems: OrderItem[] = [];
    for (const item of items) {
      if (!item.trip_id || item.amount === undefined) {
        res.status(400).json({ message: 'Order items must have trip_id and amount' });
        return;
      }
      
      const parsedAmount = parseFloat(item.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ message: 'Order item amount must be a valid positive number' });
        return;
      }
      
      orderItems.push({
        trip_id: parseInt(item.trip_id),
        amount: parsedAmount
      });
    }
    
    // Create order
    const orderId = await OrderModel.create({
      user_id: parsedUserId,
      status: status as 'pending' | 'completed' | 'canceled',
      total_amount: parsedTotalAmount,
      items: orderItems
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const {
      status,
      total_amount,
      items
    } = req.body;
    
    // Check if order exists
    const existingOrder = await OrderModel.findById(id);
    if (!existingOrder) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    // Build update data
    const updateData: Partial<Order> = {};
    
    if (status !== undefined) {
      if (!['pending', 'completed', 'canceled'].includes(status)) {
        res.status(400).json({ message: 'Status must be pending, completed, or canceled' });
        return;
      }
      updateData.status = status as 'pending' | 'completed' | 'canceled';
    }
    
    if (total_amount !== undefined) {
      const parsedTotalAmount = parseFloat(total_amount);
      if (isNaN(parsedTotalAmount) || parsedTotalAmount < 0) {
        res.status(400).json({ message: 'Total amount must be a valid non-negative number' });
        return;
      }
      updateData.total_amount = parsedTotalAmount;
    }
    
    // Process items if provided
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        res.status(400).json({ message: 'Items must be an array' });
        return;
      }
      
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        if (!item.trip_id || item.amount === undefined) {
          res.status(400).json({ message: 'Order items must have trip_id and amount' });
          return;
        }
        
        const parsedAmount = parseFloat(item.amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          res.status(400).json({ message: 'Order item amount must be a valid positive number' });
          return;
        }
        
        orderItems.push({
          trip_id: parseInt(item.trip_id),
          amount: parsedAmount
        });
      }
      
      updateData.items = orderItems;
    }
    
    // Update order
    const success = await OrderModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update order' });
      return;
    }
    
    res.status(200).json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if order exists
    const existingOrder = await OrderModel.findById(id);
    if (!existingOrder) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    // Delete order
    const success = await OrderModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete order' });
      return;
    }
    
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
