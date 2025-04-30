import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = 'https://tyvjzziletqckzmnnqya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmp6emlsZXRxY2t6bW5ucXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMDI0MjcsImV4cCI6MjA2MTU3ODQyN30.LRsg5bigOUwsgt6lpOPcRxRJVi067Ea1ihr0sSMvbcM';

// Add validation for Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

export async function GET() {
  try {
    console.log('Testing connection to Supabase...');
    console.log('Supabase URL:', supabaseUrl);
    
    // First, let's try a simple auth check
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth check result:', { authData, authError });

    if (authError) {
      console.error('Auth check failed:', authError);
      return NextResponse.json(
        { 
          error: 'Auth check failed', 
          details: {
            message: authError.message || 'Unknown error',
            code: authError.code || 'UNKNOWN',
            hint: authError.hint || 'Check your Supabase configuration'
          }
        },
        { status: 500 }
      );
    }

    // Test if the table exists by trying to get its structure
    console.log('Testing table existence...');
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('user_profiles')
        .select('id, email, role, created_at, updated_at')
        .limit(0);

      if (tableError) {
        console.error('Table access error:', tableError);
        return NextResponse.json(
          { 
            error: 'Table access failed', 
            details: {
              message: tableError.message || 'Unknown error',
              code: tableError.code || 'UNKNOWN',
              hint: tableError.hint || 'Check if the user_profiles table exists and if you have the correct permissions'
            }
          },
          { status: 500 }
        );
      }

      // If we got here, the table exists and we can access it
      return NextResponse.json({
        success: true,
        message: 'Connection test passed',
        results: {
          connection: 'OK',
          tableAccess: 'OK',
          tableStructure: tableInfo
        }
      });
    } catch (error) {
      console.error('Table test error:', error);
      return NextResponse.json(
        { 
          error: 'Table test failed', 
          details: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error instanceof Error ? error.constructor.name : typeof error
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error occurred', 
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    );
  }
} 