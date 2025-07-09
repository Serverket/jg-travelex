import { Request, Response } from 'express';
import InvoiceModel, { Invoice } from '../models/invoices';
import OrderModel from '../models/orders';

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await InvoiceModel.findAll();
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await InvoiceModel.findById(id);
    
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceByOrderId = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId);
    const invoice = await InvoiceModel.findByOrderId(orderId);
    
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found for this order' });
      return;
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error getting invoice by order ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInvoiceByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await InvoiceModel.findByInvoiceNumber(invoiceNumber);
    
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Error getting invoice by number:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { order_id, issue_date, due_date, status } = req.body;
    
    // Basic validation
    if (!order_id) {
      res.status(400).json({ message: 'Order ID is required' });
      return;
    }
    
    const orderId = parseInt(order_id);
    
    // Check if order exists
    const order = await OrderModel.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    // Check if invoice already exists for this order
    const existingInvoice = await InvoiceModel.findByOrderId(orderId);
    if (existingInvoice) {
      res.status(400).json({ message: 'Invoice already exists for this order' });
      return;
    }
    
    // Generate invoice number
    const invoiceNumber = await InvoiceModel.generateInvoiceNumber();
    
    // Set issue date and due date
    const currentDate = new Date();
    const parsedIssueDate = issue_date ? new Date(issue_date) : currentDate;
    
    // Default due date is 30 days from issue date if not provided
    let parsedDueDate;
    if (due_date) {
      parsedDueDate = new Date(due_date);
    } else {
      parsedDueDate = new Date(parsedIssueDate);
      parsedDueDate.setDate(parsedDueDate.getDate() + 30);
    }
    
    // Create invoice
    const invoiceId = await InvoiceModel.create({
      order_id: orderId,
      invoice_number: invoiceNumber,
      issue_date: parsedIssueDate,
      due_date: parsedDueDate,
      status: status as 'pending' | 'paid' | 'overdue' || 'pending'
    });
    
    res.status(201).json({
      message: 'Invoice created successfully',
      invoiceId,
      invoiceNumber
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { issue_date, due_date, status } = req.body;
    
    // Check if invoice exists
    const existingInvoice = await InvoiceModel.findById(id);
    if (!existingInvoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    
    // Build update data
    const updateData: Partial<Invoice> = {};
    
    if (issue_date !== undefined) {
      const parsedDate = new Date(issue_date);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ message: 'Invalid issue date format' });
        return;
      }
      updateData.issue_date = parsedDate;
    }
    
    if (due_date !== undefined) {
      const parsedDate = new Date(due_date);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ message: 'Invalid due date format' });
        return;
      }
      updateData.due_date = parsedDate;
    }
    
    if (status !== undefined) {
      if (!['pending', 'paid', 'overdue'].includes(status)) {
        res.status(400).json({ message: 'Status must be pending, paid, or overdue' });
        return;
      }
      updateData.status = status as 'pending' | 'paid' | 'overdue';
    }
    
    // Update invoice if there are fields to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'No valid fields to update' });
      return;
    }
    
    const success = await InvoiceModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update invoice' });
      return;
    }
    
    res.status(200).json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if invoice exists
    const existingInvoice = await InvoiceModel.findById(id);
    if (!existingInvoice) {
      res.status(404).json({ message: 'Invoice not found' });
      return;
    }
    
    // Delete invoice
    const success = await InvoiceModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete invoice' });
      return;
    }
    
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
