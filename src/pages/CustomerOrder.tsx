import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Minus, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateToken } from '../utils/token';
import { logError } from '../utils/errorLogging';
import { v4 as uuidv4 } from 'uuid';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Customer {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export function CustomerOrder() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([{ product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderLink, setOrderLink] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Token inválido ou não fornecido');
      setLoading(false);
      return;
    }
    validateTokenAndFetchData();
  }, [token]);

  async function validateTokenAndFetchData() {
    try {
      const validation = await validateToken(token);
      if (!validation.valid || !validation.orderLink) {
        throw new Error(validation.error || 'Token inválido');
      }

      setOrderLink(validation.orderLink);
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', validation.customerId)
        .single();

      if (customerError || !customerData) throw new Error('Erro ao buscar cliente');
      setCustomer(customerData);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name');

      if (productsError) throw new Error('Erro ao carregar produtos');
      setProducts(productsData || []);
      setError(null);
    } catch (error) {
      await logError(error as Error, { token, action: 'validateTokenAndFetchData' });
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !orderLink) return;

    setSaving(true);
    setError(null);

    try {
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      console.log('Verificando dados antes da inserção:', { customer, orderLink, totalAmount, notes });

      const orderNumber = `ORDER-${Date.now()}`;
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{ number: orderNumber, customer_id: customer.id, order_link_id: orderLink.id, status: 'pending', total_amount: totalAmount, notes: notes || '' }])
        .select()
        .single();

      if (orderError) throw new Error(orderError.message || 'Erro ao criar pedido');

      for (const item of items) {
        const { data: existingItem } = await supabase
          .from('customer_order_items')
          .select('id')
          .eq('order_id', order.id)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (existingItem) {
          console.error('🔴 Erro: O item já existe no pedido.');
          continue;
        }

        const { error: itemsError } = await supabase.from('customer_order_items').insert([{ id: uuidv4(), order_id: order.id, product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price }]);

        if (itemsError) throw itemsError;
      }

      for (const item of items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', { product_id: item.product_id, quantity: item.quantity });
        if (stockError) throw stockError;
      }

      const { error: linkError } = await supabase.from('customer_order_links').update({ active: false }).eq('id', orderLink.id);
      if (linkError) console.error('Erro ao desativar o link do pedido:', linkError);

      setOrderComplete(true);
    } catch (error) {
      await logError(error as Error, { customer_id: customer?.id, items, action: 'createOrder', token });
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Enviado!</h2>
            <p className="text-gray-600 mb-6">
              Seu pedido foi recebido com sucesso e será processado em breve.
              Você receberá atualizações sobre o status do seu pedido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Dados do Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Razão Social</p>
                <p className="text-base text-gray-900">{customer?.razao_social}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">CPF/CNPJ</p>
                <p className="text-base text-gray-900">{customer?.cpf_cnpj}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p className="text-base text-gray-900">
                  {customer?.endereco}, {customer?.bairro}, {customer?.cidade} - {customer?.estado}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Produtos</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center px-3 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700">
                      Produto *
                    </label>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Estoque: {product.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preço Unit.
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={item.unit_price}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Total
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={item.total_price}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50"
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      disabled={items.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-lg font-medium text-gray-900">
                Total do Pedido: R$ {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-3 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Enviar Pedido
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}