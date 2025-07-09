import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM invoices ORDER BY issue_date DESC'
      );
      
      return rows as Invoice[];
    } catch (error) {
      throw error;
    }
  }
  
  async findByOrderId(orderId: number): Promise<Invoice | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM invoices WHERE order_id = ?',
        [orderId]
      );
      
      if (!rows.length) return null;
      
      return rows[0] as Invoice;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Invoice | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM invoices WHERE id = ?',
        [id]
      );
      
      if (!rows.length) return null;
      
      return rows[0] as Invoice;
    } catch (error) {
      throw error;
    }
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM invoices WHERE invoice_number = ?',
        [invoiceNumber]
      );
      
      if (!rows.length) return null;
      
      return rows[0] as Invoice;
    } catch (error) {
      throw error;
    }
  }

  async create(invoice: Invoice): Promise<number> {
    try {
      // Insert invoice
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO invoices (order_id, invoice_number, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [
          invoice.order_id,
          invoice.invoice_number,
          invoice.issue_date,
          invoice.due_date,
          invoice.status || 'pending'
        ]
      );
      
      return result.insertId;
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
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => (fieldsToUpdate as any)[field]);
        
        const [result] = await pool.query<ResultSetHeader>(
          `UPDATE invoices SET ${setClause} WHERE id = ?`,
          [...values, id]
        );
        
        return result.affectedRows > 0;
      }
      
      return false;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      // Delete invoice
      const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM invoices WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
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
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?",
        [`INV-${year}${month}-%`]
      );
      
      const count = rows[0].count + 1;
      const sequentialNumber = String(count).padStart(4, '0');
      
      return `INV-${year}${month}-${sequentialNumber}`;
    } catch (error) {
      throw error;
    }
  }
}

export default new InvoiceModel();
