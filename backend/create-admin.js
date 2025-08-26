import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://puasatxwnzgvjftcxsef.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YXNhdHh3bnpndmpmdGN4c2VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE3NTk5NSwiZXhwIjoyMDcxNzUxOTk1fQ.TJNvM9MKfHhsJTwy80gWsa0lbCVg0fDRi-qXB9oKbMc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Hash password with SHA256 (matching the backend logic)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = hashPassword('jgampro777');
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: 'jgam',
        password: hashedPassword,
        name: 'JG Admin',
        email: 'admin@jgtravelex.com',
        role: 'admin'
      })
      .select();
    
    if (error) {
      console.error('Error creating admin user:', error);
      return;
    }
    
    console.log('✅ Admin user created successfully!');
    console.log('Credentials:');
    console.log('  Username: jgam');
    console.log('  Password: jgampro777');
    console.log('  Role: admin');
    console.log('  Email: admin@jgtravelex.com');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createAdminUser();
