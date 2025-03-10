import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, FileText, FileInput } from 'lucide-react';
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
  status: string;
  created_at: string;
}

export function DeliveryNotes() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | undefined>();
  const [error, setError] = useState<string | null>(null);

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
          route:delivery_routes(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveryNotes(data || []);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar romaneios:', error);
      setError('Erro ao carregar romaneios. Por favor, tente novamente.');
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

  const printDeliveryNote = async (id: string) => {
    try {
      // Fetch complete delivery note data
      const { data: note, error: noteError } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          vehicle:vehicles(plate, model),
          route:delivery_routes(name),
          items:delivery_note_items(
            delivery_sequence,
            order:sales_orders(
              number,
              customer:customers(
                razao_social,
                endereco,
                bairro,
                cidade,
                estado
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (noteError) throw noteError;

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita popups para imprimir o romaneio.');
        return;
      }

      // Generate HTML content
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Romaneio ${note.number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }
            .info-item {
              padding: 5px;
            }
            .info-label {
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
            }
            .signature-line {
              margin-top: 100px;
              border-top: 1px solid #333;
              width: 200px;
              display: inline-block;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ROMANEIO DE ENTREGA</h1>
            <h2>Nº ${note.number}</h2>
          </div>

          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Data:</span>
                <span>${new Date(note.date).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span>${getStatusText(note.status)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Veículo:</span>
                <span>${note.vehicle.plate} - ${note.vehicle.model}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Rota:</span>
                <span>${note.route.name}</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <h3>Entregas</h3>
            <table>
              <thead>
                <tr>
                  <th>Seq.</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Endereço</th>
                </tr>
              </thead>
              <tbody>
                ${note.items
                  .sort((a, b) => a.delivery_sequence - b.delivery_sequence)
                  .map(item => `
                    <tr>
                      <td>${item.delivery_sequence}</td>
                      <td>${item.order.number}</td>
                      <td>${item.order.customer.razao_social}</td>
                      <td>
                        ${item.order.customer.endereco}, 
                        ${item.order.customer.bairro}, 
                        ${item.order.customer.cidade} - 
                        ${item.order.customer.estado}
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>

          <div class="info-section">
            <p><strong>Observações:</strong></p>
            <p>${note.notes || 'Nenhuma observação'}</p>
          </div>

          <div class="footer">
            <div class="signature-line">
              <p>Assinatura do Motorista</p>
            </div>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #FF8A00; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Imprimir Romaneio
            </button>
          </div>
        </body>
        </html>
      `;

      // Write content to print window
      printWindow.document.write(content);
      printWindow.document.close();
    } catch (error) {
      console.error('Erro ao imprimir romaneio:', error);
      alert('Erro ao gerar impressão do romaneio. Por favor, tente novamente.');
    }
  };

  const filteredNotes = deliveryNotes.filter(note =>
    note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.route?.name.toLowerCase().includes(searchTerm.toLowerCase())
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
          {error}
        </div>
      )}

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
                  Status
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
                      {note.vehicle?.plate} - {note.vehicle?.model}
                    </div>
                    <div className="text-sm text-gray-500">
                      {note.route?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => printDeliveryNote(note.id)}
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      title="Imprimir"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                    {note.status === 'completed' && (
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
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
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

export default DeliveryNotes;