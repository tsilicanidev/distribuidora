import React, { useState, useEffect } from 'react';
import { Plus, Search, Copy, Link2, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
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

export function CustomerOrderLinks() {
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

      if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
        throw new Error('Permissão negada');
      }

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

  const generateOrderLink = async () => {
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
      // Delete the link
      const { error } = await supabase
        .from('customer_order_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;

      // Remove from state
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
        <button
          onClick={() => {
            setSelectedCustomer('');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setExpirationDate(tomorrow.toISOString().split('T')[0]);
            setGeneratedToken(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Gerar Novo Link
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
          {error}
        </div>
      )}

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
                Token
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
            {filteredLinks.map((link) => (
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
                    <Link2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-mono text-gray-500">
                      {link.token}
                    </span>
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
                    onClick={() => copyToClipboard(link.token)}
                    className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                    title="Copiar Link"
                  >
                    {copiedToken === link.token ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => removeLink(link)}
                    className="text-red-600 hover:text-red-900"
                    title="Remover Link"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Gerar Link para Cliente
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cliente *
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    if (e.target.value) {
                      generateOrderLink();
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
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
                <label className="block text-sm font-medium text-gray-700">
                  Data de Expiração *
                </label>
                <input
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => {
                    setExpirationDate(e.target.value);
                    if (selectedCustomer) {
                      generateOrderLink();
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              {generatedToken && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Gerado
                  </label>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-300">
                    <code className="text-sm font-mono text-gray-900">{generatedToken}</code>
                    <button
                      onClick={() => copyToClipboard(generatedToken)}
                      className="ml-2 text-[#FF8A00] hover:text-[#FF8A00]/80"
                      title="Copiar Link"
                    >
                      {copiedToken === generatedToken ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    URL completa: {window.location.origin}/order/{generatedToken}
                  </p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerOrderLinks;