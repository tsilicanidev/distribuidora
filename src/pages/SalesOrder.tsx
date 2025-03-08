import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
    cpf_cnpj: string;
  };
  total_amount: number;
  status: string;
  created_at: string;
}

export function SalesOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(razao_social, cpf_cnpj)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'approved' })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
      setError('Erro ao aprovar pedido');
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'rejected' })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      setError('Erro ao rejeitar pedido');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.cpf_cnpj.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos de Venda</h1>
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
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-[#FF8A00] focus:border-[#FF8A00]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número/Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.customer.razao_social}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.customer.cpf_cnpj}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      title="Visualizar"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(order.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Aprovar"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(order.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Rejeitar"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {order.status === 'pending' && (
                      <button
                        className="text-yellow-600 hover:text-yellow-900 ml-3"
                        title="Aguardando Aprovação"
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SalesOrder;