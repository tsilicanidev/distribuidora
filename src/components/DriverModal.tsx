import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validators } from '../utils/validation';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacity: number;
}

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: {
    id: string;
    full_name: string;
    license_number: string;
    license_category: string;
    license_expiry: string;
    driver_status: string;
    vehicle?: Vehicle;
  };
}

export function DriverModal({ isOpen, onClose, onSuccess, driver }: DriverModalProps) {
  const [formData, setFormData] = useState({
    full_name: driver?.full_name || '',
    license_number: driver?.license_number || '',
    license_category: driver?.license_category || '',
    license_expiry: driver?.license_expiry?.split('T')[0] || new Date().toISOString().split('T')[0],
    driver_status: driver?.driver_status || 'available',
    // Vehicle data
    plate: driver?.vehicle?.plate || '',
    model: driver?.vehicle?.model || '',
    brand: driver?.vehicle?.brand || '',
    year: driver?.vehicle?.year || new Date().getFullYear(),
    capacity: driver?.vehicle?.capacity || 1000, // Default capacity of 1000kg
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate license plate if provided
      if (formData.plate && !validators.licensePlate(formData.plate)) {
        throw new Error('Placa inválida. Use o formato AAA9A99');
      }

      // Validate capacity
      if (formData.capacity <= 0) {
        throw new Error('A capacidade do veículo deve ser maior que 0');
      }

      if (driver?.id) {
        // Update existing driver
        const { error: driverError } = await supabase
          .from('drivers')
          .update({
            full_name: formData.full_name,
            license_number: formData.license_number,
            license_category: formData.license_category,
            license_expiry: formData.license_expiry,
            driver_status: formData.driver_status,
          })
          .eq('id', driver.id);

        if (driverError) throw driverError;

        // Update or create vehicle
        if (formData.plate) {
          const vehicleData = {
            plate: formData.plate,
            model: formData.model,
            brand: formData.brand,
            year: formData.year,
            capacity: formData.capacity,
            status: 'available',
          };

          if (driver.vehicle?.id) {
            // Update existing vehicle
            const { error: vehicleError } = await supabase
              .from('vehicles')
              .update(vehicleData)
              .eq('id', driver.vehicle.id);

            if (vehicleError) throw vehicleError;
          } else {
            // Create new vehicle
            const { data: vehicle, error: vehicleError } = await supabase
              .from('vehicles')
              .insert([vehicleData])
              .select()
              .single();

            if (vehicleError) throw vehicleError;

            // Create vehicle assignment
            if (vehicle) {
              const { error: assignmentError } = await supabase
                .from('driver_vehicles')
                .insert([{
                  driver_id: driver.id,
                  vehicle_id: vehicle.id,
                  start_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
                  status: 'active',
                }]);

              if (assignmentError) throw assignmentError;
            }
          }
        }
      } else {
        // Create new driver
        const { data: newDriver, error: driverError } = await supabase
          .from('drivers')
          .insert([{
            full_name: formData.full_name,
            license_number: formData.license_number,
            license_category: formData.license_category,
            license_expiry: formData.license_expiry,
            driver_status: formData.driver_status,
          }])
          .select()
          .single();

        if (driverError) throw driverError;

        // Create vehicle if plate is provided
        if (newDriver && formData.plate) {
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert([{
              plate: formData.plate,
              model: formData.model,
              brand: formData.brand,
              year: formData.year,
              capacity: formData.capacity,
              status: 'available',
            }])
            .select()
            .single();

          if (vehicleError) throw vehicleError;

          // Create vehicle assignment
          if (vehicle) {
            const { error: assignmentError } = await supabase
              .from('driver_vehicles')
              .insert([{
                driver_id: newDriver.id,
                vehicle_id: vehicle.id,
                start_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
                status: 'active',
              }]);

            if (assignmentError) throw assignmentError;
          }
        }
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
      <div className="bg-white rounded-lg w-full max-w-4xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {driver ? 'Editar Motorista' : 'Adicionar Novo Motorista'}
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
            {/* Driver Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações do Motorista</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número da CNH *
                </label>
                <input
                  type="text"
                  required
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Categoria da CNH *
                </label>
                <select
                  required
                  value={formData.license_category}
                  onChange={(e) => setFormData({ ...formData, license_category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                >
                  <option value="">Selecione a categoria</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Validade da CNH *
                </label>
                <input
                  type="date"
                  required
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  required
                  value={formData.driver_status}
                  onChange={(e) => setFormData({ ...formData, driver_status: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                >
                  <option value="available">Disponível</option>
                  <option value="on_delivery">Em Entrega</option>
                  <option value="off_duty">Fora de Serviço</option>
                  <option value="vacation">Férias</option>
                  <option value="sick_leave">Licença Médica</option>
                </select>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações do Veículo</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Placa
                </label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="AAA9A99"
                  maxLength={7}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Marca
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ano
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Capacidade (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1000 })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>
            </div>
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
              {loading ? 'Salvando...' : 'Salvar Motorista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}