import React, { useState, useEffect } from 'react';
import { FileText, Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FiscalInvoice {
  id: string;
  number: string;
  series: string;
  issue_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  customer: {
    razao_social: string;
    cpf_cnpj: string;
  };
}

export function FiscalInvoices() {
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from('fiscal_invoices')
        .select(`
          *,
          customer:customers(razao_social, cpf_cnpj)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Erro ao buscar notas fiscais:', error);
    } finally {
      setLoading(false);
    }
  }

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

  const downloadXML = (id: string) => {
    console.log('Baixando XML da nota fiscal:', id);
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.number}
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
                    <button
                      onClick={() => downloadXML(invoice.id)}
                      className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                      title="Baixar XML"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      title="Visualizar Detalhes"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}