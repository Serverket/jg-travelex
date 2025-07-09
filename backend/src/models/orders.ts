import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import TripModel from './trips';

export interface OrderItem {
  id?: number;
  order_id?: number;
  trip_id: number;
  amount: number;
  created_at?: Date;
}

export interface Order {
  id?: number;
  user_id: number;
  status?: 'pending' | 'completed' | 'canceled';
  total_amount: number;
  created_at?: Date;
  updated_at?: Date;
  items?: OrderItem[];
}

class OrderModel {
  async findAll(): Promise<Order[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM orders ORDER BY created_at DESC'
      );
      
      const orders = rows as Order[];
      
      // Fetch order items for each order
      for (const order of orders) {
        const [items] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        );
        
        order.items = items as OrderItem[];
      }
      
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Order[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      const orders = rows as Order[];
      
      // Fetch order items for each order
      for (const order of orders) {
        const [items] = await pool.query<RowDataPacket[]>(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        );
        
        order.items = items as OrderItem[];
      }
      
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Order | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM orders WHERE id = ?',
        [id]
      );
      
      if (!rows.length) return null;
      
      const order = rows[0] as Order;
      
      // Fetch order items
      const [items] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      
      order.items = items as OrderItem[];
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  async create(order: Order): Promise<number> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Insert order
      const [orderResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO orders (user_id, status, total_amount) VALUES (?, ?, ?)',
        [order.user_id, order.status || 'pending', order.total_amount]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert order items if any
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          await connection.query<ResultSetHeader>(
            'INSERT INTO order_items (order_id, trip_id, amount) VALUES (?, ?, ?)',
            [orderId, item.trip_id, item.amount]
          );
        }
      }
      
      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id: number, order: Partial<Order>): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update order fields
      const fieldsToUpdate = {...order};
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.created_at;
      delete fieldsToUpdate.updated_at;
      delete fieldsToUpdate.items;
      
      // Only update if there are fields to update
      const fields = Object.keys(fieldsToUpdate);
      if (fields.length > 0) {
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => (fieldsToUpdate as any)[field]);
        
        await connection.query<ResultSetHeader>(
          `UPDATE orders SET ${setClause} WHERE id = ?`,
          [...values, id]
        );
      }
      
      // Update order items if provided
      if (order.items) {
        // Delete existing order items
        await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        
        // Insert new order items
        for (const item of order.items) {
          await connection.query<ResultSetHeader>(
            'INSERT INTO order_items (order_id, trip_id, amount) VALUES (?, ?, ?)',
            [id, item.trip_id, item.amount]
          );
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete order items
      await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
      
      // Check if there's an invoice for this order
      const [invoices] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM invoices WHERE order_id = ?',
        [id]
      );
      
      // Delete invoice if exists
      if (invoices.length > 0) {
        await connection.query('DELETE FROM invoices WHERE order_id = ?', [id]);
      }
      
      // Delete order
      const [result] = await connection.query<ResultSetHeader>(
        'DELETE FROM orders WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new OrderModel();
