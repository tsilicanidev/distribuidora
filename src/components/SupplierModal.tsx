import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: {
    id: string;
    razao_social: string;
    cnpj: string;
  };
}

export function SupplierModal({ isOpen, onClose, onSuccess, supplier }: SupplierModalProps) {
  const [formData, setFormData] = useState({
    razao_social: supplier?.razao_social || '',
    cnpj: supplier?.cnpj || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (supplier?.id) {
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
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
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {supplier ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Razão Social *
            </label>
            <input
              type="text"
              required
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              CNPJ *
            </label>
            <input
              type="text"
              required
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}