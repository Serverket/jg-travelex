#!/usr/bin/env node

/**
5:  * Script to update the Supabase database schema by adding columns if they don't exist
6:  */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
config({ path: join(projectRoot, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function updateSchema() {
  console.log('🔄 Updating database schema...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in .env file');
    process.exit(1);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const updateSQL = `
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS default_mpg DECIMAL(10, 2) DEFAULT 35.00;
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS default_fuel_price DECIMAL(10, 2) DEFAULT 4.00;
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS default_stop_interval_hours DECIMAL(10, 2) DEFAULT 4.00;
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS preferred_stop_brands VARCHAR(255) DEFAULT 'Wawa, Racetrack, Circle K';
    `;

    console.log('⚡ Running ALTER TABLE queries...');
    const { error } = await supabase.rpc('exec_sql', { sql: updateSQL });

    if (error) {
      console.error('❌ Error executing SQL:', error.message);
      process.exit(1);
    }

    console.log('✅ Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

updateSchema();
