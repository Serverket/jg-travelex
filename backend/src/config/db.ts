import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://puasatxwnzgvjftcxsef.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YXNhdHh3bnpndmpmdGN4c2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNzU5OTUsImV4cCI6MjA3MTc1MTk5NX0.5e0-J-Xbw_Uow0sEZ19GpHHlMC2lmnQx1oMTDsUNhSc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('settings').select('id').limit(1);
    if (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }
    console.log('Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};

// Export supabase client for use in other files
export default supabase;
