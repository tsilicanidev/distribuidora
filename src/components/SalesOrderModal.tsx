import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  unit: string;
}

interface SalesOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order?: any;
}

export function SalesOrderModal({ isOpen, onClose, onSuccess, order }: SalesOrderModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    notes: '',
    discount_percentage: 0,
  });

  const [items, setItems] = useState<SalesOrderItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  }]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    try {
      const [
        { data: customersData, error: customersError },
        { data: productsData, error: productsError }
      ] = await Promise.all([
        supabase.from('customers').select('id, razao_social, cpf_cnpj').order('razao_social'),
        supabase.from('products').select('*').order('name')
      ]);

      if (customersError) throw customersError;
      if (productsError) throw productsError;

      setCustomers(customersData || []);
      setProducts(productsData || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index] };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        currentItem.product_id = value;
        currentItem.unit_price = product.price;
        currentItem.total_price = product.price * currentItem.quantity;
      }
    } else if (field === 'quantity') {
      const quantity = parseInt(value) || 0;
      if (quantity > 0) {
        currentItem.quantity = quantity;
        currentItem.total_price = currentItem.unit_price * quantity;
      }
    }

    newItems[index] = currentItem;
    setItems(newItems);
  };

  const calculateTotalWithDiscount = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = subtotal * (formData.discount_percentage / 100);
    return subtotal - discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.customer_id) {
        throw new Error('Selecione um cliente');
      }

      if (!items.length || items.some(item => !item.product_id)) {
        throw new Error('Adicione pelo menos um produto');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const discountAmount = subtotal * (formData.discount_percentage / 100);
      const totalAmount = subtotal - discountAmount;
      const commissionAmount = totalAmount * 0.05; // 5% commission

      // Create order with retry logic
      let orderCreated = false;
      let retryCount = 0;
      const maxRetries = 3;
      let orderData;

      while (!orderCreated && retryCount < maxRetries) {
        try {
          const { data: order, error: orderError } = await supabase
            .from('sales_orders')
            .insert([{
              customer_id: formData.customer_id,
              seller_id: user.id,
              status: 'pending',
              notes: formData.notes,
              total_amount: totalAmount,
              commission_amount: commissionAmount,
              discount_percentage: formData.discount_percentage,
              subtotal_amount: subtotal,
              discount_amount: discountAmount
            }])
            .select()
            .single();

          if (orderError) {
            if (retryCount >= maxRetries - 1) {
              throw orderError;
            }
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            retryCount++;
            continue;
          }

          orderData = order;
          orderCreated = true;
        } catch (error) {
          if (retryCount >= maxRetries - 1) {
            throw error;
          }
          retryCount++;
        }
      }

      if (!orderData) {
        throw new Error('Erro ao criar pedido após várias tentativas');
      }

      // Create order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(
          items.map(item => ({
            sales_order_id: orderData.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))
        );

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar pedido');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const getProductUnit = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.unit || 'UN';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Novo Pedido de Venda
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <Minus className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cliente *
              </label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
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
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Itens</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center px-3 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4">
                <div className="col-span-4">
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
                        {product.name} (Estoque: {product.stock_quantity} {product.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantidade * ({getProductUnit(item.product_id)})
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
                    type="text"
                    readOnly
                    value={item.unit_price.toFixed(2)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Total
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={item.total_price.toFixed(2)}
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

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 mr-2">
                  Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#FF8A00]"
                />
              </div>
              <div className="text-sm text-gray-500">
                Subtotal: R$ {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                Desconto: R$ {(items.reduce((sum, item) => sum + item.total_price, 0) * (formData.discount_percentage / 100)).toFixed(2)}
              </div>
            </div>
            <div className="text-lg font-medium text-gray-900">
              Total do Pedido: R$ {calculateTotalWithDiscount().toFixed(2)}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalesOrderModal;