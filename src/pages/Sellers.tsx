import React, { useState, useEffect } from 'react';
import { Search, Edit2, RefreshCw, Save, X } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Seller {
  id: string;
  email: string;
  full_name: string;
  commission_rate: number | null;
  created_at: string;
}

export function Sellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const { isAdmin, isManager } = useAuth();

  useEffect(() => {
    if (isAdmin || isManager) {
      fetchSellers();
    }
  }, [isAdmin, isManager]);

  async function fetchSellers() {
    try {
      // Use supabaseAdmin to bypass RLS policies
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .order('full_name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      setError('Erro ao carregar vendedores. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const handleEditCommission = (seller: Seller) => {
    // Only allow admin to edit commission
    if (!isAdmin) {
      setError('Apenas administradores podem alterar taxas de comissão');
      return;
    }
    
    setEditingSellerId(seller.id);
    setCommissionRate(seller.commission_rate ?? 5);
  };

  const handleSaveCommission = async () => {
    if (!editingSellerId) return;
    
    try {
      setSaving(true);
      setError(null);

      // Check if user is admin - only admins can update commission rates
      if (!isAdmin) {
        throw new Error('Apenas administradores podem alterar taxas de comissão');
      }

      // Validate commission rate
      if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        throw new Error('Taxa de comissão deve ser um número entre 0 e 100');
      }

      // Update commission rate in profiles table using supabaseAdmin
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ commission_rate: commissionRate })
        .eq('id', editingSellerId);
          
      if (updateError) throw updateError;

      // Update local state
      setSellers(sellers.map(seller => 
        seller.id === editingSellerId 
          ? { ...seller, commission_rate: commissionRate }
          : seller
      ));
      
      setEditingSellerId(null);
      setError(null);
    } catch (error) {
      console.error('Error updating commission rate:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar taxa de comissão');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingSellerId(null);
  };

  const filteredSellers = sellers.filter(seller => 
    (seller.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (seller.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!isAdmin && !isManager) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vendedores</h1>
        <p className="text-gray-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
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
            placeholder="Buscar vendedores..."
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa de Comissão (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Cadastro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum vendedor encontrado.
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {seller.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {seller.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingSellerId === seller.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#FF8A00]"
                          />
                          <button
                            onClick={handleSaveCommission}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900"
                            title="Salvar"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          {(seller.commission_rate ?? 5).toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(seller.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingSellerId !== seller.id && (
                        <button
                          onClick={() => handleEditCommission(seller)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar Comissão"
                          disabled={!isAdmin}
                        >
                          <Edit2 className={`h-5 w-5 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Sellers;