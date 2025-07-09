import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoiceController';

const router = express.Router();

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice by invoice number
router.get('/number/:invoiceNumber', getInvoiceByNumber);

// GET invoice by order ID
router.get('/order/:orderId', getInvoiceByOrderId);

// GET single invoice by ID
router.get('/:id', getInvoiceById);

// POST create invoice
router.post('/', createInvoice);

// PUT update invoice
router.put('/:id', updateInvoice);

// DELETE invoice
router.delete('/:id', deleteInvoice);

export default router;
