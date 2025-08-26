import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

// Use service role key for backend operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
