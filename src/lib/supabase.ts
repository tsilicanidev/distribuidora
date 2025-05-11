import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with retries and error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'sb-auth-token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'x-client-info': 'food-distribution-system@1.0.0'
    },
    fetch: async (...args) => {
      const maxRetries = 3;
      const baseDelay = 1000;
      let attempt = 0;
      let lastError;

      // Check if this is a public route that doesn't need auth
      const publicRoutes = ['/login', '/token', '/order'];
      const isPublicRoute = publicRoutes.some(route => 
        window.location.pathname.startsWith(route)
      );

      while (attempt < maxRetries) {
        try {
          const response = await fetch(...args);
          
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            attempt++;
            continue;
          }

          // Handle auth errors
          if ((response.status === 401 || response.status === 400) && !isPublicRoute) {
            try {
              // Clear any old tokens first
              localStorage.removeItem('sb-auth-token');
              localStorage.removeItem('supabase.auth.token');
              
              // Get current session
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionError || !session) {
                // No valid session, continue without auth
                return response;
              }

              // Try to refresh the session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !refreshData.session) {
                // Refresh failed, continue without auth
                return response;
              }

              // Update auth header with new token
              const newHeaders = new Headers(args[1].headers);
              newHeaders.set('Authorization', `Bearer ${refreshData.session.access_token}`);
              args[1].headers = newHeaders;

              // Retry original request with new token
              attempt++;
              continue;
            } catch (refreshError) {
              console.error('Session refresh failed:', refreshError);
              // Continue without auth for this request
              return response;
            }
          }

          // For public routes, always allow the request
          if (isPublicRoute) {
            return response;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          attempt++;
        }
      }
      
      throw lastError || new Error('Request failed after retries');
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Create a separate admin client with service role
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Function to check if user is admin
export const isAdminOrMaster = (email: string) => {
  return email === 'admin@admin.com';
};

// Function to check if user has admin permissions
export const hasAdminPermissions = (email: string, role: string) => {
  return isAdminOrMaster(email) || role === 'admin';
};

// Initialize auth state
export const initializeAuth = async () => {
  try {
    // Clear any old auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Check if this is a public route
    const publicRoutes = ['/login', '/token', '/order'];
    const isPublicRoute = publicRoutes.some(route => 
      window.location.pathname.startsWith(route)
    );

    // Only check session for non-public routes
    if (!isPublicRoute) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Clear any stale tokens
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear any auth-related storage
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('Error initializing auth:', error);
    // Clear any potentially invalid auth state
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('supabase.auth.token');
  }
};

// Initialize auth state
initializeAuth();