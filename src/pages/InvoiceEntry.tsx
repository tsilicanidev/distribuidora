import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NFe } from '../services/nfe';

interface Supplier {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

interface InvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function InvoiceEntry() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emitindoNFe, setEmitindoNFe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoiceData, setInvoiceData] = useState({
    number: '',
    supplier_id: '',
    issue_date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<InvoiceItem[]>([{
    product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  }]);

  const nfeService = new NFe();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [
        { data: suppliersData },
        { data: productsData },
      ] = await Promise.all([
        supabase.from('customers').select('id, razao_social, cpf_cnpj').order('razao_social'),
        supabase.from('products').select('*').order('name'),
      ]);

      setSuppliers(suppliersData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index] };

    // Update the specified field
    currentItem[field] = value;

    // If changing product_id, update unit_price
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        currentItem.unit_price = product.price;
        currentItem.total_price = product.price * currentItem.quantity;
      }
    }

    // If changing quantity or unit_price, update total_price
    if (field === 'quantity' || field === 'unit_price') {
      currentItem.total_price = currentItem.quantity * currentItem.unit_price;
    }

    newItems[index] = currentItem;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEmitindoNFe(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Busca dados do fornecedor
      const { data: fornecedor } = await supabase
        .from('customers')
        .select('*')
        .eq('id', invoiceData.supplier_id)
        .single();

      if (!fornecedor) throw new Error('Fornecedor não encontrado');

      // Prepara dados para emissão da NF-e
      const nfeData = {
        numero: invoiceData.number,
        serie: '1',
        natureza_operacao: 'COMPRA PARA COMERCIALIZAÇÃO',
        tipo_documento: '1', // NF-e entrada
        destino_operacao: '1', // Operação interna
        finalidade_emissao: '1', // NF-e normal
        consumidor_final: '0', // Não
        presenca_comprador: '9', // Operação não presencial
        data_emissao: new Date().toISOString(),
        data_saida: new Date().toISOString(),
        emitente: {
          cnpj: fornecedor.cpf_cnpj,
          inscricao_estadual: fornecedor.ie,
          nome: fornecedor.razao_social,
          nome_fantasia: fornecedor.fantasia,
          endereco: {
            logradouro: fornecedor.endereco,
            numero: '',
            bairro: fornecedor.bairro,
            municipio: fornecedor.cidade,
            uf: fornecedor.estado,
            cep: fornecedor.cep,
            pais: 'Brasil'
          }
        },
        destinatario: {
          cpf_cnpj: import.meta.env.VITE_EMPRESA_CNPJ,
          inscricao_estadual: import.meta.env.VITE_EMPRESA_IE,
          nome: import.meta.env.VITE_EMPRESA_RAZAO_SOCIAL,
          email: import.meta.env.VITE_EMPRESA_EMAIL,
          endereco: {
            logradouro: import.meta.env.VITE_EMPRESA_ENDERECO,
            numero: import.meta.env.VITE_EMPRESA_NUMERO,
            bairro: import.meta.env.VITE_EMPRESA_BAIRRO,
            municipio: import.meta.env.VITE_EMPRESA_CIDADE,
            uf: import.meta.env.VITE_EMPRESA_UF,
            cep: import.meta.env.VITE_EMPRESA_CEP,
            pais: 'Brasil'
          }
        },
        itens: await Promise.all(items.map(async (item) => {
          const { data: produto } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.product_id)
            .single();

          return {
            produto: {
              codigo: produto.id,
              descricao: produto.name,
              ncm: produto.ncm || '00000000',
              cfop: '1102',
              unidade: produto.unidade || 'UN',
              quantidade: item.quantity,
              valor_unitario: item.unit_price,
              valor_total: item.total_price
            },
            imposto: {
              icms: {
                origem: '0',
                cst: '00',
                aliquota: 18,
                base_calculo: item.total_price,
                valor: item.total_price * 0.18
              }
            }
          };
        })),
        valor_frete: 0,
        valor_seguro: 0,
        valor_total: items.reduce((sum, item) => sum + item.total_price, 0),
        valor_produtos: items.reduce((sum, item) => sum + item.total_price, 0),
        valor_desconto: 0,
        informacoes_complementares: ''
      };

      // Emite NF-e
      const nfeResult = await nfeService.emitir(nfeData);

      if (!nfeResult.success) {
        throw new Error(nfeResult.message);
      }

      // Salva a nota fiscal no banco de dados
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          number: invoiceData.number,
          supplier_id: invoiceData.supplier_id,
          issue_date: invoiceData.issue_date,
          total_amount: items.reduce((sum, item) => sum + item.total_price, 0),
          nfe_numero: nfeResult.nfe_numero,
          nfe_serie: nfeResult.nfe_serie,
          nfe_chave: nfeResult.nfe_chave,
          nfe_pdf_url: nfeResult.pdf_url,
          nfe_xml_url: nfeResult.xml_url,
          created_by: user.id,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insere os itens e atualiza o estoque
      for (const item of items) {
        // Insere o item
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert([{
            invoice_id: invoice.id,
            ...item,
          }]);

        if (itemError) throw itemError;

        // Atualiza o estoque
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock_quantity: supabase.sql`stock_quantity + ${item.quantity}`,
          })
          .eq('id', item.product_id);

        if (stockError) throw stockError;

        // Registra movimentação de estoque
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: item.product_id,
            quantity: item.quantity,
            type: 'IN',
            reference_id: invoice.id,
            created_by: user.id,
          }]);

        if (movementError) throw movementError;
      }

      alert('Nota fiscal processada e NF-e emitida com sucesso!');
      
      // Reset form
      setInvoiceData({
        number: '',
        supplier_id: '',
        issue_date: new Date().toISOString().split('T')[0],
      });
      setItems([{
        product_id: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      }]);

      // Abre os documentos fiscais em novas abas
      if (nfeResult.pdf_url) {
        window.open(nfeResult.pdf_url, '_blank');
      }
      if (nfeResult.xml_url) {
        window.open(nfeResult.xml_url, '_blank');
      }

    } catch (error) {
      console.error('Erro ao processar nota fiscal:', error);
      setError(error.message || 'Erro ao processar nota fiscal. Por favor, tente novamente.');
    } finally {
      setSaving(false);
      setEmitindoNFe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entrada de Nota Fiscal</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Nota</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Número da NF *
              </label>
              <input
                type="text"
                required
                value={invoiceData.number}
                onChange={(e) => setInvoiceData({ ...invoiceData, number: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fornecedor *
              </label>
              <select
                required
                value={invoiceData.supplier_id}
                onChange={(e) => setInvoiceData({ ...invoiceData, supplier_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.razao_social} ({supplier.cpf_cnpj})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data de Emissão *
              </label>
              <input
                type="date"
                required
                value={invoiceData.issue_date}
                onChange={(e) => setInvoiceData({ ...invoiceData, issue_date: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Itens</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center px-3 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end border-b border-gray-200 pb-4 mb-4">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700">
                  Produto *
                </label>
                <select
                  required
                  value={item.product_id}
                  onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quantidade *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Preço Unitário *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:ring-[#FF8A00] focus:border-[#FF8A00]"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Preço Total
                </label>
                <input
                  type="number"
                  readOnly
                  value={item.total_price}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50"
                />
              </div>

              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  disabled={items.length === 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="mt-4 text-right">
            <p className="text-lg font-semibold text-gray-900">
              Total: R$ {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {emitindoNFe ? 'Emitindo NF-e...' : 'Salvando...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Nota Fiscal
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}