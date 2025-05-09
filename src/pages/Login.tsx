import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Truck } from 'lucide-react';

export function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Clear any old auth tokens
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-auth-token');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          const from = (location.state as any)?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        await supabase.auth.signOut();
        localStorage.removeItem('sb-auth-token');
        localStorage.removeItem('supabase.auth.token');
      }
    };
    checkAuth();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Clear any old auth tokens
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-auth-token');
      
      // First try to sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      if (signInError) {
        // If this is the admin user and sign in fails, try to create the account
        if (formData.email === 'admin@admin.com') {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: 'Admin',
                role: 'admin'
              }
            }
          });

          if (signUpError) throw signUpError;

          if (signUpData.user) {
            // Try signing in with the newly created account
            const { data: signInData, error: finalSignInError } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            });

            if (finalSignInError) throw finalSignInError;
            if (signInData.user) {
              const from = (location.state as any)?.from?.pathname || '/';
              navigate(from, { replace: true });
              return;
            }
          }
        } else {
          throw signInError;
        }
      }

      if (data.user) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
        return;
      }

      throw new Error('Falha na autenticação');
    } catch (err) {
      console.error('Auth error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login');
        } else {
          setError(err.message);
        }
      } else {
        setError('Erro ao fazer login. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-full mb-4">
            <Truck className="login-logo" />
          </div>
          <h1 className="login-title">J&P</h1>
          <h2 className="login-subtitle">DISTRIBUIDORA DE ALIMENTOS</h2>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="login-label">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="login-input"
              placeholder="Digite seu email"
            />
          </div>

          <div>
            <label className="login-label">
              Senha
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="login-input"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;