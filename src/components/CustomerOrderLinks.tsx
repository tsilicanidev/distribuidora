import React, { useState, useEffect } from 'react';
import { Plus, Search, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import jwtDecode from 'jwt-decode';
import { useRouter } from 'next/router';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

interface Customer {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface Order {
  id: string;
  customer_id: string;
  token: string;
  status: string;
  expires_at: string | null;
}

export function CustomerOrderLinks() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data, error } = await supabase.from('customers').select('id, razao_social, cpf_cnpj');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      setError('Erro ao carregar clientes.');
    }
  }

  async function generateOrderToken() {
    if (!selectedCustomer || !expirationDate) {
      setError('Selecione um cliente e a data de expiração.');
      return;
    }

    try {
      // Criar um pedido antes de gerar o token
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([
        {
          customer_id: selectedCustomer,
          status: 'pending',
          expires_at: expirationDate,
        }
      ]).select('id').single();

      if (orderError || !orderData) throw orderError;

      // Gerar token para o pedido específico
      const { data, error } = await supabase.functions.invoke('generate-order-token', {
        body: { order_id: orderData.id, expires_at: expirationDate },
      });

      if (error || !data?.token) throw error;
      setGeneratedToken(data.token);

      // Atualizar o pedido com o token gerado
      await supabase.from('orders').update({ token: data.token }).eq('id', orderData.id);
    } catch (error) {
      setError('Erro ao gerar token no Supabase.');
    }
  }

  async function validateToken() {
    if (!token) {
      setError('Token ausente.');
      return;
    }

    try {
      const decoded = jwtDecode<{ order_id: string }>(token);
      if (!decoded.order_id) {
        throw new Error('Token inválido.');
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        throw new Error('Pedido não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setError(error.message);
    }
  }

  useEffect(() => {
    validateToken();
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Links para Pedidos de Clientes</h1>
      <select onChange={(e) => setSelectedCustomer(e.target.value)}>
        <option value="">Selecione um cliente</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>{customer.razao_social}</option>
        ))}
      </select>
      <input
        type="date"
        value={expirationDate}
        onChange={(e) => setExpirationDate(e.target.value)}
        className="ml-2 px-4 py-2 border rounded"
      />
      <button onClick={generateOrderToken} className="ml-2 px-4 py-2 bg-green-600 text-white rounded">Gerar Link</button>
      {generatedToken && (
        <div className="mt-4">
          <p>Token Gerado:</p>
          <div className="flex items-center">
            <span className="text-sm font-mono text-gray-900">{generatedToken}</span>
            <button onClick={() => { navigator.clipboard.writeText(generatedToken); setCopiedToken(generatedToken); setTimeout(() => setCopiedToken(null), 2000); }} className="ml-2">
              {copiedToken === generatedToken ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-sm mt-2">URL completa: {window.location.origin}/order/{generatedToken}</p>
        </div>
      )}
      {error && <p className="text-red-500">Erro: {error}</p>}
    </div>
  );
}

export default CustomerOrderLinks;