import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  sequence: number;
}

interface DeliveryRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  route?: {
    id: string;
    name: string;
    description: string;
    addresses: Address[];
  };
}

export function DeliveryRouteModal({ isOpen, onClose, onSuccess, route }: DeliveryRouteModalProps) {
  const [formData, setFormData] = useState({
    name: route?.name || '',
    description: route?.description || '',
  });

  const [addresses, setAddresses] = useState<Address[]>(
    route?.addresses || [{
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      sequence: 1
    }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAddress = () => {
    setAddresses([...addresses, {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      sequence: addresses.length + 1
    }]);
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
    // Update sequence numbers
    setAddresses(prev => prev.map((addr, i) => ({
      ...addr,
      sequence: i + 1
    })));
  };

  const updateAddress = (index: number, field: keyof Address, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value
    };
    setAddresses(newAddresses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const routeData = {
        ...formData,
        addresses: addresses.map(addr => ({
          ...addr,
          full_address: `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`
        }))
      };

      if (route?.id) {
        const { error } = await supabase
          .from('delivery_routes')
          .update(routeData)
          .eq('id', route.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_routes')
          .insert([routeData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {route ? 'Editar Rota' : 'Criar Nova Rota'}
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
                Nome da Rota *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Endereços da Rota</h3>
              <button
                type="button"
                onClick={addAddress}
                className="flex items-center px-3 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Endereço
              </button>
            </div>

            {addresses.map((address, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">
                    Endereço {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeAddress(index)}
                    className="text-red-600 hover:text-red-800"
                    disabled={addresses.length === 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rua *
                    </label>
                    <input
                      type="text"
                      required
                      value={address.street}
                      onChange={(e) => updateAddress(index, 'street', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      value={address.number}
                      onChange={(e) => updateAddress(index, 'number', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={address.complement}
                      onChange={(e) => updateAddress(index, 'complement', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      required
                      value={address.neighborhood}
                      onChange={(e) => updateAddress(index, 'neighborhood', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={(e) => updateAddress(index, 'city', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estado *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={address.state}
                      onChange={(e) => updateAddress(index, 'state', e.target.value.toUpperCase())}
                      className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
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
              disabled={loading}
              className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}