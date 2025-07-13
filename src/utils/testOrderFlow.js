/**
 * Test utility for verifying order creation flow
 * This creates a test trip and order for debugging purposes
 */
import { tripService } from '../services/tripService';
import { orderService } from '../services/orderService';
import { invoiceService } from '../services/invoiceService';

/**
 * Create a test trip, order, and invoice for a user
 * @param {number} userId - User ID to create test data for
 * @returns {Promise<Object>} Created data objects
 */
export const createTestOrderFlow = async (userId) => {
  try {
    console.log('Starting test order flow for user:', userId);
    
    // Step 1: Create a test trip
    const tripData = {
      user_id: userId,
      origin: 'Test Origin',
      destination: 'Test Destination',
      distance: 100,
      duration: 60,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      price: 150.0,
      activeSurcharges: [1, 2] // Test with simple numeric IDs
    };
    
    console.log('Creating test trip with data:', tripData);
    const tripResponse = await tripService.createTrip(tripData);
    console.log('Trip created successfully:', tripResponse);
    
    // Step 2: Create an order using the trip
    const orderData = {
      user_id: userId,
      trip_id: tripResponse.tripId,
      status: 'pending',
      total: tripData.price
    };
    
    console.log('Creating test order with data:', orderData);
    const orderResponse = await orderService.createOrder(orderData);
    console.log('Order created successfully:', orderResponse);
    
    // Step 3: Create an invoice for the order
    const invoiceData = {
      order_id: orderResponse.orderId,
      amount: orderData.total,
      status: 'pending'
    };
    
    console.log('Creating test invoice with data:', invoiceData);
    const invoiceResponse = await invoiceService.createInvoice(invoiceData);
    console.log('Invoice created successfully:', invoiceResponse);
    
    // Step 4: Verify we can retrieve the order
    const userOrders = await orderService.getOrdersByUserId(userId);
    console.log('Retrieved user orders:', userOrders);
    
    // Step 5: Verify we can retrieve all invoices
    const allInvoices = await invoiceService.getAllInvoices();
    console.log('Retrieved all invoices:', allInvoices);
    
    return {
      trip: tripResponse,
      order: orderResponse,
      invoice: invoiceResponse,
      userOrders,
      allInvoices
    };
  } catch (error) {
    console.error('Error in test order flow:', error);
    throw error;
  }
};

/**
 * Verify that orders and invoices exist for a user
 * @param {number} userId - User ID to check orders for
 * @returns {Promise<Object>} Retrieved data objects
 */
export const verifyUserOrdersAndInvoices = async (userId) => {
  try {
    console.log('Verifying orders and invoices for user:', userId);
    
    // Get user orders
    const userOrders = await orderService.getOrdersByUserId(userId);
    console.log('User orders:', userOrders);
    
    // Get all invoices
    const allInvoices = await invoiceService.getAllInvoices();
    
    // Filter invoices for this user's orders
    const orderIds = userOrders.map(order => order.id);
    const userInvoices = allInvoices.filter(invoice => orderIds.includes(invoice.order_id));
    
    console.log('User invoices:', userInvoices);
    
    return {
      userOrders,
      userInvoices
    };
  } catch (error) {
    console.error('Error verifying user orders and invoices:', error);
    throw error;
  }
};
