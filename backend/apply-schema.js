import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://puasatxwnzgvjftcxsef.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YXNhdHh3bnpndmpmdGN4c2VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE3NTk5NSwiZXhwIjoyMDcxNzUxOTk1fQ.TJNvM9MKfHhsJTwy80gWsa0lbCVg0fDRi-qXB9oKbMc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySchema() {
  try {
    console.log('Reading schema file...');
    const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');
    
    console.log('Applying schema to Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('Error applying schema:', error);
      return;
    }
    
    console.log('✅ Schema applied successfully!');
    console.log('✅ Admin user created:');
    console.log('   Username: jgam');
    console.log('   Password: jgampro777');
    console.log('   Role: admin');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

applySchema();
