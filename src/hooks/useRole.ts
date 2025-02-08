import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRole() {
  const [role, setRole] = useState<string | null>(() => {
    // Initialize from cache if available
    const cached = localStorage.getItem('user_role');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setRole(null);
            localStorage.removeItem('user_role');
          }
          return;
        }

        const role = user.user_metadata?.role;
        
        if (mounted) {
          setRole(role || null);
          // Cache the role
          localStorage.setItem('user_role', JSON.stringify(role || null));
        }
      } catch (error) {
        console.error('Error checking role:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkRole, 1000 * retryCount); // Exponential backoff
        } else {
          if (mounted) {
            setRole(null);
            localStorage.removeItem('user_role');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setRole(null);
        localStorage.removeItem('user_role');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkRole();
      }
    });

    checkRole();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { 
    role, 
    loading, 
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isSeller: role === 'seller',
    isDriver: role === 'driver',
    isWarehouse: role === 'warehouse'
  };
}