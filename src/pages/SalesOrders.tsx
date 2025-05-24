import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save, AlertTriangle, CheckCircle2, XCircle, Ban, Edit, Search, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SalesOrderModal } from '../components/SalesOrderModal';
import { useRole } from '../hooks/useRole';
import { processarEmissaoNFe } from '../lib/nfe/emitirNfe';


interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
  };
  total_amount: number;
  created_at: string;
}

interface OrderItem {
  id: string;
  product: {
    name: string;
    unit?: string;
    box_weight?: number;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  weight?: number;
}

interface SalesOrder {
  id: string;
  number: string;
  customer: {
    razao_social: string;
    id: string;
    cpf_cnpj: string;
    ie: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  seller: {
    full_name: string | null;
    commission_rate?: number | null;
  } | null;
  status: string;
  total_amount: number;
  commission_amount: number;
  created_at: string;
  items?: OrderItem[];
  notes?: string;
  payment_method?: string;
  due_date?: string;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
}

// Helper functions for status colors and text
const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
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
    case 'draft':
      return 'Rascunho';
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

// Função para obter texto do método de pagamento
function getPaymentMethodText(method: string): string {
  const methods: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'boleto': 'Boleto Bancário',
    'transferencia': 'Transferência Bancária',
    'cheque': 'Cheque',
    'prazo': 'A Prazo'
  };
  
  return methods[method] || method;
}

function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      fetchOrderItems();
    }
  }, [isOpen, order]);

  async function fetchOrderItems() {
    if (!order) return;
    setLoading(true);

    try {
      // Fix the query to specify which foreign key to use
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          weight,
          product:products!sales_order_items_product_id_fkey(name, unit, box_weight)
        `)
        .eq('sales_order_id', order.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens do pedido:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !order) return null;

  // Calculate total weight
  const calculateTotalWeight = (item: OrderItem): number => {
    if (item.weight) return item.weight;
    
    if (item.product.unit === 'CX' && item.product.box_weight) {
      return item.quantity * item.product.box_weight;
    }
    
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-[#FF8A00] mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Detalhes do Pedido #{order.number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do Pedido</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Número</p>
                <p className="text-base text-gray-900">{order.number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data</p>
                <p className="text-base text-gray-900">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Vendedor</p>
                <p className="text-base text-gray-900">{order.seller?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Comissão</p>
                <p className="text-base text-gray-900">
                  {order.commission_amount.toFixed(2)} ({order.seller?.commission_rate || 5}%)
                </p>
              </div>
              {order.payment_method && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Forma de Pagamento</p>
                  <p className="text-base text-gray-900">
                    {getPaymentMethodText(order.payment_method)}
                  </p>
                </div>
              )}
              {order.due_date && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Data de Vencimento</p>
                  <p className="text-base text-gray-900">
                    {new Date(order.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Cliente</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Razão Social</p>
                <p className="text-base text-gray-900">{order.customer.razao_social}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">CPF/CNPJ</p>
                <p className="text-base text-gray-900">{order.customer.cpf_cnpj}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p className="text-base text-gray-900">
                  {order.customer.endereco}, {order.customer.bairro}, {order.customer.cidade} - {order.customer.estado}
                </p>
              </div>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Itens do Pedido</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8A00]"></div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Peso/Caixa</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Peso Total</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => {
                    const boxWeight = item.product.box_weight || 0;
                    const totalWeight = calculateTotalWeight(item);
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {item.quantity} {item.product.unit || 'UN'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {boxWeight > 0 ? `${boxWeight.toFixed(2)} kg` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          R$ {item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          R$ {item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={5} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Total:</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      R$ {order.total_amount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Comissão:</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      R$ {order.commission_amount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Observações */}
          {order.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Observações</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { isManager, isAdmin } = useRole();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers!sales_orders_customer_id_fkey(*),
          seller:profiles(
            full_name,
            commission_rate
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error: orderError } = await query;

      if (orderError) throw orderError;
      
      // Format order numbers to be sequential
      const formattedOrders = data?.map((order, index) => {
        return {
          ...order,
          displayNumber: (data.length - index).toString() // Simple sequential numbering
        };
      }) || [];
      
      setOrders(formattedOrders);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }

  const handleApproveOrder = async (order: SalesOrder) => {
    if (!order?.id) {
      setError('ID do pedido inválido');
      return;
    }

    if (!isManager && !isAdmin) {
      setError('Você não tem permissão para aprovar pedidos');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Verificar se o pedido ainda existe e está pendente
      const { data: currentOrder, error: orderError } = await supabase
        .from('sales_orders')
        .select('id, status')
        .eq('id', order.id)
        .single();

      if (orderError || !currentOrder) {
        throw new Error('Pedido não encontrado ou foi removido');
      }

      if (currentOrder.status !== 'pending') {
        throw new Error('Este pedido não está mais pendente');
      }

      // Processar emissão da NFe
      const resultado = await processarEmissaoNFe(order.id);
      
      if (!resultado?.sucesso) {
        throw new Error(resultado?.motivo || 'Erro ao emitir NFe');
      }
      
      // Atualizar a lista de pedidos
      await fetchOrders();
      
      // Abrir DANFE em nova janela
      if (resultado.chave) {
        const danfeUrl = `${window.location.origin}/api/nfe/danfe/${resultado.chave}`;
        window.open(danfeUrl, '_blank');
      }
      
      setError(null);
    } catch (error) {
      console.error('Erro ao aprovar pedido:', error);
      setError(error instanceof Error ? error.message : 'Erro ao aprovar pedido. Por favor, tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrder = async (order: SalesOrder) => {
    if (!isManager && !isAdmin) {
      setError('Você não tem permissão para rejeitar pedidos');
      return;
    }

    const reason = prompt('Por favor, informe o motivo da rejeição:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ 
          status: 'rejected',
          notes: `Rejeitado: ${reason}`
        })
        .eq('id', order.id);

      if (error) throw error;
      
      setError(null);
      fetchOrders();
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
      setError('Erro ao rejeitar pedido. Por favor, tente novamente.');
    }
  };

  const handleCancelOrder = async (order: SalesOrder) => {
    if (!isManager && !isAdmin) {
      setError('Você não tem permissão para cancelar pedidos');
      return;
    }

    const reason = prompt('Por favor, informe o motivo do cancelamento:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ 
          status: 'rejected',
          notes: `Cancelado: ${reason}`
        })
        .eq('id', order.id);

      if (error) throw error;
      
      setError(null);
      fetchOrders();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      setError('Erro ao cancelar pedido. Por favor, tente novamente.');
    }
  };

  const handleEditOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleViewOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const filteredOrders = orders.filter(order =>
    order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.seller?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Pedidos de Venda</h1>
        <button
          onClick={() => {
            setSelectedOrder(null);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Pedido
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
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-[#FF8A00] focus:border-[#FF8A00]"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Número/Data
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Cliente
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Vendedor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                Valor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                Comissão
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order, index) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {orders.length - index}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 truncate max-w-[150px]" title={order.customer.razao_social}>
                    {order.customer.razao_social}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {order.seller?.full_name || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.seller?.commission_rate ? `${order.seller.commission_rate}%` : '5%'}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {order.total_amount.toFixed(2)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {order.commission_amount.toFixed(2)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {/* View button - always visible */}
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Visualizar Pedido"
                    >
                      <FileText className="h-5 w-5" />
                    </button>

                    {/* Edit button - only for pending orders */}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Editar Pedido"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}

                    {/* Approve button - only for pending orders and admin/manager */}
                    {(isManager || isAdmin) && order.status === 'pending' && (
                      <button
                        onClick={() => handleApproveOrder(order)}
                        disabled={processing}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Aprovar Pedido"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    )}

                    {/* Reject button - only for pending orders and admin/manager */}
                    {(isManager || isAdmin) && order.status === 'pending' && (
                      <button
                        onClick={() => handleRejectOrder(order)}
                        disabled={processing}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rejeitar Pedido"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    )}

                    {/* Cancel button - only for pending orders and admin/manager */}
                    {(isManager || isAdmin) && order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={processing}
                        className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cancelar Pedido"
                      >
                        <Ban className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SalesOrderModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedOrder(null);
        }}
        onSuccess={fetchOrders}
        order={selectedOrder}
      />

      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
}

export default SalesOrders;

export { SalesOrders };