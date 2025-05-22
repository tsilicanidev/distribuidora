import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductModal } from '../components/ProductModal';
import { useAuth } from '../hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  box_weight?: number;
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const { isSeller, isAdmin } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('name');

      // If user is a seller, only show products with stock
      if (isSeller) {
        query = query.gt('stock_quantity', 0);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      // Force delete the product by first removing references in sales_order_items
      const { data: orderItems, error: checkError } = await supabase
        .from('sales_order_items')
        .select('id')
        .eq('product_id', id);

      if (checkError) throw checkError;

      // If there are references, delete them first
      if (orderItems && orderItems.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('product_id', id);

        if (deleteItemsError) throw deleteItemsError;
      }

      // Now delete the product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Ocorreu um erro ao tentar excluir o produto.');
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      UN: 'Unidade',
      CX: 'Caixa',
      KG: 'Quilograma',
      L: 'Litro',
      PCT: 'Pacote',
      FD: 'Fardo'
    };
    return labels[unit] || unit;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        {!isSeller && (
          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Produto
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
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
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidade
                </th>
                {!isSeller && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                {!isSeller && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    {!isSeller && (
                      <div className="text-sm text-gray-500">
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getUnitLabel(product.unit)}
                    {product.unit === 'CX' && product.box_weight && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({product.box_weight} kg)
                      </span>
                    )}
                  </td>
                  {!isSeller && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {product.price.toFixed(2)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.stock_quantity} {product.unit}
                    </div>
                    {!isSeller && (
                      <div className="text-xs text-gray-500">
                        Mín: {product.min_stock} {product.unit} {product.max_stock && `/ Máx: ${product.max_stock} ${product.unit}`}
                      </div>
                    )}
                  </td>
                  {!isSeller && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-[#FF8A00] hover:text-[#FF8A00]/80 mr-3"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isSeller && (
        <ProductModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(undefined);
          }}
          onSuccess={fetchProducts}
          product={selectedProduct}
        />
      )}
    </div>
  );
}