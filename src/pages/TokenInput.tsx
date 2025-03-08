import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidTokenFormat, validateToken } from '../utils/token';

export function TokenInput() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!token.trim()) {
        throw new Error('Por favor, insira o token');
      }

      if (!isValidTokenFormat(token.trim())) {
        throw new Error('Token inválido');
      }

      // Validate token
      const validation = await validateToken(token.trim());
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Token is valid, redirect to order page
      navigate(`/order/${token.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Portal de Pedidos
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Insira o token fornecido para acessar seus pedidos
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Token de Acesso
            </label>
            <div className="mt-1">
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                placeholder="Digite seu token"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FF8A00] hover:bg-[#FF8A00]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8A00] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validando...
                </div>
              ) : (
                'Acessar Pedidos'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TokenInput;