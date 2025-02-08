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
  type: 'sales' | 'inventory' | 'customers' | 'sellers' | 'all';
}

interface SalesData {
  seller: string;
  totalSales: number;
  totalCommission: number;
  orderCount: number;
  averageOrderValue: number;
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all',
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [showReport, setShowReport] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const reportData: any = {};

      if (filters.type === 'all' || filters.type === 'sellers') {
        // Fetch sales orders with seller details
        const { data: salesOrders } = await supabase
          .from('sales_orders')
          .select(`
            *,
            seller:profiles(full_name)
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate)
          .order('created_at');

        if (salesOrders) {
          // Process sales data by seller
          const sellerStats = salesOrders.reduce((acc: { [key: string]: SalesData }, order) => {
            const sellerName = order.seller.full_name;
            if (!acc[sellerName]) {
              acc[sellerName] = {
                seller: sellerName,
                totalSales: 0,
                totalCommission: 0,
                orderCount: 0,
                averageOrderValue: 0,
              };
            }
            
            acc[sellerName].totalSales += order.total_amount;
            acc[sellerName].totalCommission += order.commission_amount;
            acc[sellerName].orderCount += 1;
            
            return acc;
          }, {});

          // Calculate averages and format data
          const processedData = Object.values(sellerStats).map(stats => ({
            ...stats,
            averageOrderValue: stats.totalSales / stats.orderCount,
          }));

          setSalesData(processedData);
          setShowReport(true);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: salesData.map(data => data.seller),
    datasets: [
      {
        label: 'Total de Vendas (R$)',
        data: salesData.map(data => data.totalSales),
        backgroundColor: 'rgba(255, 138, 0, 0.5)',
        borderColor: '#FF8A00',
        borderWidth: 1,
      },
      {
        label: 'Comissão (R$)',
        data: salesData.map(data => data.totalCommission),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: '#4BC0C0',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Desempenho de Vendas por Vendedor',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `R$ ${value.toLocaleString()}`,
        },
      },
    },
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
              <option value="customers">Relatório de Clientes</option>
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

      {showReport && salesData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Relatório de Vendedores</h2>
          
          <div className="mb-8 h-96">
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total de Vendas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData.map((data) => (
                  <tr key={data.seller} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {data.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {data.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {data.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {data.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Implement PDF export functionality
                alert('Exportando relatório...');
              }}
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