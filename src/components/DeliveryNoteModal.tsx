import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

interface Route {
  id: string;
  name: string;
}

interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
    endereco: string;
  };
  total_amount: number;
}

interface DeliveryNoteItem {
  order_id: string;
  delivery_sequence: number;
}

interface DeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deliveryNote?: any;
}

export function DeliveryNoteModal({ isOpen, onClose, onSuccess, deliveryNote }: DeliveryNoteModalProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    route_id: '',
    notes: '',
  });

  const [items, setItems] = useState<DeliveryNoteItem[]>([{
    order_id: '',
    delivery_sequence: 1,
  }]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (deliveryNote) {
        setFormData({
          number: deliveryNote.number,
          date: deliveryNote.date,
          vehicle_id: deliveryNote.vehicle_id,
          route_id: deliveryNote.route_id,
          notes: deliveryNote.notes || '',
        });
        // Load delivery note items if editing
        if (deliveryNote.items) {
          setItems(deliveryNote.items.map((item: any) => ({
            order_id: item.order_id,
            delivery_sequence: item.delivery_sequence,
          })));
        }
      } else {
        // Reset form for new delivery note
        setFormData({
          number: '',
          date: new Date().toISOString().split('T')[0],
          vehicle_id: '',
          route_id: '',
          notes: '',
        });
        setItems([{
          order_id: '',
          delivery_sequence: 1,
        }]);
      }
    }
  }, [isOpen, deliveryNote]);

  async function fetchData() {
    try {
      // Get vehicles and routes first
      const [
        { data: vehiclesData, error: vehiclesError },
        { data: routesData, error: routesError }
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('status', 'available'),
        supabase.from('delivery_routes').select('*')
      ]);

      if (vehiclesError) throw vehiclesError;
      if (routesError) throw routesError;

      setVehicles(vehiclesData || []);
      setRoutes(routesData || []);

      // Get orders that are approved and not in any delivery note or are in the current delivery note
      let query = supabase
        .from('sales_orders')
        .select(`
          id,
          number,
          customer:customers(razao_social, endereco),
          total_amount
        `)
        .eq('status', 'approved') // Changed from 'completed' to 'approved'
        .order('created_at', { ascending: false });

      // If editing, include orders from current delivery note
      if (deliveryNote?.id) {
        const { data: existingItems } = await supabase
          .from('delivery_note_items')
          .select('order_id')
          .neq('delivery_note_id', deliveryNote.id);

        const excludedOrderIds = existingItems?.map(item => item.order_id) || [];
        
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
      delivery_sequence: items.length + 1,
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
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.vehicle_id || !formData.route_id) {
        throw new Error('Veículo e rota são obrigatórios');
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
            delivery_sequence: item.delivery_sequence
          }))
        );

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
                Rota *
              </label>
              <select
                required
                value={formData.route_id}
                onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione uma rota</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
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
              <div key={index} className="grid grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4">
                <div className="col-span-10">
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

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Sequência
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.delivery_sequence}
                    onChange={(e) => updateItem(index, 'delivery_sequence', parseInt(e.target.value))}
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