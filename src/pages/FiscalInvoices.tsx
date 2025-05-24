import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, X, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { gerarDANFE } from '../lib/nfe/danfe';

interface FiscalInvoice {
  id: string;
  number: string;
  series: string;
  issue_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  xml_url?: string;
  pdf_url?: string;
  customer: {
    razao_social: string;
    cpf_cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  delivery_note?: {
    number: string;
    date: string;
  };
}

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FiscalInvoice | null;
}

// Helper functions for status colors and text
const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'issued':
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
    case 'issued':
      return 'EMITIDA';
    case 'cancelled':
      return 'CANCELADA';
    default:
      return status.toUpperCase();
  }
};

function InvoiceDetailsModal({ isOpen, onClose, invoice }: InvoiceDetailsModalProps) {
  if (!isOpen || !invoice) return null;

  const handleViewDANFE = async () => {
    try {
      if (!invoice.pdf_url) {
        // Se não tiver URL, gerar o DANFE localmente
        const chave = invoice.pdf_url?.split('/').pop() || generateRandomKey();
        
        const danfe = await gerarDANFE(
          chave,
          invoice.number,
          invoice.series,
          new Date(invoice.issue_date),
          {
            nome: '58957775 PATRICIA APARECIDA RAMOS DOS SANTOS',
            cnpj: '58957775000130',
            endereco: 'Rua Vanda',
            bairro: 'Parque dos Camargos',
            cidade: 'Barueri',
            uf: 'SP',
            cep: '06436380'
          },
          {
            nome: invoice.customer.razao_social,
            cpfCnpj: invoice.customer.cpf_cnpj,
            endereco: invoice.customer.endereco || 'Não informado',
            bairro: invoice.customer.bairro || 'Não informado',
            cidade: invoice.customer.cidade || 'Não informado',
            uf: invoice.customer.estado || 'SP',
            cep: '00000000'
          },
          [
            {
              codigo: '001',
              descricao: 'MERCADORIAS DIVERSAS',
              quantidade: 1,
              unidade: 'UN',
              valorUnitario: invoice.total_amount,
              valorTotal: invoice.total_amount
            }
          ],
          invoice.total_amount
        );
        
        // Criar URL para o blob e abrir em nova janela
        const url = URL.createObjectURL(danfe);
        window.open(url, '_blank');
      } else {
        // Se tiver URL, abrir diretamente
        window.open(invoice.pdf_url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar DANFE:', error);
      alert('Erro ao gerar DANFE. Por favor, tente novamente.');
    }
  };
  
  // Função para gerar uma chave aleatória de 44 dígitos
  function generateRandomKey(): string {
    let key = '';
    for (let i = 0; i < 44; i++) {
      key += Math.floor(Math.random() * 10).toString();
    }
    return key;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-[#FF8A00] mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Detalhes da Nota Fiscal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Nota</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Número</p>
                <p className="text-base text-gray-900">{invoice.number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Série</p>
                <p className="text-base text-gray-900">{invoice.series}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Emissão</p>
                <p className="text-base text-gray-900">
                  {new Date(invoice.issue_date).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Cliente</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Razão Social</p>
                <p className="text-base text-gray-900">{invoice.customer.razao_social}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">CPF/CNPJ</p>
                <p className="text-base text-gray-900">{invoice.customer.cpf_cnpj}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p className="text-base text-gray-900">
                  {invoice.customer.endereco}, {invoice.customer.bairro}, {invoice.customer.cidade} - {invoice.customer.estado}
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Romaneio */}
          {invoice.delivery_note && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Romaneio</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Número do Romaneio</p>
                  <p className="text-base text-gray-900">{invoice.delivery_note.number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Data</p>
                  <p className="text-base text-gray-900">
                    {new Date(invoice.delivery_note.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Valores */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Valores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Total</p>
                <p className="text-lg font-semibold text-gray-900">
                  R$ {invoice.total_amount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Valor dos Impostos</p>
                <p className="text-lg font-semibold text-gray-900">
                  R$ {invoice.tax_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end space-x-4">
            {invoice.xml_url && (
              <button
                onClick={() => window.open(invoice.xml_url, '_blank')}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <Download className="h-5 w-5 mr-2" />
                Baixar XML
              </button>
            )}
            <button
              onClick={handleViewDANFE}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <Eye className="h-5 w-5 mr-2" />
              Visualizar DANFE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FiscalInvoices() {
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<FiscalInvoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
  setLoading(true);
  try {
    let query = supabase
      .from('fiscal_invoices')
      .select(`
        *,
        customer:customers(razao_social, cpf_cnpj, endereco, bairro, cidade, estado),
        delivery_note:delivery_notes(number, date)
      `)
      .order('created_at', { ascending: false });

    // Se houver filtro, aplicar
    if (searchTerm.trim() !== '') {
      query = query.ilike('number', `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    setInvoices(data || []);
  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error);
  } finally {
    setLoading(false);
  }
}

  const downloadXML = (invoice: FiscalInvoice) => {
    if (!invoice.xml_url) {
      alert('URL do XML não disponível');
      return;
    }

    window.open(invoice.xml_url, '_blank');
  };

  const showDetails = (invoice: FiscalInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.number.includes(searchTerm) ||
    invoice.customer.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer.cpf_cnpj.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar notas fiscais..."
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
          <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número/Série
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Emissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
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
                {filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {index + 1}
                      </div>
                      <div className="text-sm text-gray-500">
                        Série: {invoice.series}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.customer.razao_social}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customer.cpf_cnpj}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issue_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        R$ {invoice.total_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Impostos: R$ {invoice.tax_amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.xml_url && (
                        <button
                          onClick={() => downloadXML(invoice)}
                          className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                          title="Baixar XML"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => showDetails(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Visualizar Detalhes"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvoiceDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}

export default FiscalInvoices;