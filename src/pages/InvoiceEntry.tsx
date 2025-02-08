import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Supplier {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface InvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function InvoiceEntry() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoiceData, setInvoiceData] = useState({
    number: '',
    supplier_id: '',
    issue_date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<InvoiceItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  }]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, razao_social, cpf_cnpj')
        .order('razao_social');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
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

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          ...invoiceData,
          total_amount: items.reduce((sum, item) => sum + item.total_price, 0),
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          items.map(item => ({
            invoice_id: invoice.id,
            ...item,
          }))
        );

      if (itemsError) throw itemsError;

      alert('Nota fiscal processada com sucesso!');
      
      setInvoiceData({
        number: '',
        supplier_id: '',
        issue_date: new Date().toISOString().split('T')[0],
      });
      setItems([{
        product_id: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      }]);
    } catch (error) {
      console.error('Erro ao salvar nota fiscal:', error);
      alert('Erro ao salvar nota fiscal. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entrada de Nota Fiscal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Nota</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número da NF *
              </label>
              <input
                type="text"
                required
                value={invoiceData.number}
                onChange={(e) => setInvoiceData({ ...invoiceData, number: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fornecedor *
              </label>
              <select
                required
                value={invoiceData.supplier_id}
                onChange={(e) => setInvoiceData({ ...invoiceData, supplier_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.razao_social} ({supplier.cpf_cnpj})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data de Emissão *
              </label>
              <input
                type="date"
                required
                value={invoiceData.issue_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, issue_date: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Itens</h2>
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
            <div key={index} className="grid grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4 mb-4">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700">
                  Produto *
                </label>
                <select
                  required
                  value={item.product_id}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    updateItem(index, 'product_id', e.target.value);
                    if (product) {
                      updateItem(index, 'unit_price', product.price);
                    }
                  }}
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
                  Valor Total
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

          <div className="mt-4 text-right">
            <p className="text-lg font-semibold text-gray-900">
              Total: R$ {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Nota Fiscal
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}