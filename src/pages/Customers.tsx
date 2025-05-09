import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CustomerModal } from '../components/CustomerModal';

interface Customer {
  id: string;
  razao_social: string;
  fantasia: string;
  loja: string;
  cpf_cnpj: string;
  ie: string;
  simples: 'sim' | 'não';
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  celular: string;
  contato: string;
  email: string;
  email_nfe: string;
  vendedor: string;
  rede: string;
  banco1: string;
  agencia1: string;
  conta1: string;
  telefone_banco1: string;
  banco2: string;
  agencia2: string;
  conta2: string;
  telefone_banco2: string;
  banco3: string;
  agencia3: string;
  conta3: string;
  telefone_banco3: string;
  fornecedor1: string;
  telefone_fornecedor1: string;
  fornecedor2: string;
  telefone_fornecedor2: string;
  fornecedor3: string;
  telefone_fornecedor3: string;
  created_at: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCustomer(expandedCustomer === id ? null : id);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.cpf_cnpj.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => {
            setSelectedCustomer(undefined);
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Cliente
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar clientes..."
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dados Principais
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(customer.id)}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.razao_social}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.fantasia && <span>Fantasia: {customer.fantasia}<br /></span>}
                          CNPJ/CPF: {customer.cpf_cnpj}<br />
                          {customer.ie && <span>IE: {customer.ie}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.telefone && <span>Tel: {customer.telefone}<br /></span>}
                          {customer.celular && <span>Cel: {customer.celular}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.endereco}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.bairro && <span>{customer.bairro}, </span>}
                          {customer.cidade && <span>{customer.cidade}/{customer.estado}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(customer);
                          }}
                          className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                    {expandedCustomer === customer.id && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-3 gap-6">
                            {/* Dados Bancários */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Dados Bancários</h4>
                              {customer.banco1 && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium">Banco 1:</p>
                                  <p className="text-sm text-gray-600">{customer.banco1}</p>
                                  <p className="text-sm text-gray-600">Ag: {customer.agencia1} / CC: {customer.conta1}</p>
                                  {customer.telefone_banco1 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_banco1}</p>
                                  )}
                                </div>
                              )}
                              {customer.banco2 && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium">Banco 2:</p>
                                  <p className="text-sm text-gray-600">{customer.banco2}</p>
                                  <p className="text-sm text-gray-600">Ag: {customer.agencia2} / CC: {customer.conta2}</p>
                                  {customer.telefone_banco2 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_banco2}</p>
                                  )}
                                </div>
                              )}
                              {customer.banco3 && (
                                <div>
                                  <p className="text-sm font-medium">Banco 3:</p>
                                  <p className="text-sm text-gray-600">{customer.banco3}</p>
                                  <p className="text-sm text-gray-600">Ag: {customer.agencia3} / CC: {customer.conta3}</p>
                                  {customer.telefone_banco3 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_banco3}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Referências Comerciais */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Referências Comerciais</h4>
                              {customer.fornecedor1 && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium">Fornecedor 1:</p>
                                  <p className="text-sm text-gray-600">{customer.fornecedor1}</p>
                                  {customer.telefone_fornecedor1 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_fornecedor1}</p>
                                  )}
                                </div>
                              )}
                              {customer.fornecedor2 && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium">Fornecedor 2:</p>
                                  <p className="text-sm text-gray-600">{customer.fornecedor2}</p>
                                  {customer.telefone_fornecedor2 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_fornecedor2}</p>
                                  )}
                                </div>
                              )}
                              {customer.fornecedor3 && (
                                <div>
                                  <p className="text-sm font-medium">Fornecedor 3:</p>
                                  <p className="text-sm text-gray-600">{customer.fornecedor3}</p>
                                  {customer.telefone_fornecedor3 && (
                                    <p className="text-sm text-gray-600">Tel: {customer.telefone_fornecedor3}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Informações Adicionais */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Informações Adicionais</h4>
                              {customer.email_nfe && (
                                <p className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">Email NFe:</span> {customer.email_nfe}
                                </p>
                              )}
                              {customer.vendedor && (
                                <p className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">Vendedor:</span> {customer.vendedor}
                                </p>
                              )}
                              {customer.rede && (
                                <p className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">Rede:</span> {customer.rede}
                                </p>
                              )}
                              {customer.simples && (
                                <p className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">Simples Nacional:</span> {customer.simples}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Cadastrado em:</span>{' '}
                                {new Date(customer.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCustomer(undefined);
        }}
        onSuccess={fetchCustomers}
        customer={selectedCustomer}
      />
    </div>
  );
}