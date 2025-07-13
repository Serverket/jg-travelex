// Database cleanup script to remove invoices, orders, and trips
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'r00tr00t',
  database: process.env.DB_NAME || 'travelex',
};

async function cleanupDatabase() {
  console.log('Starting database cleanup...');
  
  // Create a connection to the database
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Disable foreign key checks to avoid constraint issues during deletion
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Delete all invoices
    console.log('Deleting all invoices...');
    const [invoiceResult] = await connection.query('DELETE FROM invoices;');
    console.log(`Deleted ${invoiceResult.affectedRows} invoices`);
    
    // Delete all orders
    console.log('Deleting all orders...');
    const [orderResult] = await connection.query('DELETE FROM orders;');
    console.log(`Deleted ${orderResult.affectedRows} orders`);
    
    // Delete all trips
    console.log('Deleting all trips...');
    const [tripResult] = await connection.query('DELETE FROM trips;');
    console.log(`Deleted ${tripResult.affectedRows} trips`);
    
    // Delete all surcharges for trips
    console.log('Deleting all trip surcharges...');
    const [surchargeResult] = await connection.query('DELETE FROM trip_surcharges;');
    console.log(`Deleted ${surchargeResult.affectedRows} trip surcharges`);
    
    // Delete all discounts for trips
    console.log('Deleting all trip discounts...');
    const [discountResult] = await connection.query('DELETE FROM trip_discounts;');
    console.log(`Deleted ${discountResult.affectedRows} trip discounts`);
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    // Close the database connection
    await connection.end();
  }
}

// Run the cleanup function
cleanupDatabase();
