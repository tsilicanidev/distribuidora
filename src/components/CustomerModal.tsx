import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: {
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
  };
}

export function CustomerModal({ isOpen, onClose, onSuccess, customer }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    razao_social: customer?.razao_social || '',
    fantasia: customer?.fantasia || '',
    loja: customer?.loja || '',
    cpf_cnpj: customer?.cpf_cnpj || '',
    ie: customer?.ie || '',
    simples: customer?.simples || 'não',
    endereco: customer?.endereco || '',
    bairro: customer?.bairro || '',
    cidade: customer?.cidade || '',
    estado: customer?.estado || '',
    cep: customer?.cep || '',
    telefone: customer?.telefone || '',
    celular: customer?.celular || '',
    contato: customer?.contato || '',
    email: customer?.email || '',
    email_nfe: customer?.email_nfe || '',
    vendedor: customer?.vendedor || '',
    rede: customer?.rede || '',
    banco1: customer?.banco1 || '',
    agencia1: customer?.agencia1 || '',
    conta1: customer?.conta1 || '',
    telefone_banco1: customer?.telefone_banco1 || '',
    banco2: customer?.banco2 || '',
    agencia2: customer?.agencia2 || '',
    conta2: customer?.conta2 || '',
    telefone_banco2: customer?.telefone_banco2 || '',
    banco3: customer?.banco3 || '',
    agencia3: customer?.agencia3 || '',
    conta3: customer?.conta3 || '',
    telefone_banco3: customer?.telefone_banco3 || '',
    fornecedor1: customer?.fornecedor1 || '',
    telefone_fornecedor1: customer?.telefone_fornecedor1 || '',
    fornecedor2: customer?.fornecedor2 || '',
    telefone_fornecedor2: customer?.telefone_fornecedor2 || '',
    fornecedor3: customer?.fornecedor3 || '',
    telefone_fornecedor3: customer?.telefone_fornecedor3 || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (customer?.id) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([formData]);
        if (error) throw error;
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
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {customer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
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
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações Básicas</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.fantasia}
                  onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loja
                </label>
                <input
                  type="text"
                  value={formData.loja}
                  onChange={(e) => setFormData({ ...formData, loja: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CPF/CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  value={formData.ie}
                  onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Simples Nacional
                </label>
                <select
                  value={formData.simples}
                  onChange={(e) => setFormData({ ...formData, simples: e.target.value as 'sim' | 'não' })}
                  className="input-primary"
                >
                  <option value="sim">Sim</option>
                  <option value="não">Não</option>
                </select>
              </div>
            </div>

            {/* Informações de Contato */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações de Contato</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className="input-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CEP
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="input-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Celular
                  </label>
                  <input
                    type="tel"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    className="input-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações Adicionais</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contato
                </label>
                <input
                  type="text"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email NFe
                </label>
                <input
                  type="email"
                  value={formData.email_nfe}
                  onChange={(e) => setFormData({ ...formData, email_nfe: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendedor
                </label>
                <input
                  type="text"
                  value={formData.vendedor}
                  onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })}
                  className="input-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rede
                </label>
                <input
                  type="text"
                  value={formData.rede}
                  onChange={(e) => setFormData({ ...formData, rede: e.target.value })}
                  className="input-primary"
                />
              </div>
            </div>

            {/* Informações Bancárias */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações Bancárias</h3>
              
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-medium text-gray-700">Banco {i}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nome do Banco
                      </label>
                      <input
                        type="text"
                        value={formData[`banco${i}` as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [`banco${i}`]: e.target.value })}
                        className="input-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Agência
                      </label>
                      <input
                        type="text"
                        value={formData[`agencia${i}` as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [`agencia${i}`]: e.target.value })}
                        className="input-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Conta
                      </label>
                      <input
                        type="text"
                        value={formData[`conta${i}` as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [`conta${i}`]: e.target.value })}
                        className="input-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={formData[`telefone_banco${i}` as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [`telefone_banco${i}`]: e.target.value })}
                        className="input-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referências Comerciais */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Referências Comerciais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-medium text-gray-700">Fornecedor {i}</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData[`fornecedor${i}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`fornecedor${i}`]: e.target.value })}
                      className="input-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData[`telefone_fornecedor${i}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`telefone_fornecedor${i}`]: e.target.value })}
                      className="input-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8A00]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}