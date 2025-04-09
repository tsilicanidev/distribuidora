import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { isAdminOrMaster, hasAdminPermissions } from '../lib/supabase';

interface UserMetadata {
  full_name: string;
  role: string;
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

  const isUserAdminOrMaster = user?.email ? isAdminOrMaster(user.email) : false;
  const isAdminRole = metadata?.role === 'admin';
  const hasPermissions = user?.email ? hasAdminPermissions(user.email, metadata?.role || '') : false;

  return { 
    user,
    metadata,
    loading,
    isMaster: isUserAdminOrMaster,
    isAdmin: isAdminRole || hasPermissions,
    isManager: metadata?.role === 'manager',
    isSeller: metadata?.role === 'seller',
    isWarehouse: metadata?.role === 'warehouse'
  };
}