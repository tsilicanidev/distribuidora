import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Minus, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { validateToken } from '../utils/token';
import { logError } from '../utils/errorLogging';

export function CustomerOrder() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => {
    validateTokenAndFetchData();
  }, [token]);

  async function validateTokenAndFetchData() {
    if (!token) {
      setError('Token inválido ou não fornecido');
      setLoading(false);
      return;
    }

    try {
      const validation = await validateToken(token);
      if (!validation.valid || !validation.orderLink) {
        throw new Error(validation.error || 'Token inválido');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      await logError(err, { token, action: 'validateTokenAndFetchData' });
      setError("O token fornecido é inválido. Por favor, entre em contato com o suporte.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    try {
      const validation = await validateToken(token);
      if (!validation.valid || !validation.orderLink) {
        throw new Error(validation.error || 'Token inválido');
      }
      
      setOrderComplete(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      await logError(err, { action: 'createOrder', token });
      setError(err.message);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Enviado!</h2>
            <p className="text-gray-600">Seu pedido foi recebido com sucesso e será processado em breve.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <button
            type="submit"
            className="flex items-center px-6 py-3 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
          >
            <Save className="h-5 w-5 mr-2" />
            Enviar Pedido
          </button>
        </form>
      </div>
    </div>
  );
}
