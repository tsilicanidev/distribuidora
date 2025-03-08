import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validators } from '../utils/validation';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle?: {
    id: string;
    plate: string;
    model: string;
    brand: string;
    year: number;
    capacity: number;
    status: string;
  };
}

export function VehicleModal({ isOpen, onClose, onSuccess, vehicle }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    plate: vehicle?.plate || '',
    model: vehicle?.model || '',
    brand: vehicle?.brand || '',
    year: vehicle?.year || new Date().getFullYear(),
    capacity: vehicle?.capacity || 0,
    status: vehicle?.status || 'available',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate license plate
      if (!validators.licensePlate(formData.plate)) {
        throw new Error('Placa inválida. Use o formato AAA9A99');
      }

      if (vehicle?.id) {
        // Update existing vehicle
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(formData)
          .eq('id', vehicle.id);

        if (updateError) throw updateError;
      } else {
        // Create new vehicle
        const { error: insertError } = await supabase
          .from('vehicles')
          .insert([formData]);

        if (insertError) throw insertError;
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
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {vehicle ? 'Editar Veículo' : 'Adicionar Novo Veículo'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Placa *
            </label>
            <input
              type="text"
              required
              value={formData.plate}
              onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
              placeholder="AAA9A99"
              maxLength={7}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Marca *
            </label>
            <input
              type="text"
              required
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Modelo *
            </label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ano *
            </label>
            <input
              type="number"
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.year || ''}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Capacidade (kg) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            >
              <option value="available">Disponível</option>
              <option value="maintenance">Em Manutenção</option>
              <option value="in_use">Em Uso</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
              {loading ? 'Salvando...' : 'Salvar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}