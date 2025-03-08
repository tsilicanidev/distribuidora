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
  type: 'sales' | 'inventory' | 'sellers' | 'all';
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

      if (filters.type === 'all' || filters.type === 'sellers') {
        // Fetch sellers report
        const { data: salesOrders, error: salesError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            total_amount,
            commission_amount,
            created_at,
            seller:profiles(id, full_name)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (salesError) throw salesError;

        if (!salesOrders || salesOrders.length === 0) {
          setError('Nenhum dado de vendas encontrado para o período selecionado.');
          return;
        }

        // Process sales data by seller
        const sellerStats = salesOrders.reduce((acc: any, order) => {
          const sellerName = order.seller?.full_name || 'Desconhecido';
          
          if (!acc[sellerName]) {
            acc[sellerName] = {
              seller: sellerName,
              totalSales: 0,
              totalCommission: 0,
              orderCount: 0,
              averageOrderValue: 0,
            };
          }
          
          acc[sellerName].totalSales += order.total_amount || 0;
          acc[sellerName].totalCommission += order.commission_amount || 0;
          acc[sellerName].orderCount += 1;
          
          return acc;
        }, {});

        // Calculate averages and format data
        const sellersData = Object.values(sellerStats).map((stats: any) => ({
          ...stats,
          averageOrderValue: stats.orderCount > 0 ? stats.totalSales / stats.orderCount : 0,
        }));

        // Sort by total sales descending
        sellersData.sort((a: any, b: any) => b.totalSales - a.totalSales);

        data = {
          title: 'Relatório de Vendedores',
          chartData: {
            labels: sellersData.map((d: any) => d.seller),
            datasets: [
              {
                label: 'Total de Vendas (R$)',
                data: sellersData.map((d: any) => d.totalSales),
                backgroundColor: 'rgba(255, 138, 0, 0.5)',
                borderColor: '#FF8A00',
                borderWidth: 1,
              },
              {
                label: 'Comissão (R$)',
                data: sellersData.map((d: any) => d.totalCommission),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: '#4BC0C0',
                borderWidth: 1,
              },
            ],
          },
          tableData: sellersData,
          tableColumns: [
            { header: 'Vendedor', accessor: 'seller' },
            { 
              header: 'Total de Vendas', 
              accessor: 'totalSales',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Comissão', 
              accessor: 'totalCommission',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { header: 'Pedidos', accessor: 'orderCount' },
            { 
              header: 'Ticket Médio', 
              accessor: 'averageOrderValue',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
          ],
        };
      }

      if (filters.type === 'all' || filters.type === 'inventory') {
        // Fetch inventory movements
        const { data: movements, error: movementsError } = await supabase
          .from('stock_movements')
          .select(`
            id,
            type,
            quantity,
            created_at,
            product:products(name)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (movementsError) throw movementsError;

        if (!movements || movements.length === 0) {
          setError('Nenhum movimento de estoque encontrado para o período selecionado.');
          return;
        }

        // Process movements by product
        const productStats = movements.reduce((acc: any, movement) => {
          const productName = movement.product?.name || 'Desconhecido';
          
          if (!acc[productName]) {
            acc[productName] = {
              product: productName,
              totalIn: 0,
              totalOut: 0,
              movementCount: 0,
            };
          }
          
          if (movement.type === 'IN') {
            acc[productName].totalIn += movement.quantity || 0;
          } else {
            acc[productName].totalOut += movement.quantity || 0;
          }
          acc[productName].movementCount += 1;
          
          return acc;
        }, {});

        const inventoryData = Object.values(productStats);

        data = {
          title: 'Relatório de Estoque',
          chartData: {
            labels: inventoryData.map((d: any) => d.product),
            datasets: [
              {
                label: 'Entradas',
                data: inventoryData.map((d: any) => d.totalIn),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: '#4BC0C0',
                borderWidth: 1,
              },
              {
                label: 'Saídas',
                data: inventoryData.map((d: any) => d.totalOut),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: '#FF6384',
                borderWidth: 1,
              },
            ],
          },
          tableData: inventoryData,
          tableColumns: [
            { header: 'Produto', accessor: 'product' },
            { header: 'Total Entradas', accessor: 'totalIn' },
            { header: 'Total Saídas', accessor: 'totalOut' },
            { header: 'Movimentações', accessor: 'movementCount' },
          ],
        };
      }

      if (filters.type === 'all' || filters.type === 'sales') {
        // Fetch sales data
        const { data: sales, error: salesError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            total_amount,
            created_at,
            customer:customers(razao_social)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (salesError) throw salesError;

        if (!sales || sales.length === 0) {
          setError('Nenhuma venda encontrada para o período selecionado.');
          return;
        }

        // Group sales by date
        const salesByDate = sales.reduce((acc: any, sale) => {
          const date = new Date(sale.created_at).toLocaleDateString();
          
          if (!acc[date]) {
            acc[date] = {
              date,
              totalAmount: 0,
              orderCount: 0,
              averageAmount: 0,
            };
          }
          
          acc[date].totalAmount += sale.total_amount || 0;
          acc[date].orderCount += 1;
          acc[date].averageAmount = acc[date].totalAmount / acc[date].orderCount;
          
          return acc;
        }, {});

        const salesData = Object.values(salesByDate);

        data = {
          title: 'Relatório de Vendas',
          chartData: {
            labels: salesData.map((d: any) => d.date),
            datasets: [
              {
                label: 'Total de Vendas (R$)',
                data: salesData.map((d: any) => d.totalAmount),
                backgroundColor: 'rgba(255, 138, 0, 0.5)',
                borderColor: '#FF8A00',
                borderWidth: 1,
              },
            ],
          },
          tableData: salesData,
          tableColumns: [
            { header: 'Data', accessor: 'date' },
            { 
              header: 'Total de Vendas', 
              accessor: 'totalAmount',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { header: 'Quantidade de Pedidos', accessor: 'orderCount' },
            { 
              header: 'Média por Pedido', 
              accessor: 'averageAmount',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
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
                      callback: (value) => `${value}`,
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
                        {column.format ? column.format(row[column.accessor]) : row[column.accessor]}
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