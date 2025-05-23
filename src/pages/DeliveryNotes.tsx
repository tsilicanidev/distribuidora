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
  customer_name?: string; // Added for customer name
}

interface OrderItem {
  product: {
    name: string;
    unit: string;
    box_weight?: number;
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
      // First get all delivery notes with vehicle info
      const { data: notesData, error: notesError } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          vehicle:vehicles(plate, model)
        `)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // For each delivery note, get the first customer name from its items
      const notesWithCustomers = await Promise.all((notesData || []).map(async (note) => {
        // Get the first delivery note item
        const { data: items, error: itemsError } = await supabase
          .from('delivery_note_items')
          .select(`
            order_id
          `)
          .eq('delivery_note_id', note.id)
          .limit(1);

        if (itemsError || !items || items.length === 0) {
          return { ...note, customer_name: 'N/A' };
        }

        // Get the order with customer info - Fixed the relationship specification
        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .select(`
            customer:customers!sales_orders_customer_id_fkey(razao_social)
          `)
          .eq('id', items[0].order_id)
          .single();

        if (orderError || !order || !order.customer) {
          return { ...note, customer_name: 'N/A' };
        }

        return { ...note, customer_name: order.customer.razao_social };
      }));

      setDeliveryNotes(notesWithCustomers || []);
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
        return 'CONCLUÍDO';
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
          delivery_address_notes,
          "selectedDueDateOption"
        `)
        .eq('delivery_note_id', id);

      if (itemsError) throw itemsError;

      // Fetch order details for each item
      const orderDetails = [];
      for (const item of items || []) {
        // Get order details - Fixed the relationship specification
        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            customer:customers!sales_orders_customer_id_fkey(razao_social, cpf_cnpj, endereco, bairro, cidade, estado),
            seller:profiles(full_name),
            total_amount,
            payment_method,
            due_date
          `)
          .eq('id', item.order_id)
          .single();

        if (orderError) throw orderError;
        
        // Get order items - Fixed the foreign key relationship
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('sales_order_items')
          .select(`
            product:products!sales_order_items_product_id_fkey(name, unit, box_weight),
            quantity,
            unit_price,
            total_price,
            weight
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
          notes: item.delivery_address_notes,
          selectedDueDateOption: item.selectedDueDateOption
        });
      }

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita popups para gerar o PDF do romaneio.');
        return;
      }

      // Format payment method for display
      const formatPaymentMethod = (method: string | null | undefined) => {
        if (!method) return 'Não informado';
        
        const methods: Record<string, string> = {
          'dinheiro': 'Dinheiro',
          'cartao_credito': 'Cartão de Crédito',
          'cartao_debito': 'Cartão de Débito',
          'pix': 'PIX',
          'boleto': 'Boleto Bancário',
          'transferencia': 'Transferência Bancária',
          'cheque': 'Cheque',
          'prazo': 'A Prazo'
        };
        
        return methods[method] || method;
      };

      // Generate HTML content with two copies on the same page
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Romaneio ${note.number}</title>
          <style>
            @page {
  size: A4 portrait;
  margin: 0.3cm;
}

body {
  font-family: Arial, sans-serif;
  font-size: 8pt;
  line-height: 1.2;
  margin: 0;
  padding: 0;
  color: #333;
}

.copies-container {
  display: flex;
  flex-direction: column;
  gap: 0.1cm; /* espaço entre as vias */
  height: 28.7cm; /* total da página menos margens */
  justify-content: space-between;
}

.delivery-note {
  border: 1px solid #ccc;
  padding: 4px;
  margin: 0;
  box-shadow: none;
  border-radius: 4px;
  page-break-inside: avoid;
  flex: 1 1 50%;
}

.header h1 {
  font-size: 13pt;
  margin: 0;
  color: #FF8A00;
}

.header h2 {
  font-size: 10pt;
  margin: 2px 0;
}

.info-section h3 {
  font-size: 9pt;
  color: #FF8A00;
  margin: 4px 0;
}

.info-label {
  font-weight: bold;
  font-size: 8pt;
  color: #555;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  margin-top: 4px;
}

th, td {
  border: 1px solid #ddd;
  padding: 3px;
  text-align: left;
}

.footer {
  text-align: center;
  margin-top: 6px;
}

.signature-line {
  border-top: 1px solid #333;
  width: 140px;
  margin: 0 auto;
  padding-top: 4px;
  font-size: 7pt;
}

.header {
  text-align: center;
  margin-bottom: 8px;
}

.company-info {
  font-weight: bold;
  font-size: 9pt;
  line-height: 1.3;
}

@media print {
  .no-print {
    display: none;
  }


          </style>
        </head>
        <body>
          <div class="page">
            <div class="copies-container">
              <!-- First Copy -->
              <div>
                <div class="copy-label">1ª VIA - EMPRESA</div>
                <div class="delivery-note">
                  <div class="header">
  <div class="company-info">
                      J&P DISTRIBUIDORA DE ALIMENTOS
                      <br>CNPJ: 58.957.775/0001-30
                    </div>
                    <h1>ROMANEIO DE ENTREGA</h1>
                    <h2>Nº ${note.number}</h2>
                  </div>

                  <div class="info-section">
                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">Data:</span>
                        <span>${new Date(note.emitted_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
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
                    <h3>Entregas</h3>
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
                      <div class="order-header">
                        <strong>Pedido ${item.order.number}</strong> - ${item.order.customer.razao_social}
</div>
<div class="info-item">
  <span class="info-label">CNPJ:</span>
  <span>${item.order.customer.cpf_cnpj || 'Não informado'}</span>
                      </div>
                      
                      <div class="info-grid">
                        <div class="info-item">
                          <span class="info-label">Vendedor:</span>
                          <span>${item.order.seller?.full_name || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Total do Pedido:</span>
                          <span>R$ ${item.order.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div class="payment-info">
                        <div class="info-grid">
                          <div class="info-item">
                            <span class="info-label">Forma de Pagamento:</span>
                            <span>${formatPaymentMethod(item.order.payment_method)}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Data de Vencimento:</span>
                            <span>${item.order.due_date ? new Date(item.order.due_date).toLocaleDateString() : 'Não informado'}</span>
                            ${item.order.payment_method === 'boleto' && item.order.due_date && item.selectedDueDateOption === '7-14days' ? `
                              <div class="delivery-notes">
                                Segunda parcela: ${new Date(new Date(item.order.due_date).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <table>
                        <thead>
                          <tr>
                            <th>Produto</th>
                            <th style="width: 35px; text-align: center;">Qtd</th>
                            <th style="width: 35px; text-align: center;">Unid.</th>
                            <th style="width: 35px; text-align: center;">Caixas</th>
                            <th style="width: 35px; text-align: center;">Peso/Caixa</th>
                            <th style="width: 35px; text-align: center;">Peso Total</th>
                            <th style="width: 50px; text-align: right;">V.Unit</th>
                            <th style="width: 50px; text-align: right;">V.Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${item.items.map(orderItem => {
                            // Calculate number of boxes based on unit type
                            let boxCount = '';
                            if (orderItem.product.unit === 'CX') {
                              boxCount = orderItem.quantity.toString();
                            } else if (orderItem.product.unit === 'UN') {
                              // Assuming 12 units per box
                              boxCount = Math.ceil(orderItem.quantity / 12).toString();
                            } else if (orderItem.product.unit === 'FD') {
                              // Assuming 1 bundle = 2 boxes
                              boxCount = (orderItem.quantity * 2).toString();
                            } else if (orderItem.product.unit === 'PCT') {
                              // Assuming 2 packages = 1 box
                              boxCount = Math.ceil(orderItem.quantity / 2).toString();
                            }
                            
                            // Calculate box weight and total weight
                            const boxWeight = orderItem.product.box_weight || 0;
                            const totalWeight = orderItem.product.unit === 'CX' 
                              ? boxWeight * orderItem.quantity 
                              : orderItem.weight || 0;
                            
                            return `
                              <tr>
                                <td>${orderItem.product.name}</td>
                                <td style="text-align: center;">${orderItem.quantity}</td>
                                <td style="text-align: center;">${orderItem.product.unit || 'UN'}</td>
                                <td style="text-align: center;">${boxCount}</td>
                                <td style="text-align: center;">${boxWeight > 0 ? boxWeight.toFixed(2) + ' kg' : '-'}</td>
                                <td style="text-align: center;">${totalWeight > 0 ? totalWeight.toFixed(2) + ' kg' : '-'}</td>
                                <td style="text-align: right;">R$ ${orderItem.unit_price.toFixed(2)}</td>
                                <td style="text-align: right;">R$ ${orderItem.total_price.toFixed(2)}</td>
                              </tr>
                            `;
                          }).join('')}
                          <tr class="total-row">
                            <td colspan="7" style="text-align: right;"><strong>Total:</strong></td>
                            <td style="text-align: right;"><strong>R$ ${item.order.total_amount.toFixed(2)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  `).join('')}

                  <div class="info-section">
                    <h3>Observações</h3>
                    <p style="font-size: 7pt; margin: 2px 0;">${note.notes || 'Nenhuma observação'}</p>
                  </div>

                  <div class="footer">
                    <div class="signature-line">
                      <p>Assinatura do Motorista</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Second Copy -->
              <div>
                <div class="copy-label">2ª VIA - CLIENTE</div>
                <div class="delivery-note">
                  <div class="header">
                    <div class="company-info">
                      J&P DISTRIBUIDORA DE ALIMENTOS
                      <br>CNPJ: 58.957.775/0001-30
                    </div>
                    <h1>ROMANEIO DE ENTREGA</h1>
                    <h2>Nº ${note.number}</h2>
                  </div>

                  <div class="info-section">
                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">Data:</span>
                        <span>${new Date(note.emitted_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
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
                    <h3>Entregas</h3>
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
                      <div class="order-header">
                        <strong>Pedido ${item.order.number}</strong> - ${item.order.customer.razao_social}
</div>
<div class="info-item">
  <span class="info-label">CNPJ:</span>
  <span>${item.order.customer.cpf_cnpj || 'Não informado'}</span>
                      </div>
                      
                      <div class="info-grid">
                        <div class="info-item">
                          <span class="info-label">Vendedor:</span>
                          <span>${item.order.seller?.full_name || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Total do Pedido:</span>
                          <span>R$ ${item.order.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div class="payment-info">
                        <div class="info-grid">
                          <div class="info-item">
                            <span class="info-label">Forma de Pagamento:</span>
                            <span>${formatPaymentMethod(item.order.payment_method)}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Data de Vencimento:</span>
                            <span>${item.order.due_date ? new Date(item.order.due_date).toLocaleDateString() : 'Não informado'}</span>
                            ${item.order.payment_method === 'boleto' && item.order.due_date && item.selectedDueDateOption === '7-14days' ? `
                              <div class="delivery-notes">
                                Segunda parcela: ${new Date(new Date(item.order.due_date).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <table>
                        <thead>
                          <tr>
                            <th>Produto</th>
                            <th style="width: 35px; text-align: center;">Qtd</th>
                            <th style="width: 35px; text-align: center;">Unid.</th>
                            <th style="width: 35px; text-align: center;">Caixas</th>
                            <th style="width: 35px; text-align: center;">Peso/Caixa</th>
                            <th style="width: 35px; text-align: center;">Peso Total</th>
                            <th style="width: 50px; text-align: right;">V.Unit</th>
                            <th style="width: 50px; text-align: right;">V.Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${item.items.map(orderItem => {
                            // Calculate number of boxes based on unit type
                            let boxCount = '';
                            if (orderItem.product.unit === 'CX') {
                              boxCount = orderItem.quantity.toString();
                            } else if (orderItem.product.unit === 'UN') {
                              // Assuming 12 units per box
                              boxCount = Math.ceil(orderItem.quantity / 12).toString();
                            } else if (orderItem.product.unit === 'FD') {
                              // Assuming 1 bundle = 2 boxes
                              boxCount = (orderItem.quantity * 2).toString();
                            } else if (orderItem.product.unit === 'PCT') {
                              // Assuming 2 packages = 1 box
                              boxCount = Math.ceil(orderItem.quantity / 2).toString();
                            }
                            
                            // Calculate box weight and total weight
                            const boxWeight = orderItem.product.box_weight || 0;
                            const totalWeight = orderItem.product.unit === 'CX' 
                              ? boxWeight * orderItem.quantity 
                              : orderItem.weight || 0;
                            
                            return `
                              <tr>
                                <td>${orderItem.product.name}</td>
                                <td style="text-align: center;">${orderItem.quantity}</td>
                                <td style="text-align: center;">${orderItem.product.unit || 'UN'}</td>
                                <td style="text-align: center;">${boxCount}</td>
                                <td style="text-align: center;">${boxWeight > 0 ? boxWeight.toFixed(2) + ' kg' : '-'}</td>
                                <td style="text-align: center;">${totalWeight > 0 ? totalWeight.toFixed(2) + ' kg' : '-'}</td>
                                <td style="text-align: right;">R$ ${orderItem.unit_price.toFixed(2)}</td>
                                <td style="text-align: right;">R$ ${orderItem.total_price.toFixed(2)}</td>
                              </tr>
                            `;
                          }).join('')}
                          <tr class="total-row">
                            <td colspan="7" style="text-align: right;"><strong>Total:</strong></td>
                            <td style="text-align: right;"><strong>R$ ${item.order.total_amount.toFixed(2)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  `).join('')}

                  <div class="info-section">
                    <h3>Observações</h3>
                    <p style="font-size: 7pt; margin: 2px 0;">${note.notes || 'Nenhuma observação'}</p>
                  </div>

                  <div class="footer">
                    <div class="signature-line">
                      <p>Assinatura do Cliente</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #FF8A00; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
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
    (note.helper_name && note.helper_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.customer_name && note.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                  Cliente
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
                      {new Date(note.emitted_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {note.customer_name || 'N/A'}
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