import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface UserMetadata {
  full_name: string;
  role: string;
  license_number?: string;
  license_category?: string;
  license_expiry?: string;
  driver_status?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [metadata, setMetadata] = useState<UserMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          setMetadata(session.user.user_metadata as UserMetadata);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setMetadata(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setMetadata(session.user.user_metadata as UserMetadata);
      } else {
        setMetadata(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { 
    user,
    metadata,
    loading,
    isAdmin: metadata?.role === 'admin',
    isManager: metadata?.role === 'manager',
    isSeller: metadata?.role === 'seller',
    isDriver: metadata?.role === 'driver',
    isWarehouse: metadata?.role === 'warehouse'
  };
}