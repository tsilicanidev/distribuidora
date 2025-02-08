import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  razao_social: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
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
        { data: customersData },
        { data: productsData },
      ] = await Promise.all([
        supabase.from('customers').select('id, razao_social').order('razao_social'),
        supabase.from('products').select('*').order('name'),
      ]);

      setCustomers(customersData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
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
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    // Update unit price if product changes
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unit_price = product.price;
        newItems[index].total_price = product.price * newItems[index].quantity;
      }
    }

    // Update total price if quantity or unit price changes
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get next order number
      const { data: lastOrder } = await supabase
        .from('sales_orders')
        .select('number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = lastOrder
        ? String(Number(lastOrder.number) + 1).padStart(6, '0')
        : '000001';

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{
          number: nextNumber,
          customer_id: formData.customer_id,
          seller_id: user.id,
          status: 'pending',
          notes: formData.notes,
          total_amount: items.reduce((sum, item) => sum + item.total_price, 0),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(
          items.map(item => ({
            sales_order_id: order.id,
            ...item,
          }))
        );

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
            <X className="h-6 w-6" />
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
                    {customer.razao_social}
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
                    Preço Unitário *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Preço Total
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