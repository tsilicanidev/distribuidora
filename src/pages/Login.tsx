import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Truck } from 'lucide-react';

function Login() {
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const from = (location.state as any)?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        await supabase.auth.signOut();
      }
    };
    checkAuth();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Email ou senha inválidos');
        }
        throw signInError;
      }

      if (data?.user) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        throw new Error('Erro ao fazer login');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#2d3333] to-[#797a7d] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-[#2e3136] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.3)] animate-[fadeIn_1s_ease-in] backdrop-blur-sm border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-full mb-4">
            <Truck className="h-12 w-12 text-[#ff8806] animate-bounce" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 animate-[glowPulse_2s_ease-in-out_infinite]">
            J&P
          </h1>
          <h2 className="text-2xl font-bold text-[#ff8806] text-center mb-8">
            DISTRIBUIDORA DE ALIMENTOS
          </h2>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#eff0f4]">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-[#eff0f4]/10 border-0 border-b-2 border-gray-400/20 text-[#eff0f4] focus:outline-none focus:ring-0 focus:border-[#ff8806] hover:border-[#ff8806]/50 transition-all duration-200 rounded-none placeholder-gray-400/50"
              placeholder="Digite seu email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#eff0f4]">
              Senha
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-[#eff0f4]/10 border-0 border-b-2 border-gray-400/20 text-[#eff0f4] focus:outline-none focus:ring-0 focus:border-[#ff8806] hover:border-[#ff8806]/50 transition-all duration-200 rounded-none placeholder-gray-400/50"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-[#ff8806] text-[#eff0f4] rounded-lg font-medium hover:bg-[#d76e04] transition-all duration-200 disabled:opacity-50 transform hover:scale-105 active:scale-95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff8806] focus:ring-offset-2"
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

export { Login }