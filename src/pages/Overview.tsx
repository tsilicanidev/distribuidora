import React, { useState, useEffect } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FileText,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { LowStockModal } from '../components/LowStockModal';
import { PendingOrdersModal } from '../components/PendingOrdersModal';
import { AvailableDriversModal } from '../components/AvailableDriversModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardMetrics {
  total_products: number;
  stock_value: number;
  low_stock_items: number;
  monthly_movements: number;
  pending_orders: number;
  total_customers: number;
  active_drivers: number;
  available_vehicles: number;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock: number;
  max_stock: number | null;
  category: string;
}

interface Order {
  id: string;
  number: string;
  customer: {
    razao_social: string;
  };
  total_amount: number;
  created_at: string;
}

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  driver_status: string;
  vehicle?: {
    plate: string;
    model: string;
  };
}

interface ChartData {
  labels: string[];
  entries: number[];
  exits: number[];
  revenues: number[];
  expenses: number[];
  profits: number[];
}

function Overview() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_products: 0,
    stock_value: 0,
    low_stock_items: 0,
    monthly_movements: 0,
    pending_orders: 0,
    total_customers: 0,
    active_drivers: 0,
    available_vehicles: 0
  });
  const [loading, setLoading] = useState(true);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);
  const [showAvailableDriversModal, setShowAvailableDriversModal] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    entries: [],
    exits: [],
    revenues: [],
    expenses: [],
    profits: []
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch dashboard metrics
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_dashboard_data');

      if (dashboardError) throw dashboardError;

      if (dashboardData) {
        setMetrics(dashboardData);

        // Fetch low stock products
        const { data: lowStock, error: lowStockError } = await supabase
          .rpc('get_low_stock_products');

        if (lowStockError) {
          console.error('Erro ao buscar produtos com baixo estoque:', lowStockError);
        } else {
          setLowStockProducts(lowStock || []);
        }

        // Fetch pending orders - Fixed the relationship specification
        const { data: pending, error: pendingError } = await supabase
          .from('sales_orders')
          .select(`
            *,
            customer:customers!sales_orders_customer_id_fkey(razao_social)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (pendingError) {
          console.error('Erro ao buscar pedidos pendentes:', pendingError);
        } else {
          setPendingOrders(pending || []);
        }

        // Fetch available drivers - Updated to use the drivers table
        const { data: drivers, error: driversError } = await supabase
          .from('drivers')
          .select(`
            id,
            full_name,
            license_number,
            license_category,
            driver_status
          `)
          .eq('driver_status', 'available');

        if (driversError) {
          console.error('Erro ao buscar motoristas disponíveis:', driversError);
        } else {
          // Get vehicle assignments for these drivers
          const driverIds = drivers?.map(d => d.id) || [];
          
          if (driverIds.length > 0) {
            const { data: assignments, error: assignmentsError } = await supabase
              .from('driver_vehicles')
              .select(`
                driver_id,
                vehicle:vehicles (
                  plate,
                  model
                )
              `)
              .eq('status', 'active')
              .in('driver_id', driverIds);
              
            if (assignmentsError) {
              console.error('Erro ao buscar atribuições de veículos:', assignmentsError);
            } else {
              // Combine the data
              const driversWithVehicles = drivers.map(driver => ({
                ...driver,
                vehicle: assignments?.find(a => a.driver_id === driver.id)?.vehicle
              }));
              
              setAvailableDrivers(driversWithVehicles);
            }
          } else {
            setAvailableDrivers(drivers || []);
          }
        }

        // Fetch chart data for the last 6 months
        const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date;
        }).reverse();

        const labels = lastSixMonths.map(date => 
          date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        );

        const entries = [];
        const exits = [];
        const revenues = [];
        const expenses = [];
        const profits = [];

        for (const date of lastSixMonths) {
          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          // Get stock movements
          const { data: movements } = await supabase
            .from('stock_movements')
            .select('type, quantity')
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString());

          const monthEntries = movements?.filter(m => m.type === 'IN')
            .reduce((sum, m) => sum + m.quantity, 0) || 0;
          const monthExits = movements?.filter(m => m.type === 'OUT')
            .reduce((sum, m) => sum + m.quantity, 0) || 0;

          entries.push(monthEntries);
          exits.push(monthExits);

          // Get financial data
          const { data: sales } = await supabase
            .from('sales_orders')
            .select('total_amount')
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString())
            .eq('status', 'completed');

          const monthRevenue = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
          revenues.push(monthRevenue);

          // For this example, we'll estimate expenses as 70% of revenue
          const monthExpenses = monthRevenue * 0.7;
          expenses.push(monthExpenses);

          // Calculate profit
          profits.push(monthRevenue - monthExpenses);
        }

        setChartData({
          labels,
          entries,
          exits,
          revenues,
          expenses,
          profits
        });
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Erro ao buscar dados do dashboard. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const stockMovementData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Entradas',
        data: chartData.entries,
        borderColor: '#FF8A00',
        backgroundColor: 'rgba(255, 138, 0, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Saídas',
        data: chartData.exits,
        borderColor: '#FF4B4B',
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const financialData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Receitas',
        data: chartData.revenues,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Despesas',
        data: chartData.expenses,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'Lucro',
        data: chartData.profits,
        backgroundColor: 'rgba(255, 138, 0, 0.8)',
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF8A00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total em Estoque</p>
              <p className="text-2xl font-semibold text-gray-900">
                R$ {metrics.stock_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
            <span>{metrics.total_products} produtos cadastrados</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Movimentações</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.monthly_movements}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowUpRight className="h-4 w-4 mr-1 text-blue-500" />
            <span>Últimos 30 dias</span>
          </div>
        </div>

        <button 
          onClick={() => setShowLowStockModal(true)}
          className="dashboard-card hover:scale-105 transition-transform duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Estoque Baixo</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.low_stock_items}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowDownRight className="h-4 w-4 mr-1 text-red-500" />
            <span>Produtos precisam de reposição</span>
          </div>
        </button>

        <button
          onClick={() => setShowPendingOrdersModal(true)}
          className="dashboard-card hover:scale-105 transition-transform duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Pedidos Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.pending_orders}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowUpRight className="h-4 w-4 mr-1 text-yellow-500" />
            <span>Aguardando processamento</span>
          </div>
        </button>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.total_customers}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Motoristas Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.active_drivers}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAvailableDriversModal(true)}
          className="dashboard-card hover:scale-105 transition-transform duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Veículos Disponíveis</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.available_vehicles}
              </p>
            </div>
            <div className="p-3 bg-pink-100 rounded-lg">
              <Truck className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </button>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Movimentações de Estoque</h2>
          <div className="h-80">
            <Line
              data={stockMovementData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Desempenho Financeiro</h2>
          <div className="h-80">
            <Bar
              data={financialData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `R$ ${value.toLocaleString('pt-BR')}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Modais */}
      <LowStockModal
        isOpen={showLowStockModal}
        onClose={() => setShowLowStockModal(false)}
        products={lowStockProducts}
      />

      <PendingOrdersModal
        isOpen={showPendingOrdersModal}
        onClose={() => setShowPendingOrdersModal(false)}
        orders={pendingOrders}
      />

      <AvailableDriversModal
        isOpen={showAvailableDriversModal}
        onClose={() => setShowAvailableDriversModal(false)}
        drivers={availableDrivers}
      />
    </div>
  );
}

export default Overview;