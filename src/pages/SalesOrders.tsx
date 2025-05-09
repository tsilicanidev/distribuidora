import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertTriangle, FileCheck, CheckCircle, XCircle, Ban, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SalesOrderModal } from '../components/SalesOrderModal';
import { useRole } from '../hooks/useRole';
import { emitirNfe } from '@/lib/nfe/emitirNfe';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
}

interface OrderItem {
  id: string;
  product: {
    name: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
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
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          product:products(name)
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
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        R$ {item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        R$ {item.total_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Total:</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                      R$ {order.total_amount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Comissão:</td>
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

  const nfeService = new NFe();

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
          customer:customers(
            id,
            razao_social,
            cpf_cnpj,
            ie,
            endereco,
            bairro,
            cidade,
            estado,
            cep
          ),
          seller:profiles(
            full_name,
            commission_rate
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error: orderError } = await query;

      if (orderError) throw orderError;
      setOrders(data || []);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }

  const handleApproveOrder = async (order: SalesOrder) => {
    if (!isManager && !isAdmin) {
      setError('Você não tem permissão para aprovar pedidos');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('sales_order_id', order.id);

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) throw new Error('Pedido sem itens');

      // Update stock quantities
      for (const item of items) {
        // Get current stock quantity
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (productError) throw productError;
        if (!product) throw new Error('Produto não encontrado');

        // Calculate new stock quantity
        const newQuantity = product.stock_quantity - item.quantity;

        // Update stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: newQuantity })
          .eq('id', item.product_id);

        if (stockError) throw stockError;

        // Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: item.product_id,
            quantity: item.quantity,
            type: 'OUT',
            reference_id: order.id,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (movementError) throw movementError;
      }

      // Prepare NFe data
      const nfeData = {
        numero: order.number,
        serie: '1',
        natureza_operacao: 'VENDA DE MERCADORIAS',
        tipo_documento: '55',
        destino_operacao: '1',
        finalidade_emissao: '1',
        consumidor_final: '1',
        presenca_comprador: '1',
        data_emissao: new Date().toISOString(),
        data_saida: new Date().toISOString(),
        emitente: {
          cnpj: import.meta.env.VITE_EMPRESA_CNPJ,
          inscricao_estadual: import.meta.env.VITE_EMPRESA_IE,
          nome: import.meta.env.VITE_EMPRESA_RAZAO_SOCIAL,
          email: import.meta.env.VITE_EMPRESA_EMAIL,
          endereco: {
            logradouro: import.meta.env.VITE_EMPRESA_ENDERECO,
            numero: import.meta.env.VITE_EMPRESA_NUMERO,
            bairro: import.meta.env.VITE_EMPRESA_BAIRRO,
            municipio: import.meta.env.VITE_EMPRESA_CIDADE,
            uf: import.meta.env.VITE_EMPRESA_UF,
            cep: import.meta.env.VITE_EMPRESA_CEP,
            pais: 'Brasil'
          }
        },
        destinatario: {
          cpf_cnpj: order.customer.cpf_cnpj,
          inscricao_estadual: order.customer.ie || '',
          nome: order.customer.razao_social,
          email: order.customer.email || 'cliente@example.com',
          endereco: {
            logradouro: order.customer.endereco || '',
            numero: '',
            bairro: order.customer.bairro || '',
            municipio: order.customer.cidade || '',
            uf: order.customer.estado || '',
            cep: order.customer.cep || '',
            pais: 'Brasil'
          }
        },
        itens: items.map(item => ({
          produto: {
            codigo: item.product_id,
            descricao: item.product.name,
            ncm: item.product.ncm || '00000000',
            cfop: '5102',
            unidade: item.product.unit || 'UN',
            quantidade: item.quantity,
            valor_unitario: item.unit_price,
            valor_total: item.total_price
          },
          imposto: {
            icms: {
              origem: '0',
              cst: '00',
              aliquota: 18,
              base_calculo: item.total_price,
              valor: item.total_price * 0.18
            }
          }
        })),
        valor_frete: 0,
        valor_seguro: 0,
        valor_total: order.total_amount,
        valor_produtos: order.total_amount,
        valor_desconto: 0,
        informacoes_complementares: order.notes || ''
      };

      // Emit NFe
      const nfeResult = await emitirNFe(xmlAssinado);
      if (!nfeResult.success) {
        throw new Error(nfeResult.message || 'Erro ao emitir NFe');
      }

      // Create fiscal invoice record
      const { error: invoiceError } = await supabase
        .from('fiscal_invoices')
        .insert([{
          number: nfeResult.nfe_numero,
          series: nfeResult.nfe_serie,
          customer_id: order.customer.id,
          total_amount: order.total_amount,
          tax_amount: order.total_amount * 0.18,
          status: 'issued',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          xml_url: nfeResult.xml_url,
          pdf_url: nfeResult.pdf_url
        }]);

      if (invoiceError) throw invoiceError;

      // Update order status
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ status: 'approved' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      setError(null);
      fetchOrders();

      // Open NFe documents in new tabs - but only one at a time to prevent duplicate windows
      if (nfeResult.pdf_url) {
        // Open PDF in a new tab
        const pdfWindow = window.open(nfeResult.pdf_url, '_blank');
        
        // Only open XML if PDF was successfully opened
        if (pdfWindow && nfeResult.xml_url) {
          // Wait a moment before opening the second window to prevent popup blockers
          setTimeout(() => {
            window.open(nfeResult.xml_url, '_blank');
          }, 500);
        }
      }
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
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {order.number}
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
                        className="text-green-600 hover:text-green-900"
                        title="Aprovar Pedido"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}

                    {/* Reject button - only for pending orders and admin/manager */}
                    {(isManager || isAdmin) && order.status === 'pending' && (
                      <button
                        onClick={() => handleRejectOrder(order)}
                        disabled={processing}
                        className="text-red-600 hover:text-red-900"
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
                        className="text-orange-600 hover:text-orange-900"
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