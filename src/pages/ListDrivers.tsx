import React, { useState, useEffect } from 'react';
import { UserSquare2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AvailableDriversModal } from '../components/AvailableDriversModal';

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  driver_status: string;
  vehicle?: {
    plate: string;
    model: string;
  };
}

function ListDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      // Get all drivers from profiles table
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name');

      if (driversError) throw driversError;

      // Then get their vehicle assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('driver_vehicles')
        .select(`
          driver_id,
          vehicle:vehicles (
            id,
            plate,
            model,
            brand,
            year,
            capacity
          )
        `)
        .eq('status', 'active');

      if (assignmentsError) throw assignmentsError;

      // Combine the data
      const driversWithVehicles = driversData.map(driver => ({
        ...driver,
        vehicle: assignments?.find(a => a.driver_id === driver.id)?.vehicle,
      }));

      setDrivers(driversWithVehicles);
      
      // Filter available drivers for the modal
      const available = driversWithVehicles.filter(
        driver => driver.driver_status === 'available'
      );
      setAvailableDrivers(available);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'on_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'off_duty':
        return 'bg-gray-100 text-gray-800';
      case 'vacation':
        return 'bg-yellow-100 text-yellow-800';
      case 'sick_leave':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'on_delivery':
        return 'Em Entrega';
      case 'off_duty':
        return 'Fora de Serviço';
      case 'vacation':
        return 'Férias';
      case 'sick_leave':
        return 'Licença Médica';
      default:
        return status || 'Não definido';
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <UserSquare2 className="h-5 w-5 mr-2" />
          Ver Motoristas Disponíveis
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar motoristas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-[#FF8A00] focus:border-[#FF8A00]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CNH
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veículo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum motorista encontrado.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <UserSquare2 className="h-10 w-10 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {driver.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver.license_number || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver.license_category || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(driver.driver_status)}`}>
                        {getStatusText(driver.driver_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver.vehicle ? (
                        <div>
                          {driver.vehicle.plate} - {driver.vehicle.model}
                        </div>
                      ) : (
                        <span className="text-gray-400">Não atribuído</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AvailableDriversModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        drivers={availableDrivers}
      />
    </div>
  );
}

export default ListDrivers;