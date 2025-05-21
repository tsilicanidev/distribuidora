import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import debounce from 'lodash.debounce';

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
  selected_unit?: string;
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
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    notes: '',
    discount_percentage: 0,
    payment_method: '',
    due_date: '',
  });

  const [items, setItems] = useState<SalesOrderItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    selected_unit: 'UN'
  }]);

  const [showDueDateOptions, setShowDueDateOptions] = useState(false);
  const [selectedDueDateOption, setSelectedDueDateOption] = useState<string | null>(null);

 async function searchCustomers(term: string) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, razao_social, cpf_cnpj')
      .or(`razao_social.ilike.%${term}%,cpf_cnpj.ilike.%${term}%`)
      .order('razao_social');

    if (error) throw error;

    setFilteredCustomers(data || []);
    setShowCustomerDropdown(true);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    setFilteredCustomers([]);
    setShowCustomerDropdown(false);
  }
}



  useEffect(() => {
    if (isOpen) {
      fetchData();
      
      // If editing an existing order
      if (order) {
        setFormData({
          customer_id: order.customer.id,
          notes: order.notes || '',
          discount_percentage: order.discount_percentage || 0,
          payment_method: order.payment_method || '',
          due_date: order.due_date ? new Date(order.due_date).toISOString().split('T')[0] : '',
        });
        
        // Fetch order items
        fetchOrderItems(order.id);
      } else {
        // Reset form for new order
        setFormData({
          customer_id: '',
          notes: '',
          discount_percentage: 0,
          payment_method: '',
          due_date: '',
        });
        setItems([{
          product_id: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          selected_unit: 'UN'
        }]);
        setCustomerSearchTerm('');
        setFilteredCustomers([]);
      }
    }
  }, [isOpen, order]);

  useEffect(() => {
    // Show due date options only when payment method is "boleto"
    setShowDueDateOptions(formData.payment_method === 'boleto');
    
    // If payment method changes away from boleto, clear due date
    if (formData.payment_method !== 'boleto') {
      setFormData(prev => ({ ...prev, due_date: '' }));
      setSelectedDueDateOption(null);
    }
  }, [formData.payment_method]);

 useEffect(() => {
  const debouncedSearch = debounce(() => {
    searchCustomers(customerSearchTerm);
  }, 300); // espera 300ms sem digitar

  if (customerSearchTerm.trim()) {
    debouncedSearch();
  } else {
    setFilteredCustomers([]);
    setShowCustomerDropdown(false);
  }

  return () => debouncedSearch.cancel();
}, [customerSearchTerm]);

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

  async function fetchOrderItems(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('sales_order_id', orderId);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setItems(data.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          selected_unit: getProductUnit(item.product_id)
        })));
      }
    } catch (error) {
      console.error('Error fetching order items:', error);
      setError('Erro ao carregar itens do pedido');
    }
  }

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      selected_unit: 'UN'
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
        currentItem.selected_unit = product.unit || 'UN';
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
    } else if (field === 'total_price') {
      const totalPrice = parseFloat(value) || 0;
      if (totalPrice >= 0) {
        currentItem.total_price = totalPrice;
        // If quantity is valid, adjust unit price based on the new total
        if (currentItem.quantity > 0) {
          currentItem.unit_price = totalPrice / currentItem.quantity;
        }
      }
    } else if (field === 'selected_unit') {
      currentItem.selected_unit = value;
      
      // Adjust price based on unit if needed
      const product = products.find(p => p.id === currentItem.product_id);
      if (product) {
        // This is where you would implement unit-specific pricing logic
        // For example, if the base unit is 'UN' and the selected unit is 'CX' (box)
        // you might multiply the price by the number of units in a box
        
        // For now, we'll just use a simple multiplier based on unit type
        let priceMultiplier = 1;
        
        if (value === 'CX' && product.unit === 'UN') {
          priceMultiplier = 12; // Example: 12 units per box
        } else if (value === 'FD' && product.unit === 'UN') {
          priceMultiplier = 24; // Example: 24 units per bundle
        } else if (value === 'PCT' && product.unit === 'UN') {
          priceMultiplier = 6; // Example: 6 units per package
        }
        
        // Update price based on the multiplier
        currentItem.unit_price = product.price * priceMultiplier;
        currentItem.total_price = currentItem.unit_price * currentItem.quantity;
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

  const setDueDate = (days: number, option: string) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData({
      ...formData,
      due_date: date.toISOString().split('T')[0]
    });
    setSelectedDueDateOption(option);
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

      // Check stock availability
      for (const item of items) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          throw new Error('Produto não encontrado');
        }
        if (item.quantity > product.stock_quantity) {
          throw new Error(`Quantidade insuficiente em estoque para o produto ${product.name}`);
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get seller's commission rate from their profile
      const { data: sellerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('commission_rate')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching seller profile:', profileError);
      }

      // Use seller's commission rate or default to 5%
      const commissionRate = sellerProfile?.commission_rate ?? 5;

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const discountAmount = subtotal * (formData.discount_percentage / 100);
      const totalAmount = subtotal - discountAmount;
      const commissionAmount = totalAmount * (commissionRate / 100); // Use seller's commission rate

      if (order) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('sales_orders')
          .update({
            customer_id: formData.customer_id,
            notes: formData.notes,
            total_amount: totalAmount,
            commission_amount: commissionAmount,
            discount_percentage: formData.discount_percentage,
            subtotal_amount: subtotal,
            discount_amount: discountAmount,
            payment_method: formData.payment_method,
            due_date: formData.due_date || null
          })
          .eq('id', order.id);

        if (orderError) throw orderError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('sales_order_id', order.id);

        if (deleteError) throw deleteError;

        // Create new items
        const { error: itemsError } = await supabase
          .from('sales_order_items')
          .insert(
            items.map(item => ({
              sales_order_id: order.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            }))
          );

        if (itemsError) throw itemsError;
      } else {
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
                discount_amount: discountAmount,
                payment_method: formData.payment_method,
                due_date: formData.due_date || null
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
      }

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

  const handleSelectCustomer = (customerId: string) => {
    setFormData({
      ...formData,
      customer_id: customerId
    });
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
  };

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const getUnitOptions = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return ['UN'];
    
    // Base unit is the product's unit
    const baseUnit = product.unit || 'UN';
    
    // Available units depend on the base unit
    switch (baseUnit) {
      case 'UN':
        return ['UN', 'CX', 'PCT', 'FD'];
      case 'KG':
        return ['KG', 'G'];
      case 'L':
        return ['L', 'ML'];
      default:
        return [baseUnit];
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      'UN': 'Unidade',
      'CX': 'Caixa',
      'KG': 'Quilograma',
      'G': 'Grama',
      'L': 'Litro',
      'ML': 'Mililitro',
      'PCT': 'Pacote',
      'FD': 'Fardo'
    };
    return labels[unit] || unit;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {order ? 'Editar Pedido' : 'Novo Pedido de Venda'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              
              {/* Customer search by CNPJ/Name */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => {
                    if (customerSearchTerm.trim()) {
                      setShowCustomerDropdown(true);
                    }
                  }}
                  placeholder="Buscar por CNPJ ou nome do cliente"
                  className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <div 
                        key={customer.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectCustomer(customer.id)}
                      >
                        <div className="font-medium">{customer.razao_social}</div>
                        <div className="text-sm text-gray-600">{formatCpfCnpj(customer.cpf_cnpj)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Customer dropdown (still available) */}
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                required
              >
                <option value="">Selecione um cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.razao_social} ({formatCpfCnpj(customer.cpf_cnpj)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Forma de Pagamento
              </label>
              <select
                value={formData.payment_method || ''}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione uma forma de pagamento</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="transferencia">Transferência Bancária</option>
                <option value="cheque">Cheque</option>
                <option value="prazo">A Prazo</option>
              </select>
            </div>

            {showDueDateOptions && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Opções de Vencimento
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setDueDate(7, '7days')}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedDueDateOption === '7days'
                        ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    7 dias ({new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(7, '7-14days')}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedDueDateOption === '7-14days'
                        ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    7/14 dias (Primeira parcela: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()})
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  {formData.due_date && (
                    <p>Data de vencimento selecionada: {new Date(formData.due_date).toLocaleDateString()}</p>
                  )}
                  {formData.due_date && selectedDueDateOption === '7-14days' && (
                    <p className="mt-1 italic">
                      Opção 7/14 dias: A segunda parcela vencerá em {new Date(new Date(formData.due_date).setDate(new Date(formData.due_date).getDate() + 7)).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

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
                    Unidade
                  </label>
                  <select
                    value={item.selected_unit || getProductUnit(item.product_id)}
                    onChange={(e) => updateItem(index, 'selected_unit', e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    disabled={!item.product_id}
                  >
                    {item.product_id && getUnitOptions(item.product_id).map(unit => (
                      <option key={unit} value={unit}>
                        {getUnitLabel(unit)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Preço Unit.
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.total_price}
                    onChange={(e) => updateItem(index, 'total_price', parseFloat(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
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
              {saving ? 'Salvando...' : order ? 'Atualizar Pedido' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalesOrderModal;