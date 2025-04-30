import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tyvjzziletqckzmnnqya.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmp6emlsZXRxY2t6bW5ucXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDI0MjcsImV4cCI6MjA2MTU3ODQyN30.LRsg5bigOUwsgt6lpOPcRxRJVi067Ea1ihr0sSMvbcM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase.from('user_profiles').select('count')
    console.log('Connection test result:', { data, error })

    console.log('\n2. Testing RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    console.log('RLS test result:', { policies, policiesError })

    console.log('\n3. Testing table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(0)
    console.log('Table structure:', tableInfo)

  } catch (err) {
    console.error('Test failed:', err)
  }
}

testConnection() 