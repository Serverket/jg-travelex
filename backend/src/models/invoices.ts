import supabase from '../config/db';

export interface Invoice {
  id?: number;
  order_id: number;
  invoice_number: string;
  issue_date: Date | string;
  due_date: Date | string;
  status?: 'pending' | 'paid' | 'overdue';
  created_at?: Date;
  updated_at?: Date;
}

class InvoiceModel {
  async findAll(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('issue_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }
  
  async findByOrderId(orderId: number): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async create(invoice: Invoice): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          order_id: invoice.order_id,
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: invoice.status || 'pending'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, invoice: Partial<Invoice>): Promise<boolean> {
    try {
      // Update invoice fields
      const fieldsToUpdate = {...invoice};
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.created_at;
      delete fieldsToUpdate.updated_at;
      
      // Only update if there are fields to update
      const fields = Object.keys(fieldsToUpdate);
      if (fields.length > 0) {
        const { error } = await supabase
          .from('invoices')
          .update(fieldsToUpdate)
          .eq('id', id);
        
        if (error) throw error;
        return true;
      }
      
      return false;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  async generateInvoiceNumber(): Promise<string> {
    try {
      // Get the current date
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Get count of invoices this month to generate sequential number
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `INV-${year}${month}-%`);
      
      if (error) throw error;
      
      const invoiceCount = (count || 0) + 1;
      const sequentialNumber = String(invoiceCount).padStart(4, '0');
      
      return `INV-${year}${month}-${sequentialNumber}`;
    } catch (error) {
      throw error;
    }
  }
}

export default new InvoiceModel();
