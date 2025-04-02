import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  total_amount: number;
}

interface DeliveryNoteItem {
  order_id: string;
  delivery_address_street?: string;
  delivery_address_number?: string;
  delivery_address_complement?: string;
  delivery_address_neighborhood?: string;
  delivery_address_city?: string;
  delivery_address_state?: string;
  delivery_address_notes?: string;
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
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    helper_name: '',
    notes: '',
  });

  const [items, setItems] = useState<DeliveryNoteItem[]>([{
    order_id: '',
    delivery_address_street: '',
    delivery_address_number: '',
    delivery_address_complement: '',
    delivery_address_neighborhood: '',
    delivery_address_city: '',
    delivery_address_state: '',
    delivery_address_notes: '',
  }]);

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
        fetchDeliveryNoteItems(deliveryNote.id);
      } else {
        // Reset form for new delivery note
        setFormData({
          number: '',
          date: new Date().toISOString().split('T')[0],
          vehicle_id: '',
          helper_name: '',
          notes: '',
        });
        setItems([{
          order_id: '',
          delivery_address_street: '',
          delivery_address_number: '',
          delivery_address_complement: '',
          delivery_address_neighborhood: '',
          delivery_address_city: '',
          delivery_address_state: '',
          delivery_address_notes: '',
        }]);
      }
    }
  }, [isOpen, deliveryNote]);

  async function fetchDeliveryNoteItems(deliveryNoteId: string) {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_note_items')
        .select(`
          order_id,
          delivery_address,
          delivery_address_street,
          delivery_address_number,
          delivery_address_complement,
          delivery_address_neighborhood,
          delivery_address_city,
          delivery_address_state,
          delivery_address_notes
        `)
        .eq('delivery_note_id', deliveryNoteId);

      if (itemsError) throw itemsError;

      if (itemsData && itemsData.length > 0) {
        const processedItems = itemsData.map(item => {
          // If we have structured address fields, use them
          if (item.delivery_address_street || item.delivery_address_city) {
            return {
              order_id: item.order_id,
              delivery_address_street: item.delivery_address_street || '',
              delivery_address_number: item.delivery_address_number || '',
              delivery_address_complement: item.delivery_address_complement || '',
              delivery_address_neighborhood: item.delivery_address_neighborhood || '',
              delivery_address_city: item.delivery_address_city || '',
              delivery_address_state: item.delivery_address_state || '',
              delivery_address_notes: item.delivery_address_notes || '',
            };
          } 
          // Otherwise try to parse from delivery_address
          else if (item.delivery_address) {
            try {
              // Try to parse existing address into components
              const addressParts = item.delivery_address.split(',');
              let street = '', number = '', neighborhood = '', city = '', state = '';
              
              if (addressParts.length >= 1) {
                const streetParts = addressParts[0].trim().split(' ');
                // Assume last part is number if it's numeric
                if (streetParts.length > 1 && /^\d+$/.test(streetParts[streetParts.length - 1])) {
                  number = streetParts.pop() || '';
                  street = streetParts.join(' ');
                } else {
                  street = addressParts[0].trim();
                }
              }
              if (addressParts.length >= 2) neighborhood = addressParts[1].trim();
              if (addressParts.length >= 3) {
                const cityState = addressParts[2].trim().split('-');
                city = cityState[0].trim();
                if (cityState.length > 1) state = cityState[1].trim();
              }
              
              return {
                order_id: item.order_id,
                delivery_address_street: street,
                delivery_address_number: number,
                delivery_address_complement: '',
                delivery_address_neighborhood: neighborhood,
                delivery_address_city: city,
                delivery_address_state: state,
                delivery_address_notes: '',
              };
            } catch (e) {
              // If parsing fails, just use the whole string as street
              return {
                order_id: item.order_id,
                delivery_address_street: item.delivery_address,
                delivery_address_number: '',
                delivery_address_complement: '',
                delivery_address_neighborhood: '',
                delivery_address_city: '',
                delivery_address_state: '',
                delivery_address_notes: '',
              };
            }
          } 
          // Fallback to empty fields
          else {
            return {
              order_id: item.order_id,
              delivery_address_street: '',
              delivery_address_number: '',
              delivery_address_complement: '',
              delivery_address_neighborhood: '',
              delivery_address_city: '',
              delivery_address_state: '',
              delivery_address_notes: '',
            };
          }
        });
        
        setItems(processedItems);
      }
    } catch (error) {
      console.error('Error fetching delivery note items:', error);
      setError('Erro ao carregar itens do romaneio');
    }
  }

  async function fetchData() {
    try {
      // Get vehicles first
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Get orders that are approved and not in any delivery note or are in the current delivery note
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          number,
          customer:customers(razao_social, endereco, bairro, cidade, estado),
          total_amount
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
        
        if (excludedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${excludedOrderIds.join(',')})`);
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
      setOrders(ordersData || []);
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
      delivery_address_street: '',
      delivery_address_number: '',
      delivery_address_complement: '',
      delivery_address_neighborhood: '',
      delivery_address_city: '',
      delivery_address_state: '',
      delivery_address_notes: '',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // If order_id changes, pre-fill the delivery address fields with customer address
    if (field === 'order_id' && value) {
      const selectedOrder = orders.find(order => order.id === value);
      if (selectedOrder && selectedOrder.customer) {
        const { endereco, bairro, cidade, estado } = selectedOrder.customer;
        
        // Try to extract street number from address
        let street = endereco;
        let number = '';
        
        // Simple heuristic: if the last part is numeric, it's probably the number
        const parts = endereco.trim().split(' ');
        if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
          number = parts.pop() || '';
          street = parts.join(' ');
        }
        
        newItems[index] = {
          ...newItems[index],
          delivery_address_street: street,
          delivery_address_number: number,
          delivery_address_neighborhood: bairro,
          delivery_address_city: cidade,
          delivery_address_state: estado,
        };
      }
    }
    
    setItems(newItems);
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
        route_id: null, // Set route_id to null since we're not using it anymore
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

      // Process items to create delivery_address string and save structured fields
      const processedItems = items.map(item => {
        // Combine address fields into a single string for backward compatibility
        const addressParts = [];
        if (item.delivery_address_street) {
          let streetNumber = item.delivery_address_street;
          if (item.delivery_address_number) streetNumber += ` ${item.delivery_address_number}`;
          addressParts.push(streetNumber);
        }
        if (item.delivery_address_neighborhood) addressParts.push(item.delivery_address_neighborhood);
        if (item.delivery_address_city) {
          let cityState = item.delivery_address_city;
          if (item.delivery_address_state) cityState += ` - ${item.delivery_address_state}`;
          addressParts.push(cityState);
        }
        
        const deliveryAddress = addressParts.join(', ');
        
        return {
          delivery_note_id: deliveryNoteId,
          order_id: item.order_id,
          delivery_sequence: 0, // We're not using sequence anymore
          delivery_address: deliveryAddress,
          delivery_address_street: item.delivery_address_street,
          delivery_address_number: item.delivery_address_number,
          delivery_address_complement: item.delivery_address_complement,
          delivery_address_neighborhood: item.delivery_address_neighborhood,
          delivery_address_city: item.delivery_address_city,
          delivery_address_state: item.delivery_address_state,
          delivery_address_notes: item.delivery_address_notes
        };
      });

      // Create delivery note items
      const { error: itemsError } = await supabase
        .from('delivery_note_items')
        .insert(processedItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar romaneio:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar romaneio');
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
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">Pedido {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                    disabled={items.length === 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
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
                          {order.number} - {order.customer.razao_social} (R$ {order.total_amount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Endereço de Entrega</h5>
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
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Observação
                        </label>
                        <textarea
                          value={item.delivery_address_notes || ''}
                          onChange={(e) => updateItem(index, 'delivery_address_notes', e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                          placeholder="Observações sobre a entrega"
                          rows={2}
                        />
                      </div>
                    </div>
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