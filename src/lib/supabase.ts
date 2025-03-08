import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
          if (response.status === 401 || response.status === 400) {
            try {
              // Check if we have a session
              const { data: { session } } = await supabase.auth.getSession();
              
              if (!session) {
                // No session, redirect to login
                window.location.href = '/login';
                throw new Error('No session found');
              }

              // Try to refresh the session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !refreshData.session) {
                // Refresh failed, clear session and redirect to login
                await supabase.auth.signOut();
                localStorage.removeItem('sb-auth-token');
                localStorage.removeItem('supabase.auth.token');
                window.location.href = '/login';
                throw new Error('Session refresh failed');
              }

              // Update auth header with new token
              args[1].headers = {
                ...args[1].headers,
                'Authorization': `Bearer ${refreshData.session.access_token}`
              };

              // Retry original request with new token
              attempt++;
              continue;
            } catch (refreshError) {
              console.error('Session refresh failed:', refreshError);
              // Clear session and redirect to login
              await supabase.auth.signOut();
              localStorage.removeItem('sb-auth-token');
              localStorage.removeItem('supabase.auth.token');
              window.location.href = '/login';
              throw refreshError;
            }
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`);
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

// Function to check if user is admin
export const isAdminOrMaster = (email: string) => {
  return email === 'admin@admin.com';
};

// Function to check if user has admin permissions
export const hasAdminPermissions = (email: string, role: string) => {
  return isAdminOrMaster(email) || role === 'admin';
};

// Function to get admin client for user management
export const getAdminClient = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasAdminPermissions(user.email || '', user.user_metadata?.role)) {
    throw new Error('Unauthorized');
  }
  return supabase;
};

// Function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.code === 'PGRST200') {
    return 'Erro de relacionamento no banco de dados. Por favor, tente novamente.';
  }
  if (error?.code === '23503') {
    return 'Erro de referência. Verifique se todos os dados relacionados existem.';
  }
  if (error?.code === '23505') {
    return 'Já existe um registro com este número. Por favor, use outro número.';
  }
  if (error?.code === '23502') {
    return 'Todos os campos obrigatórios devem ser preenchidos.';
  }
  if (error?.message) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
};

// Function to retry failed requests
export const retryRequest = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};

// Initialize auth state
export const initializeAuth = async () => {
  try {
    // Clear any old auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Check for existing session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      // No session, check if we're on a public route
      const publicRoutes = ['/login', '/token', '/order'];
      const isPublicRoute = publicRoutes.some(route => window.location.pathname.startsWith(route));
      
      if (!isPublicRoute) {
        // Not a public route, redirect to login
        window.location.href = '/login';
      }
      return;
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear any auth-related storage
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
        window.location.href = '/login';
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
    await supabase.auth.signOut();
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('supabase.auth.token');
    window.location.href = '/login';
  }
};

// Call initializeAuth when the module loads
initializeAuth();