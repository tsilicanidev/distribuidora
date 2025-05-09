import React, { useState, useEffect } from 'react';
import { Plus, Search, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createOrderLink } from '../utils/token';

interface Customer {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface OrderLink {
  id: string;
  customer_id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  customer: Customer;
}

export default function CustomerOrderLinks() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderLinks, setOrderLinks] = useState<OrderLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // First check if user has permission
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

     if (!profile || (profile.role !== 'admin' && profile.role !== 'manager' && profile.role !== 'master')) {
        throw new Error('Permissão negada');
      }

      // Fetch customers and order links in parallel
      const [customersResponse, linksResponse] = await Promise.all([
        supabase
          .from('customers')
          .select('id, razao_social, cpf_cnpj')
          .order('razao_social'),
        supabase
          .from('customer_order_links')
          .select(`
            *,
            customer:customers (
              id,
              razao_social,
              cpf_cnpj
            )
          `)
          .order('created_at', { ascending: false })
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (linksResponse.error) throw linksResponse.error;

      setCustomers(customersResponse.data || []);
      setOrderLinks(linksResponse.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateLink = async () => {
    if (!selectedCustomer) {
      setError('Selecione um cliente');
      return;
    }

    try {
      const result = await createOrderLink(selectedCustomer, expirationDate);

      if (!result.success || !result.token || !result.orderLink) {
        throw new Error(result.error || 'Erro ao gerar link');
      }

      setGeneratedToken(result.token);
      setOrderLinks([result.orderLink, ...orderLinks]);
      setError(null);
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      setError('Erro ao gerar link. Por favor, tente novamente.');
    }
  };

  const removeLink = async (link: OrderLink) => {
    if (!confirm('Tem certeza que deseja remover este link? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('customer_order_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;

      setOrderLinks(orderLinks.filter(l => l.id !== link.id));
    } catch (error) {
      console.error('Error removing link:', error);
      setError('Erro ao remover link. Por favor, tente novamente.');
    }
  };

  const copyToClipboard = async (token: string) => {
    try {
      const orderUrl = `${window.location.origin}/order/${token}`;
      await navigator.clipboard.writeText(orderUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Erro ao copiar link. Por favor, tente novamente.');
    }
  };

  const filteredLinks = orderLinks.filter(link =>
    link.customer.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.customer.cpf_cnpj.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Links para Pedidos de Clientes</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente *
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
              required
            >
              <option value="">Selecione um cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.razao_social} ({customer.cpf_cnpj})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Expiração *
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateLink}
              className="w-full flex items-center justify-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
            >
              <Plus className="h-5 w-5 mr-2" />
              Gerar Link
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-500 rounded">
            {error}
          </div>
        )}

        {generatedToken && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-medium text-green-900 mb-2">Link Gerado com Sucesso!</h3>
            <div className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
              <code className="text-sm font-mono text-gray-900">
                {`${window.location.origin}/order/${generatedToken}`}
              </code>
              <button
                onClick={() => copyToClipboard(generatedToken)}
                className="ml-2 text-green-600 hover:text-green-700"
                title="Copiar Link"
              >
                {copiedToken === generatedToken ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-[#FF8A00] focus:border-[#FF8A00]"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expira em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Nenhum link encontrado.
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {link.customer.razao_social}
                    </div>
                    <div className="text-sm text-gray-500">
                      {link.customer.cpf_cnpj}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-500">
                        {link.token}
                      </code>
                      <button
                        onClick={() => copyToClipboard(link.token)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copiar Link"
                      >
                        {copiedToken === link.token ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      link.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {link.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Sem expiração'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(link.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => removeLink(link)}
                      className="text-red-600 hover:text-red-900"
                      title="Remover Link"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}