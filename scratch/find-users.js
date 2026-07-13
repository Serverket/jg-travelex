import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function findUsers() {
  const { data, error } = await supabase.from('profiles').select('*').limit(5)
  if (error) {
    console.error('Error fetching users:', error)
  } else {
    console.log('Users found:', data)
  }
}

findUsers()
