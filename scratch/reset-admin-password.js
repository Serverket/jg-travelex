import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function resetPassword() {
  const email = 'admin@jg-travelex.com'
  const newPassword = 'admin123'
  
  console.log(`Searching for user with email ${email}...`)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }
  
  const user = users.find(u => u.email === email)
  if (!user) {
    console.error(`User ${email} not found.`)
    return
  }
  
  console.log(`Updating password for user ${user.id}...`)
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )
  
  if (error) {
    console.error('Error resetting password:', error)
  } else {
    console.log('Password updated successfully for:', data.user.email)
  }
}

resetPassword()
