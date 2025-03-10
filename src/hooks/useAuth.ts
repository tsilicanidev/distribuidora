import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface UserMetadata {
  full_name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [metadata, setMetadata] = useState<UserMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          setMetadata(session.user.user_metadata as UserMetadata);
        }
      } catch (error) {
        console.error('Erro ao obter sessão:', error);
        setUser(null);
        setMetadata(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Atualiza quando a autenticação muda
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setMetadata(session.user.user_metadata as UserMetadata);
        } else {
          setMetadata(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Obtém a role do usuário autenticado
  const role = metadata?.role || 'seller'; // Se não houver role, assume "seller"

  return { 
    user,
    metadata,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isMaster: role === 'master',
    isSeller: role === 'seller'
  };
}
