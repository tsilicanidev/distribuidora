import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Truck, FileText, FileInput } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DeliveryNoteModal } from '../components/DeliveryNoteModal';

interface DeliveryNote {
  id: string;
  number: string;
  date: string;
  vehicle: {
    plate: string;
    model: string;
  };
  route: {
    name: string;
  };
  driver: {
    full_name: string;
  };
  status: string;
  total_weight: number;
  total_volume: number;
  created_at: string;
  fiscal_invoices: {
    id: string;
    number: string;
  }[];
}

export function DeliveryNotes() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | undefined>();

  useEffect(() => {
    fetchDeliveryNotes();
  }, []);

  async function fetchDeliveryNotes() {
    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          vehicle:vehicles(plate, model),
          route:delivery_routes(name),
          driver:profiles!delivery_notes_driver_id_fkey(full_name),
          fiscal_invoices(id, number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveryNotes(data || []);
    } catch (error) {
      console.error('Erro ao buscar romaneios:', error);
    } finally {
      setLoading(false);
    }
  }

  const generateInvoice = async (id: string) => {
    try {
      const { data, error } = await supabase
        .rpc('generate_fiscal_invoice', {
          delivery_note_id: id
        });

      if (error) throw error;

      alert('Nota fiscal gerada com sucesso!');
      fetchDeliveryNotes();
    } catch (error) {
      console.error('Erro ao gerar nota fiscal:', error);
      alert('Erro ao gerar nota fiscal. Por favor, tente novamente.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'RASCUNHO';
      case 'pending':
        return 'PENDENTE';
      case 'in_progress':
        return 'EM ANDAMENTO';
      case 'completed':
        return 'CONCLUÍDO';
      case 'cancelled':
        return 'CANCELADO';
      default:
        return status.toUpperCase();
    }
  };

  const handleEdit = (note: DeliveryNote) => {
    setSelectedNote(note);
    setShowModal(true);
  };

  const printDeliveryNote = (id: string) => {
    console.log('Imprimindo romaneio:', id);
  };

  const filteredNotes = deliveryNotes.filter(note =>
    note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.driver.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Romaneios</h1>
        <button
          onClick={() => {
            setSelectedNote(undefined);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Criar Romaneio
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar romaneios..."
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
                  Número/Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veículo/Rota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motorista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Totais
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {note.number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(note.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {note.vehicle.plate} - {note.vehicle.model}
                    </div>
                    <div className="text-sm text-gray-500">
                      {note.route.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {note.driver.full_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Peso: {note.total_weight.toFixed(2)} kg
                    </div>
                    <div className="text-sm text-gray-500">
                      Volume: {note.total_volume.toFixed(2)} m³
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => printDeliveryNote(note.id)}
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      title="Imprimir"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                    {note.status === 'completed' && note.fiscal_invoices.length === 0 && (
                      <button
                        onClick={() => generateInvoice(note.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Gerar Nota Fiscal"
                      >
                        <FileInput className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(note)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Editar"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    {note.status === 'pending' && (
                      <button
                        className="text-green-600 hover:text-green-900"
                        title="Iniciar Entrega"
                      >
                        <Truck className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeliveryNoteModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedNote(undefined);
        }}
        onSuccess={fetchDeliveryNotes}
        deliveryNote={selectedNote}
      />
    </div>
  );
}