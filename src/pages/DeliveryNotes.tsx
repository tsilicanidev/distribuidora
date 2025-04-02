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
  helper_name: string;
  status: string;
  created_at: string;
}

interface OrderItem {
  product: {
    name: string;
    unit: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  weight?: number;
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
          vehicle:vehicles(plate, model)
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

  const generateDeliveryNotePDF = async (id: string) => {
    try {
      // Fetch complete delivery note data
      const { data: note, error: noteError } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          vehicle:vehicles(plate, model)
        `)
        .eq('id', id)
        .single();

      if (noteError) throw noteError;

      // Fetch delivery note items separately
      const { data: items, error: itemsError } = await supabase
        .from('delivery_note_items')
        .select(`
          order_id,
          delivery_address,
          delivery_address_street,
          delivery_address_number,
          delivery_address_complement,
          delivery_address_neighborhood,
          delivery_address_city,
          delivery_address_state,
          delivery_address_notes
        `)
        .eq('delivery_note_id', id);

      if (itemsError) throw itemsError;

      // Fetch order details for each item
      const orderDetails = [];
      for (const item of items || []) {
        // Get order details
        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            customer:customers(razao_social, endereco, bairro, cidade, estado),
            seller:profiles(full_name),
            total_amount,
            payment_method,
            due_date
          `)
          .eq('id', item.order_id)
          .single();

        if (orderError) throw orderError;
        
        // Get order items
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('sales_order_items')
          .select(`
            product:products(name, unit),
            quantity,
            unit_price,
            total_price
          `)
          .eq('sales_order_id', order.id);
          
        if (orderItemsError) throw orderItemsError;
        
        // Format address from components if available
        let formattedAddress = '';
        if (item.delivery_address_street || item.delivery_address_neighborhood || item.delivery_address_city) {
          const addressParts = [];
          
          // Street and number
          if (item.delivery_address_street) {
            let streetNumber = item.delivery_address_street;
            if (item.delivery_address_number) {
              streetNumber += `, ${item.delivery_address_number}`;
            }
            if (item.delivery_address_complement) {
              streetNumber += ` - ${item.delivery_address_complement}`;
            }
            addressParts.push(streetNumber);
          }
          
          // Neighborhood
          if (item.delivery_address_neighborhood) {
            addressParts.push(item.delivery_address_neighborhood);
          }
          
          // City and state
          if (item.delivery_address_city) {
            let cityState = item.delivery_address_city;
            if (item.delivery_address_state) {
              cityState += ` - ${item.delivery_address_state}`;
            }
            addressParts.push(cityState);
          }
          
          formattedAddress = addressParts.join(', ');
        } else if (item.delivery_address) {
          // Use legacy delivery_address field if available
          formattedAddress = item.delivery_address;
        } else {
          // Fallback to customer address
          formattedAddress = `${order.customer.endereco}, ${order.customer.bairro}, ${order.customer.cidade} - ${order.customer.estado}`;
        }
        
        orderDetails.push({
          order: order,
          items: orderItems || [],
          formattedAddress: formattedAddress,
          notes: item.delivery_address_notes
        });
      }

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita popups para gerar o PDF do romaneio.');
        return;
      }

      // Generate HTML content with two copies
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Romaneio ${note.number}</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 10pt;
            }
            .page {
              width: 100%;
              height: 100%;
              page-break-after: always;
            }
            .delivery-note {
              border: 1px solid #ccc;
              padding: 10px;
              margin-bottom: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 1px solid #333;
              padding-bottom: 5px;
            }
            .header h1 {
              margin: 0;
              font-size: 14pt;
            }
            .header h2 {
              margin: 5px 0;
              font-size: 12pt;
            }
            .info-section {
              margin-bottom: 10px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 5px;
              margin-bottom: 10px;
            }
            .info-item {
              padding: 3px;
            }
            .info-label {
              font-weight: bold;
              font-size: 9pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 9pt;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 4px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .footer {
              margin-top: 15px;
              text-align: center;
            }
            .signature-line {
              margin-top: 30px;
              border-top: 1px solid #333;
              width: 200px;
              display: inline-block;
              text-align: center;
            }
            .delivery-notes {
              font-style: italic;
              color: #666;
              margin-top: 3px;
              font-size: 8pt;
            }
            .copy-label {
              text-align: right;
              font-style: italic;
              font-size: 8pt;
              margin-bottom: 5px;
            }
            .page-break {
              page-break-after: always;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .delivery-note {
                border: 1px solid #ccc;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- First Copy -->
            <div class="copy-label">1ª VIA - EMPRESA</div>
            <div class="delivery-note">
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
                    <span class="info-label">Ajudante:</span>
                    <span>${note.helper_name || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <h3 style="margin: 5px 0; font-size: 11pt;">Entregas</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Endereço de Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderDetails.map(item => `
                      <tr>
                        <td>${item.order.number}</td>
                        <td>${item.order.customer.razao_social}</td>
                        <td>${item.order.seller?.full_name || 'N/A'}</td>
                        <td>
                          ${item.formattedAddress}
                          ${item.notes ? `<div class="delivery-notes">Obs: ${item.notes}</div>` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              ${orderDetails.map((item, index) => `
                <div class="info-section">
                  <h3 style="margin: 5px 0; font-size: 11pt;">Detalhes do Pedido ${item.order.number}</h3>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Cliente:</span>
                      <span>${item.order.customer.razao_social}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Vendedor:</span>
                      <span>${item.order.seller?.full_name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Forma de Pagamento:</span>
                      <span>${item.order.payment_method || 'Não informado'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Data de Vencimento:</span>
                      <span>${item.order.due_date ? new Date(item.order.due_date).toLocaleDateString() : 'Não informado'}</span>
                    </div>
                  </div>
                  
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Unidade</th>
                        <th>Peso</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${item.items.map(orderItem => `
                        <tr>
                          <td>${orderItem.product.name}</td>
                          <td>${orderItem.quantity}</td>
                          <td>${orderItem.product.unit || 'UN'}</td>
                          <td>${orderItem.weight || '-'}</td>
                          <td>R$ ${orderItem.unit_price.toFixed(2)}</td>
                          <td>R$ ${orderItem.total_price.toFixed(2)}</td>
                        </tr>
                      `).join('')}
                      <tr>
                        <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
                        <td><strong>R$ ${item.order.total_amount.toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `).join('')}

              <div class="info-section">
                <p><strong>Observações:</strong></p>
                <p>${note.notes || 'Nenhuma observação'}</p>
              </div>

              <div class="footer">
                <div class="signature-line">
                  <p>Assinatura do Motorista</p>
                </div>
              </div>
            </div>

            <!-- Second Copy -->
            <div class="copy-label">2ª VIA - CLIENTE</div>
            <div class="delivery-note">
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
                    <span class="info-label">Ajudante:</span>
                    <span>${note.helper_name || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <h3 style="margin: 5px 0; font-size: 11pt;">Entregas</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Endereço de Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderDetails.map(item => `
                      <tr>
                        <td>${item.order.number}</td>
                        <td>${item.order.customer.razao_social}</td>
                        <td>${item.order.seller?.full_name || 'N/A'}</td>
                        <td>
                          ${item.formattedAddress}
                          ${item.notes ? `<div class="delivery-notes">Obs: ${item.notes}</div>` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              ${orderDetails.map((item, index) => `
                <div class="info-section">
                  <h3 style="margin: 5px 0; font-size: 11pt;">Detalhes do Pedido ${item.order.number}</h3>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Cliente:</span>
                      <span>${item.order.customer.razao_social}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Vendedor:</span>
                      <span>${item.order.seller?.full_name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Forma de Pagamento:</span>
                      <span>${item.order.payment_method || 'Não informado'}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Data de Vencimento:</span>
                      <span>${item.order.due_date ? new Date(item.order.due_date).toLocaleDateString() : 'Não informado'}</span>
                    </div>
                  </div>
                  
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Unidade</th>
                        <th>Peso</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${item.items.map(orderItem => `
                        <tr>
                          <td>${orderItem.product.name}</td>
                          <td>${orderItem.quantity}</td>
                          <td>${orderItem.product.unit || 'UN'}</td>
                          <td>${orderItem.weight || '-'}</td>
                          <td>R$ ${orderItem.unit_price.toFixed(2)}</td>
                          <td>R$ ${orderItem.total_price.toFixed(2)}</td>
                        </tr>
                      `).join('')}
                      <tr>
                        <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
                        <td><strong>R$ ${item.order.total_amount.toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              `).join('')}

              <div class="info-section">
                <p><strong>Observações:</strong></p>
                <p>${note.notes || 'Nenhuma observação'}</p>
              </div>

              <div class="footer">
                <div class="signature-line">
                  <p>Assinatura do Motorista</p>
                </div>
              </div>
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
      console.error('Erro ao gerar PDF do romaneio:', error);
      alert('Erro ao gerar PDF do romaneio. Por favor, tente novamente.');
    }
  };

  const filteredNotes = deliveryNotes.filter(note =>
    note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.helper_name && note.helper_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                  Veículo/Ajudante
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
                      {note.helper_name || 'Sem ajudante'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => generateDeliveryNotePDF(note.id)}
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      title="Gerar PDF"
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