import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserSquare2, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DriverModal } from '../components/DriverModal';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacity: number;
}

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  driver_status: string;
  created_at: string;
  vehicle?: Vehicle;
}

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | undefined>();

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      // First get all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
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
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este motorista?')) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDrivers();
    } catch (error) {
      console.error('Erro ao excluir motorista:', error);
    }
  };

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
        return status;
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
        <button
          onClick={() => {
            setSelectedDriver(undefined);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Motorista
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
                  Validade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrivers.map((driver) => (
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
                        <div className="text-sm text-gray-500">
                          Categoria: {driver.license_category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {driver.license_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {driver.license_expiry && new Date(driver.license_expiry).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(driver.driver_status)}`}>
                      {getStatusText(driver.driver_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {driver.vehicle ? (
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {driver.vehicle.plate}
                          </div>
                          <div className="text-sm text-gray-500">
                            {driver.vehicle.brand} {driver.vehicle.model}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Não atribuído</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setShowModal(true);
                      }}
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(driver.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DriverModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedDriver(undefined);
        }}
        onSuccess={fetchDrivers}
        driver={selectedDriver}
      />
    </div>
  );
}