import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle?: {
    id: string;
    plate: string;
    model: string;
  };
}

export function MaintenanceModal({ isOpen, onClose, onSuccess, vehicle }: MaintenanceModalProps) {
  const [formData, setFormData] = useState({
    maintenance_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    maintenance_type: '',
    description: '',
    cost: 0,
    service_provider: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create maintenance record
      const { error: maintenanceError } = await supabase
        .from('vehicle_maintenance_records')
        .insert([{
          vehicle_id: vehicle.id,
          ...formData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }]);

      if (maintenanceError) throw maintenanceError;

      // Update vehicle status and maintenance dates
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          status: 'maintenance',
          last_maintenance: formData.maintenance_date,
          next_maintenance: new Date(new Date(formData.maintenance_date).getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString(),
        })
        .eq('id', vehicle.id);

      if (vehicleError) throw vehicleError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Registrar Manutenção - {vehicle.plate}
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
              Data da Manutenção
            </label>
            <input
              type="date"
              required
              value={formData.maintenance_date}
              onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Manutenção
            </label>
            <select
              required
              value={formData.maintenance_type}
              onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
            >
              <option value="">Selecione o tipo</option>
              <option value="preventive">Preventiva</option>
              <option value="corrective">Corretiva</option>
              <option value="emergency">Emergencial</option>
              <option value="inspection">Vistoria</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custo (R$)
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prestador de Serviço
            </label>
            <input
              type="text"
              required
              value={formData.service_provider}
              onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FF8A00] hover:bg-[#FF8A00]/90 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Registrar Manutenção'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}