import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Supplier {
  id: string;
  razao_social: string;
  cnpj: string;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emitindoNFe, setEmitindoNFe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: '',
    supplier_id: '',
    issue_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
  });

  const [items, setItems] = useState<InvoiceItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  }]);

  useEffect(() => {
    fetchData();
    getNextInvoiceNumber();
  }, []);

  async function getNextInvoiceNumber() {
    try {
      const { data, error } = await supabase
  .rpc('get_next_invoice_number');
      
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, number: data }));
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      setError('Erro ao gerar número da nota fiscal');
    }
  }

  async function fetchData() {
    try {
      const [
        { data: suppliersData, error: suppliersError },
        { data: productsData, error: productsError }
      ] = await Promise.all([
        supabase.from('suppliers').select('id, razao_social, cnpj').order('razao_social'),
        supabase.from('products').select('*').order('name')
      ]);

      if (suppliersError) throw suppliersError;
      if (productsError) throw productsError;

      setSuppliers(suppliersData || []);
      setProducts(productsData || []);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
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

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
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
    } else if (field === 'unit_price') {
      const price = parseFloat(value) || 0;
      if (price >= 0) {
        currentItem.unit_price = price;
        currentItem.total_price = price * currentItem.quantity;
      }
    }

    newItems[index] = currentItem;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.supplier_id) {
        throw new Error('Selecione um fornecedor');
      }

      if (!items.length || items.some(item => !item.product_id)) {
        throw new Error('Adicione pelo menos um produto');
      }

      // Check if invoice number already exists
      const { data: existingInvoice } = await supabase
        .from('fiscal_invoices')
        .select('id')
        .eq('number', formData.number)
        .maybeSingle();

      if (existingInvoice) {
        throw new Error('Número de nota fiscal já existe. Gerando novo número...');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get supplier data
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', formData.supplier_id)
        .single();

      if (!supplier) throw new Error('Fornecedor não encontrado');

      // First, create or find a corresponding customer record for the supplier
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('cpf_cnpj', supplier.cnpj)
        .maybeSingle();

      let customerId;

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create a new customer record for the supplier
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            razao_social: supplier.razao_social,
            cpf_cnpj: supplier.cnpj,
            email: 'supplier@example.com', // Required field, using placeholder
          }])
          .select()
          .single();

        if (customerError) throw new Error('Erro ao criar registro de cliente para o fornecedor');
        customerId = newCustomer.id;
      }

      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const taxAmount = totalAmount * 0.18; // 18% tax rate

      // Create fiscal invoice using the customer ID
      const { data: invoice, error: invoiceError } = await supabase
        .from('fiscal_invoices')
        .insert([{
          number: formData.number,
          series: '1',
          issue_date: formData.issue_date,
          customer_id: customerId,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          status: 'draft',
          created_by: user.id
        }])
        .select()
        .single();

      if (invoiceError) {
        if (invoiceError.code === '23505') { // Unique constraint violation
          await getNextInvoiceNumber();
          throw new Error('Número de nota fiscal já existe. Um novo número foi gerado. Por favor, tente novamente.');
        }
        throw invoiceError;
      }

      // Update product stock and create stock movements
      for (const item of items) {
        // Get current product stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (!product) throw new Error('Produto não encontrado');

        // Update product stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: product.stock_quantity + item.quantity 
          })
          .eq('id', item.product_id);

        if (stockError) throw stockError;

        // Create stock movement
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: item.product_id,
            quantity: item.quantity,
            type: 'IN',
            reference_id: invoice.id,
            created_by: user.id
          }]);

        if (movementError) throw movementError;
      }

      // Reset form
      setFormData({
        number: '',
        supplier_id: '',
        issue_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
      });
      setItems([{
        product_id: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      }]);
      setError(null);

      // Get next invoice number for the next entry
      await getNextInvoiceNumber();

      alert('Nota fiscal de entrada registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar nota fiscal:', error);
      setError(error instanceof Error ? error.message : 'Erro ao processar nota fiscal');
      
      if (error instanceof Error && error.message.includes('já existe')) {
        await getNextInvoiceNumber();
      }
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Entrada de Nota Fiscal</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
          {error}
        </div>
      )}

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
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fornecedor *
              </label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.razao_social} ({supplier.cnpj})
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
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
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
                  Preço Unit. *
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
                {emitindoNFe ? 'Emitindo NF-e...' : 'Salvando...'}
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