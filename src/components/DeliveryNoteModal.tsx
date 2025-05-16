import React, { useState, useEffect } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';


// Funções auxiliares para extrair nome e número da rua
function extractStreetName(address: string): string {
  if (!address) return '';
  const match = address.match(/(.*?)\s*\d+\s*$/);
  return match ? match[1].trim() : address;
}

function extractStreetNumber(address: string): string {
  if (!address) return '';
  const match = address.match(/(\d+)\s*$/);
  return match ? match[1] : '';
}

interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

interface Order {
  id: string;
  number: string;
  displayNumber?: string; // Add displayNumber property
  customer: {
    razao_social: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  total_amount: number;
  payment_method?: string;
  due_date?: string;
}

interface DeliveryNoteItem {
  order_id: string;
  delivery_sequence: number;
  payment_method?: string;
  due_date?: string;
  delivery_address?: string;
  delivery_address_street?: string;
  delivery_address_number?: string;
  delivery_address_complement?: string;
  delivery_address_neighborhood?: string;
  delivery_address_city?: string;
  delivery_address_state?: string;
  delivery_address_notes?: string;
  selectedDueDateOption?: string;
}

interface DeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deliveryNote?: any;
}

export function DeliveryNoteModal({ isOpen, onClose, onSuccess, deliveryNote }: DeliveryNoteModalProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

const [formData, setFormData] = useState({
  number: '',
  date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
  vehicle_id: '',
  helper_name: '',
  notes: '',
});

  const [items, setItems] = useState<DeliveryNoteItem[]>([{
    order_id: '',
    delivery_sequence: 1,
    payment_method: '',
    due_date: '',
    selectedDueDateOption: '',
  }]);

  const [showDueDateOptions, setShowDueDateOptions] = useState<{ [key: number]: boolean }>({});
  const [selectedDueDateOption, setSelectedDueDateOption] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (deliveryNote) {
        setFormData({
          number: deliveryNote.number,
          date: deliveryNote.date,
          vehicle_id: deliveryNote.vehicle_id,
          helper_name: deliveryNote.helper_name || '',
          notes: deliveryNote.notes || '',
        });
        // Load delivery note items if editing
        if (deliveryNote.items) {
          setItems(deliveryNote.items.map((item: any) => ({
            order_id: item.order_id,
            delivery_sequence: item.delivery_sequence,
            payment_method: item.payment_method || '',
            due_date: item.due_date || '',
            delivery_address: item.delivery_address || '',
            delivery_address_street: item.delivery_address_street || '',
            delivery_address_number: item.delivery_address_number || '',
            delivery_address_complement: item.delivery_address_complement || '',
            delivery_address_neighborhood: item.delivery_address_neighborhood || '',
            delivery_address_city: item.delivery_address_city || '',
            delivery_address_state: item.delivery_address_state || '',
            delivery_address_notes: item.delivery_address_notes || '',
            selectedDueDateOption: item.selectedDueDateOption || '',
          })));
        } else {
          fetchDeliveryNoteItems(deliveryNote.id);
        }
      } else {
        // Reset form for new delivery note
        setFormData({
          number: '',
          date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
          vehicle_id: '',
          helper_name: '',
          notes: '',
        });
        setItems([{
          order_id: '',
          delivery_sequence: 1,
          payment_method: '',
          due_date: '',
          selectedDueDateOption: '',
        }]);
      }
    }
  }, [isOpen, deliveryNote]);

  // Update showDueDateOptions when items change
  useEffect(() => {
    const newShowDueDateOptions: { [key: number]: boolean } = {};
    items.forEach((item, index) => {
      newShowDueDateOptions[index] = item.payment_method === 'boleto';
    });
    setShowDueDateOptions(newShowDueDateOptions);
  }, [items]);

  async function fetchDeliveryNoteItems(deliveryNoteId: string) {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_note_items')
        .select('order_id, delivery_sequence, delivery_address, delivery_address_street, delivery_address_number, delivery_address_complement, delivery_address_neighborhood, delivery_address_city, delivery_address_state, delivery_address_notes, "selectedDueDateOption"')
        .eq('delivery_note_id', deliveryNoteId);

      if (itemsError) throw itemsError;

      if (itemsData && itemsData.length > 0) {
        // Fetch payment methods for each order
        const itemsWithPaymentMethods = await Promise.all(itemsData.map(async (item) => {
          const { data: orderData, error: orderError } = await supabase
            .from('sales_orders')
            .select('payment_method, due_date')
            .eq('id', item.order_id)
            .single();

          if (orderError) {
            console.error('Error fetching order payment method:', orderError);
            return {
              ...item,
              payment_method: '',
              due_date: '',
            };
          }

          return {
            ...item,
            payment_method: orderData?.payment_method || '',
            due_date: orderData?.due_date || '',
            selectedDueDateOption: item.selectedDueDateOption || '',
          };
        }));

        setItems(itemsWithPaymentMethods);
        
        // Set selectedDueDateOption state based on loaded items
        const newSelectedOptions: { [key: number]: string } = {};
        itemsWithPaymentMethods.forEach((item, index) => {
          if (item.selectedDueDateOption) {
            newSelectedOptions[index] = item.selectedDueDateOption;
          }
        });
        setSelectedDueDateOption(newSelectedOptions);
      }
    } catch (error) {
      console.error('Error fetching delivery note items:', error);
      setError('Erro ao carregar itens do romaneio');
    }
  }

  async function fetchData() {
    try {
      // Get vehicles and routes first
      const [
        { data: vehiclesData, error: vehiclesError },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('status', 'available'),
      ]);

      if (vehiclesError) throw vehiclesError;

      setVehicles(vehiclesData || []);

      // Get orders that are approved and not in any delivery note or are in the current delivery note
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          number,
          customer:customers!sales_orders_customer_id_fkey(razao_social, endereco, bairro, cidade, estado, cep),
          total_amount,
          payment_method,
          due_date
        `)
        .eq('status', 'approved') // Changed from 'completed' to 'approved'
        .order('created_at', { ascending: false });

      // If editing, include orders from current delivery note
      if (deliveryNote?.id) {
        const { data: existingItems } = await supabase
          .from('delivery_note_items')
          .select('order_id')
          .eq('delivery_note_id', deliveryNote.id);

        const includedOrderIds = existingItems?.map(item => item.order_id) || [];
        
        // Get orders that are either not in any delivery note or are in the current one
        const { data: otherDeliveryItems } = await supabase
          .from('delivery_note_items')
          .select('order_id')
          .not('delivery_note_id', 'eq', deliveryNote.id);
        
        const excludedOrderIds = otherDeliveryItems?.map(item => item.order_id) || [];
        const filteredExcludedOrderIds = excludedOrderIds.filter(id => !includedOrderIds.includes(id));
        
        if (filteredExcludedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${filteredExcludedOrderIds.join(',')})`);
        }
      } else {
        // For new delivery notes, exclude orders that are already in other delivery notes
        const { data: existingItems } = await supabase
          .from('delivery_note_items')
          .select('order_id');

        const excludedOrderIds = existingItems?.map(item => item.order_id) || [];
        
        if (excludedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${excludedOrderIds.join(',')})`);
        }
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      
      // Get all orders to get their display numbers
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('sales_orders')
        .select('id, number')
        .order('created_at', { ascending: false });
        
      if (allOrdersError) throw allOrdersError;
      
      // Create a map of order IDs to their display numbers (sequential numbers)
      const orderDisplayMap = new Map();
      allOrders?.forEach((order, index) => {
        orderDisplayMap.set(order.id, (allOrders.length - index).toString());
      });
      
      // Add display numbers to the orders
      const ordersWithDisplayNumbers = ordersData?.map(order => ({
        ...order,
        displayNumber: orderDisplayMap.get(order.id) || order.number
      })) || [];
      
      setOrders(ordersWithDisplayNumbers);
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
      order_id: '',
      delivery_sequence: items.length + 1,
      payment_method: '',
      due_date: '',
      selectedDueDateOption: '',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    // Update delivery sequence
    setItems(newItems.map((item, i) => ({
      ...item,
      delivery_sequence: i + 1
    })));

    // Also remove from selectedDueDateOption
    const newSelectedOptions = { ...selectedDueDateOption };
    delete newSelectedOptions[index];
    setSelectedDueDateOption(newSelectedOptions);
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // If order_id changes, pre-fill payment method and address if available
   if (field === 'order_id' && value) {
    const selectedOrder = orders.find(order => order.id === value);
    if (selectedOrder) {
      const street = extractStreetName(selectedOrder.customer.endereco || '');
      const number = extractStreetNumber(selectedOrder.customer.endereco || '');

      newItems[index] = {
        ...newItems[index],
        payment_method: selectedOrder.payment_method || '',
        due_date: selectedOrder.due_date || '',
        delivery_address: selectedOrder.customer.endereco || '',
        delivery_address_street: street,
        delivery_address_number: number,
        delivery_address_complement: '',
        delivery_address_neighborhood: selectedOrder.customer.bairro || '',
        delivery_address_city: selectedOrder.customer.cidade || '',
        delivery_address_state: selectedOrder.customer.estado || '',
      };
    }
  }
    
    setItems(newItems);

    // Update showDueDateOptions when payment method changes
    if (field === 'payment_method') {
      setShowDueDateOptions(prev => ({
        ...prev,
        [index]: value === 'boleto'
      }));

      // Clear due date if payment method is not boleto
      if (value !== 'boleto') {
        newItems[index].due_date = '';
        newItems[index].selectedDueDateOption = '';
        const newSelectedOptions = { ...selectedDueDateOption };
        delete newSelectedOptions[index];
        setSelectedDueDateOption(newSelectedOptions);
      }
    }
  };

  function extractStreetName(address: string): string {
  if (!address) return '';
  const match = address.match(/(.*?)\s*\d+\s*$/);
  return match ? match[1].trim() : address;
}

function extractStreetNumber(address: string): string {
  if (!address) return '';
  const match = address.match(/(\d+)\s*$/);
  return match ? match[1] : '';
}



  const setDueDate = (index: number, days: number, option: string) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const formattedDate = date.toISOString().split('T')[0];
    
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      due_date: formattedDate,
      selectedDueDateOption: option
    };
    setItems(newItems);
    
    // Set the selected option
    setSelectedDueDateOption({
      ...selectedDueDateOption,
      [index]: option
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.vehicle_id) {
        throw new Error('Veículo é obrigatório');
      }

      // Validate items
      if (!items.length || items.some(item => !item.order_id)) {
        throw new Error('Todos os itens devem ter um pedido selecionado');
      }

      // Get next delivery note number if not provided
      if (!formData.number) {
        const { data: numberData } = await supabase.rpc('get_next_delivery_note_number');
        formData.number = numberData;
      }

      // Create or update delivery note
      const noteData = {
  ...formData,
  emitted_at: new Date().toISOString(), // <-- adiciona hora exata
  created_by: (await supabase.auth.getUser()).data.user?.id
};

      let deliveryNoteId;
      if (deliveryNote?.id) {
        // Delete existing items first
        await supabase
          .from('delivery_note_items')
          .delete()
          .eq('delivery_note_id', deliveryNote.id);

        const { error: updateError } = await supabase
          .from('delivery_notes')
          .update(noteData)
          .eq('id', deliveryNote.id);
        if (updateError) throw updateError;
        deliveryNoteId = deliveryNote.id;
      } else {
        const { data: note, error: insertError } = await supabase
          .from('delivery_notes')
          .insert([noteData])
          .select()
          .single();
        if (insertError) throw insertError;
        deliveryNoteId = note.id;
      }

      // Create delivery note items
      const { error: itemsError } = await supabase
        .from('delivery_note_items')
        .insert(
          items.map(item => ({
            delivery_note_id: deliveryNoteId,
            order_id: item.order_id,
            delivery_sequence: item.delivery_sequence,
            delivery_address: item.delivery_address,
            delivery_address_street: item.delivery_address_street,
            delivery_address_number: item.delivery_address_number,
            delivery_address_complement: item.delivery_address_complement,
            delivery_address_neighborhood: item.delivery_address_neighborhood,
            delivery_address_city: item.delivery_address_city,
            delivery_address_state: item.delivery_address_state,
            delivery_address_notes: item.delivery_address_notes,
            "selectedDueDateOption": item.selectedDueDateOption
          }))
        );

      if (itemsError) throw itemsError;

      // Update payment method for each order if provided
      for (const item of items) {
        if (item.payment_method) {
          const { error: updateError } = await supabase
            .from('sales_orders')
            .update({ 
              payment_method: item.payment_method,
              due_date: item.due_date || null
            })
            .eq('id', item.order_id);
            
          if (updateError) {
            console.error('Error updating payment method:', updateError);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar romaneio:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar romaneio');
    } finally {
      setSaving(false);
    }
  };

  // Payment method options
  const paymentMethods = [
    { value: '', label: 'Selecione uma forma de pagamento' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'boleto', label: 'Boleto Bancário' },
    { value: 'transferencia', label: 'Transferência Bancária' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'prazo', label: 'A Prazo' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {deliveryNote ? 'Editar Romaneio' : 'Criar Romaneio'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                placeholder="Gerado automaticamente"
                disabled={!!deliveryNote}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Veículo *
              </label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ajudante
              </label>
              <input
                type="text"
                value={formData.helper_name}
                onChange={(e) => setFormData({ ...formData, helper_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                placeholder="Nome do ajudante"
              />
            </div>
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Pedidos</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center px-3 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pedido
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700">
                      Pedido *
                    </label>
                    <select
                      required
                      value={item.order_id}
                      onChange={(e) => updateItem(index, 'order_id', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    >
                      <option value="">Selecione um pedido</option>
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.displayNumber || order.number} - {order.customer.razao_social} (R$ {order.total_amount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Forma de Pagamento
                    </label>
                    <select
                      value={item.payment_method || ''}
                      onChange={(e) => updateItem(index, 'payment_method', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Vencimento
                    </label>
                    <input
                      type="date"
                      value={item.due_date || ''}
                      onChange={(e) => updateItem(index, 'due_date', e.target.value)}
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

                {/* Due Date Options for Boleto */}
                {showDueDateOptions[index] && (
                  <div className="bg-gray-50 p-4 rounded-lg mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Opções de Vencimento
                    </label>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setDueDate(index, 7, '7days')}
                        className={`px-4 py-2 rounded-lg border ${
                          selectedDueDateOption[index] === '7days'
                            ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        7 dias ({new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDueDate(index, 7, '7-14days')}
                        className={`px-4 py-2 rounded-lg border ${
                          selectedDueDateOption[index] === '7-14days'
                            ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        7/14 dias (Primeira parcela: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()})
                      </button>
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      {item.due_date && (
                        <p>Data de vencimento selecionada: {new Date(item.due_date).toLocaleDateString()}</p>
                      )}
                      {item.due_date && selectedDueDateOption[index] === '7-14days' && (
                        <p className="mt-1 italic">
                          Opção 7/14 dias: A segunda parcela vencerá em {new Date(new Date(item.due_date).setDate(new Date(item.due_date).getDate() + 7)).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Address fields */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Endereço de Entrega</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Rua
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_street || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_street', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Rua"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Número
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_number || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_number', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Número"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_complement || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_complement', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Complemento"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_neighborhood || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_neighborhood', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Bairro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_city || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_city', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={item.delivery_address_state || ''}
                        onChange={(e) => updateItem(index, 'delivery_address_state', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                        placeholder="Estado"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Observações de Entrega
                    </label>
                    <textarea
                      value={item.delivery_address_notes || ''}
                      onChange={(e) => updateItem(index, 'delivery_address_notes', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                      rows={2}
                      placeholder="Instruções para entrega, pontos de referência, etc."
                    />
                  </div>
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
              {saving ? 'Salvando...' : 'Salvar Romaneio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}