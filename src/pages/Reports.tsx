import React, { useState } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ReportFilter {
  startDate: string;
  endDate: string;
  type: 'sales' | 'inventory' | 'sellers' | 'financial' | 'products' | 'purchases' | 'all';
}

interface ReportData {
  title: string;
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor?: string;
      borderWidth?: number;
    }[];
  };
  tableData: any[];
  tableColumns: {
    header: string;
    accessor: string;
    format?: (value: any) => string;
  }[];
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all',
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let data: ReportData | null = null;

      if (filters.type === 'all' || filters.type === 'purchases') {
        // Fetch fiscal invoices with customer data
        const { data: invoices, error: invoicesError } = await supabase
          .from('fiscal_invoices')
          .select(`
            *,
            customer:customers(
              razao_social,
              cpf_cnpj
            )
          `)
          .gte('issue_date', filters.startDate)
          .lte('issue_date', filters.endDate + 'T23:59:59')
          .order('issue_date');

        if (invoicesError) throw invoicesError;

        if (!invoices || invoices.length === 0) {
          setError('Nenhuma nota fiscal encontrada para o período selecionado.');
          return;
        }

        // Group invoices by customer
        const customerStats = invoices.reduce((acc: any, invoice) => {
          const customerName = invoice.customer?.razao_social || 'Desconhecido';
          
          if (!acc[customerName]) {
            acc[customerName] = {
              customer: customerName,
              cpf_cnpj: invoice.customer?.cpf_cnpj || '',
              invoiceCount: 0,
              totalAmount: 0,
              totalTax: 0,
            };
          }
          
          acc[customerName].invoiceCount += 1;
          acc[customerName].totalAmount += invoice.total_amount || 0;
          acc[customerName].totalTax += invoice.tax_amount || 0;
          
          return acc;
        }, {});

        // Convert to array and sort by total amount
        const customerData = Object.values(customerStats);
        customerData.sort((a: any, b: any) => b.totalAmount - a.totalAmount);

        // Group by month for the chart
        const monthlyData = invoices.reduce((acc: any, invoice) => {
          const month = new Date(invoice.issue_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!acc[month]) {
            acc[month] = {
              totalAmount: 0,
              totalTax: 0,
            };
          }
          
          acc[month].totalAmount += invoice.total_amount || 0;
          acc[month].totalTax += invoice.tax_amount || 0;
          
          return acc;
        }, {});

        const months = Object.keys(monthlyData);
        const totalAmounts = months.map(month => monthlyData[month].totalAmount);
        const totalTaxes = months.map(month => monthlyData[month].totalTax);

        data = {
          title: 'Relatório de Compras por Cliente',
          chartData: {
            labels: months,
            datasets: [
              {
                label: 'Valor Total (R$)',
                data: totalAmounts,
                backgroundColor: 'rgba(255, 138, 0, 0.5)',
                borderColor: '#FF8A00',
                borderWidth: 1,
              },
              {
                label: 'Impostos (R$)',
                data: totalTaxes,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: '#4BC0C0',
                borderWidth: 1,
              },
            ],
          },
          tableData: customerData,
          tableColumns: [
            { 
              header: 'Cliente', 
              accessor: 'customer' 
            },
            { 
              header: 'CPF/CNPJ', 
              accessor: 'cpf_cnpj' 
            },
            { 
              header: 'Qtd. Notas', 
              accessor: 'invoiceCount' 
            },
            { 
              header: 'Valor Total', 
              accessor: 'totalAmount',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Total Impostos', 
              accessor: 'totalTax',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Média por NF', 
              accessor: 'totalAmount',
              format: (value, row) => `R$ ${(value / row.invoiceCount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
          ],
        };
      } else if (filters.type === 'all' || filters.type === 'products') {
        // Fetch products with their sales and purchase data
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            unit,
            sales_order_items (
              quantity,
              unit_price,
              total_price,
              sales_order:sales_orders (
                status
              )
            ),
            customer_order_items (
              quantity,
              unit_price,
              total_price,
              order:customer_orders (
                status
              )
            )
          `);

        if (productsError) throw productsError;

        // Process product data
        const productStats = products.map(product => {
          // Calculate average purchase price from fiscal invoices
          const purchaseItems = product.customer_order_items || [];
          const totalPurchaseQuantity = purchaseItems.reduce((sum: number, item: any) => 
            item.order?.status === 'approved' ? sum + item.quantity : sum, 0);
          const totalPurchaseValue = purchaseItems.reduce((sum: number, item: any) => 
            item.order?.status === 'approved' ? sum + item.total_price : sum, 0);
          const avgPurchasePrice = totalPurchaseQuantity > 0 
            ? totalPurchaseValue / totalPurchaseQuantity 
            : 0;

          // Calculate average sale price from sales orders
          const saleItems = product.sales_order_items || [];
          const totalSaleQuantity = saleItems.reduce((sum: number, item: any) => 
            item.sales_order?.status === 'completed' ? sum + item.quantity : sum, 0);
          const totalSaleValue = saleItems.reduce((sum: number, item: any) => 
            item.sales_order?.status === 'completed' ? sum + item.total_price : sum, 0);
          const avgSalePrice = totalSaleQuantity > 0 
            ? totalSaleValue / totalSaleQuantity 
            : 0;

          // Calculate profit margin
          const profitPerUnit = avgSalePrice - avgPurchasePrice;
          const profitMargin = avgPurchasePrice > 0 
            ? (profitPerUnit / avgPurchasePrice) * 100 
            : 0;

          return {
            name: product.name,
            unit: product.unit,
            avgPurchasePrice,
            avgSalePrice,
            profitPerUnit,
            profitMargin,
            totalSaleQuantity,
            totalSaleValue,
            totalPurchaseQuantity,
            totalPurchaseValue
          };
        });

        // Sort by profit margin descending
        productStats.sort((a, b) => b.profitMargin - a.profitMargin);

        data = {
          title: 'Relatório de Lucratividade por Produto',
          chartData: {
            labels: productStats.map(p => p.name),
            datasets: [
              {
                label: 'Preço de Compra (R$)',
                data: productStats.map(p => p.avgPurchasePrice),
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
              },
              {
                label: 'Preço de Venda (R$)',
                data: productStats.map(p => p.avgSalePrice),
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
              },
              {
                label: 'Margem de Lucro (%)',
                data: productStats.map(p => p.profitMargin),
                backgroundColor: 'rgba(255, 138, 0, 0.8)', // Orange
              }
            ],
          },
          tableData: productStats,
          tableColumns: [
            { 
              header: 'Produto', 
              accessor: 'name' 
            },
            { 
              header: 'Unidade', 
              accessor: 'unit' 
            },
            { 
              header: 'Preço Médio de Compra', 
              accessor: 'avgPurchasePrice',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Preço Médio de Venda', 
              accessor: 'avgSalePrice',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Lucro por Unidade', 
              accessor: 'profitPerUnit',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Margem de Lucro', 
              accessor: 'profitMargin',
              format: (value) => `${value.toFixed(2)}%`
            },
            { 
              header: 'Qtd. Vendida', 
              accessor: 'totalSaleQuantity'
            },
            { 
              header: 'Total Vendas', 
              accessor: 'totalSaleValue',
              format: (value) => `R$ ${value.toFixed(2)}`
            }
          ],
        };
      }

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Erro ao gerar relatório. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    alert('Exportando relatório...');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Relatório
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as ReportFilter['type'] })}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
            >
              <option value="all">Todos os Relatórios</option>
              <option value="purchases">Relatório de Compras</option>
              <option value="products">Relatório de Lucratividade</option>
              <option value="financial">Relatório Financeiro</option>
              <option value="sellers">Relatório de Vendedores</option>
              <option value="sales">Relatório de Vendas</option>
              <option value="inventory">Relatório de Estoque</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Gerando...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Gerar Relatório
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Filter className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {reportData && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{reportData.title}</h2>
          
          <div className="mb-8 h-96">
            <Bar
              data={reportData.chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => {
                        // If it's the profit margin dataset
                        if (reportData.chartData.datasets[2]?.data.includes(Number(value))) {
                          return `${value}%`;
                        }
                        // For price datasets
                        return `R$ ${value.toLocaleString('pt-BR')}`;
                      },
                    },
                  },
                },
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportData.tableColumns.map((column, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {reportData.tableColumns.map((column, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {column.format ? column.format(row[column.accessor], row) : row[column.accessor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={exportToPDF}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Download className="h-5 w-5 mr-2" />
              Exportar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}