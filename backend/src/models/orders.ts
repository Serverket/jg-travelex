import supabase from '../config/db';
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
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            trip_id,
            amount,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Transform the data to match our interface
      return (orders || []).map(order => ({
        ...order,
        items: order.order_items || []
      }));
    } catch (error) {
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Order[]> {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            trip_id,
            amount,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Transform the data to match our interface
      return (orders || []).map(order => ({
        ...order,
        items: order.order_items || []
      }));
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Order | null> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            trip_id,
            amount,
            created_at
          )
        `)
        .eq('id', id)
        .single();
      
      if (orderError) {
        if (orderError.code === 'PGRST116') return null; // Not found
        throw orderError;
      }
      
      // Transform the data to match our interface
      return {
        ...order,
        items: order.order_items || []
      };
    } catch (error) {
      throw error;
    }
  }

  async create(order: Order): Promise<number> {
    try {
      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: order.user_id,
          status: order.status || 'pending',
          total_amount: order.total_amount
        })
        .select('id')
        .single();
      
      if (orderError) throw orderError;
      
      const orderId = orderData.id;
      
      // Insert order items if any
      if (order.items && order.items.length > 0) {
        const orderItems = order.items.map(item => ({
          order_id: orderId,
          trip_id: item.trip_id,
          amount: item.amount
        }));
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
        
        if (itemsError) throw itemsError;
      }
      
      return orderId;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, order: Partial<Order>): Promise<boolean> {
    try {
      // Update order fields
      const fieldsToUpdate = {...order};
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.created_at;
      delete fieldsToUpdate.updated_at;
      delete fieldsToUpdate.items;
      
      // Only update if there are fields to update
      const fields = Object.keys(fieldsToUpdate);
      if (fields.length > 0) {
        const { error: orderError } = await supabase
          .from('orders')
          .update(fieldsToUpdate)
          .eq('id', id);
        
        if (orderError) throw orderError;
      }
      
      // Update order items if provided
      if (order.items) {
        // Delete existing order items
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', id);
        
        if (deleteError) throw deleteError;
        
        // Insert new order items if any
        if (order.items.length > 0) {
          const orderItems = order.items.map(item => ({
            order_id: id,
            trip_id: item.trip_id,
            amount: item.amount
          }));
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
          
          if (itemsError) throw itemsError;
        }
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      // Delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);
      
      if (itemsError) throw itemsError;
      
      // Check if there's an invoice for this order
      const { data: invoices, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', id);
      
      if (invoiceCheckError) throw invoiceCheckError;
      
      // Delete invoice if exists
      if (invoices && invoices.length > 0) {
        const { error: invoiceDeleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('order_id', id);
        
        if (invoiceDeleteError) throw invoiceDeleteError;
      }
      
      // Delete order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (orderError) throw orderError;
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new OrderModel();
