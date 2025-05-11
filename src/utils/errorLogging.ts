import { supabase } from '../lib/supabase';

interface ErrorLog {
  error_type: string;
  message: string;
  stack?: string;
  context?: any;
  user_id?: string;
  customer_id?: string;
  created_at?: string;
}

export async function logError(error: Error, context?: any) {
  try {
    const errorLog: ErrorLog = {
      error_type: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      context: typeof context === 'object' ? JSON.stringify(context, null, 2) : context,
      created_at: new Date().toISOString()
    };

    // Try to get customer ID from context
    if (context?.customer_id) {
      errorLog.customer_id = context.customer_id;
    }

    // Log to console first
    console.error('Error logged:', errorLog);

    // Log to database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert([errorLog]);

    if (dbError) {
      console.error('Failed to log error to database:', dbError);
      // Store in localStorage as backup
      const storedLogs = localStorage.getItem('error_logs');
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      logs.push(errorLog);
      localStorage.setItem('error_logs', JSON.stringify(logs.slice(-100))); // Keep last 100 errors
    }
  } catch (loggingError) {
    console.error('Error in error logging:', loggingError);
  }
}