import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertTriangle, FileCheck, CheckCircle, XCircle, Ban, FileInput as FileInvoice, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SalesOrderModal } from '../components/SalesOrderModal';
import { useRole } from '../hooks/useRole';
import { NFe } from '../services/nfe';

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
            <X className="h-6 w-6" />
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

export function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { isManager, isAdmin, isMaster } = useRole();
  const [processing, setProcessing] = useState(false);

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
          seller:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleInvoiceOrder = async (order: SalesOrder) => {
    if (!confirm('Deseja realmente faturar este pedido? Esta ação irá gerar uma NF-e e atualizar o estoque.')) return;

    setProcessing(true);
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

      // Check stock availability
      for (const item of items || []) {
        if (item.quantity > item.product.stock_quantity) {
          throw new Error(`Estoque insuficiente para o produto ${item.product.name}`);
        }
      }

      // Prepare NFe data
      const nfeData = {
        numero: order.number,
        serie: '1',
        natureza_operacao: 'VENDA DE MERCADORIAS',
        tipo_documento: '1',
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
          nome_fantasia: import.meta.env.VITE_EMPRESA_RAZAO_SOCIAL,
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
          inscricao_estadual: order.customer.ie,
          nome: order.customer.razao_social,
          email: import.meta.env.VITE_EMPRESA_EMAIL,
          endereco: {
            logradouro: order.customer.endereco,
            numero: '',
            bairro: order.customer.bairro,
            municipio: order.customer.cidade,
            uf: order.customer.estado,
            cep: order.customer.cep,
            pais: 'Brasil'
          }
        },
        itens: items?.map(item => ({
          produto: {
            codigo: item.product.id,
            descricao: item.product.name,
            ncm: '00000000',
            cfop: '5102',
            unidade: 'UN',
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
      const nfe = new NFe();
      const nfeResult = await nfe.emitir(nfeData);

      if (!nfeResult.success) {
        throw new Error(nfeResult.message);
      }

      // Create fiscal invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('fiscal_invoices')
        .insert([{
          number: nfeResult.nfe_numero,
          series: nfeResult.nfe_serie,
          issue_date: new Date().toISOString(),
          customer_id: order.customer.id,
          total_amount: order.total_amount,
          tax_amount: order.total_amount * 0.18,
          status: 'issued',
          xml_url: nfeResult.xml_url,
          pdf_url: nfeResult.pdf_url,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update stock for each item
      for (const item of items || []) {
        // Reduce stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.product.stock_quantity - item.quantity 
          })
          .eq('id', item.product_id);

        if (stockError) throw stockError;

        // Register stock movement
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

      // Update order status
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      alert('Pedido faturado com sucesso!');
      
      // Open NFe documents in new tabs
      if (nfeResult.pdf_url) {
        window.open(nfeResult.pdf_url, '_blank');
      }
      if (nfeResult.xml_url) {
        window.open(nfeResult.xml_url, '_blank');
      }

      fetchOrders();

    } catch (error) {
      console.error('Erro ao faturar pedido:', error);
      alert(error instanceof Error ? error.message : 'Erro ao faturar pedido');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelOrder = async (order: SalesOrder) => {
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
      
      alert('Pedido cancelado com sucesso!');
      fetchOrders();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      alert('Erro ao cancelar pedido. Por favor, tente novamente.');
    }
  };

  const handleApproveOrder = async (order: SalesOrder) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'approved' })
        .eq('id', order.id);

      if (error) throw error;
      
      alert('Pedido aprovado com sucesso!');
      fetchOrders();
    } catch (error) {
      console.error('Erro ao aprovar pedido:', error);
      alert('Erro ao aprovar pedido. Por favor, tente novamente.');
    }
  };

  const handleRejectOrder = async (order: SalesOrder) => {
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
      
      alert('Pedido rejeitado com sucesso!');
      fetchOrders();
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
      alert('Erro ao rejeitar pedido. Por favor, tente novamente.');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                Vendedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comissão
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {order.seller?.full_name || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {order.total_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {order.commission_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailsModal(true);
                    }}
                    className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                    title="Visualizar"
                  >
                    <FileText className="h-5 w-5" />
                  </button>

                  {(isManager || isAdmin || isMaster) && order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveOrder(order)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Aprovar Pedido"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order)}
                        className="text-red-600 hover:text-red-900 mr-3"
                        title="Rejeitar Pedido"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {(isManager || isAdmin || isMaster) && order.status === 'approved' && (
                    <button
                      onClick={() => handleInvoiceOrder(order)}
                      disabled={processing}
                      className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                      title="Faturar Pedido"
                    >
                      <FileInvoice className="h-5 w-5" />
                    </button>
                  )}

                  {(isManager || isAdmin || isMaster) && order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order)}
                      className="text-red-600 hover:text-red-900"
                      title="Cancelar Pedido"
                    >
                      <Ban className="h-5 w-5" />
                    </button>
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