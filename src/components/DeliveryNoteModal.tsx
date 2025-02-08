{/* Conteúdo do arquivo com traduções */}
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

interface Driver {
  id: string;
  full_name: string;
}

interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
    endereco: string;
  };
}

interface Product {
  id: string;
  name: string;
  weight: number;
  volume: number;
}

interface DeliveryNoteItem {
  order_id: string;
  product_id: string;
  quantity: number;
  weight: number;
  volume: number;
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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    route_id: '',
    driver_id: '',
    helper_id: '',
    notes: '',
  });

  const [items, setItems] = useState<DeliveryNoteItem[]>([{
    order_id: '',
    product_id: '',
    quantity: 1,
    weight: 0,
    volume: 0,
    delivery_sequence: 1,
  }]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  async function fetchData() {
    try {
      const [
        { data: vehiclesData },
        { data: routesData },
        { data: driversData },
        { data: ordersData },
        { data: productsData },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('status', 'available'),
        supabase.from('delivery_routes').select('*'),
        supabase.from('profiles').select('*').in('role', ['driver', 'helper']),
        supabase.from('orders').select('*, customer:customers(razao_social, endereco)').eq('status', 'pending'),
        supabase.from('products').select('*'),
      ]);

      setVehicles(vehiclesData || []);
      setRoutes(routesData || []);
      setDrivers(driversData || []);
      setOrders(ordersData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const addItem = () => {
    setItems([...items, {
      order_id: '',
      product_id: '',
      quantity: 1,
      weight: 0,
      volume: 0,
      delivery_sequence: items.length + 1,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    // Atualiza a sequência de entrega para os itens restantes
    setItems(prev => prev.map((item, i) => ({
      ...item,
      delivery_sequence: i + 1,
    })));
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    // Atualiza peso e volume se o produto mudar
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].weight = product.weight * newItems[index].quantity;
        newItems[index].volume = product.volume * newItems[index].quantity;
      }
    }

    // Atualiza peso e volume se a quantidade mudar
    if (field === 'quantity') {
      const product = products.find(p => p.id === newItems[index].product_id);
      if (product) {
        newItems[index].weight = product.weight * value;
        newItems[index].volume = product.volume * value;
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Insere romaneio
      const { data: note, error: noteError } = await supabase
        .from('delivery_notes')
        .insert([{
          ...formData,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (noteError) throw noteError;

      // Insere itens do romaneio
      const { error: itemsError } = await supabase
        .from('delivery_note_items')
        .insert(
          items.map(item => ({
            delivery_note_id: note.id,
            ...item,
          }))
        );

      if (itemsError) throw itemsError;

      // Atualiza status do veículo
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'in_use' })
        .eq('id', formData.vehicle_id);

      if (vehicleError) throw vehicleError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar romaneio:', error);
      alert('Erro ao salvar romaneio. Por favor, tente novamente.');
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número *
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Motorista *
              </label>
              <select
                required
                value={formData.driver_id}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um motorista</option>
                {drivers.filter(d => d.role === 'driver').map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ajudante
              </label>
              <select
                value={formData.helper_id}
                onChange={(e) => setFormData({ ...formData, helper_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um ajudante</option>
                {drivers.filter(d => d.role === 'helper').map((helper) => (
                  <option key={helper.id} value={helper.id}>
                    {helper.full_name}
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
                <div className="col-span-3">
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
                        {order.number} - {order.customer.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
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
                        {product.name}
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
                    Sequência *
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
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8A00]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FF8A00] hover:bg-[#FF8A00]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8A00] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Romaneio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}