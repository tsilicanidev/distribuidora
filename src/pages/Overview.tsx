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
  totalProducts: number;
  stockValue: number;
  lowStockItems: number;
  monthlyMovements: number;
  pendingOrders: number;
  totalCustomers: number;
  activeDrivers: number;
  availableVehicles: number;
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

function Overview() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    stockValue: 0,
    lowStockItems: 0,
    monthlyMovements: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    activeDrivers: 0,
    availableVehicles: 0
  });
  const [loading, setLoading] = useState(true);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    testDatabaseConnection();
    fetchDashboardData();
  }, []);

  async function testDatabaseConnection() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Erro ao conectar com o banco:', error);
        setDbError('Erro ao conectar com o banco de dados. Verifique o console para mais detalhes.');
        return;
      }

      console.log('Conexão com o banco de dados estabelecida com sucesso!');
      setDbError(null);
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setDbError('Erro ao testar conexão com o banco de dados. Verifique o console para mais detalhes.');
    }
  }

  async function fetchDashboardData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();

      const [
        { data: products, error: productsError },
        { data: movements, error: movementsError },
        { data: orders, error: ordersError },
        { data: lowStock, error: lowStockError },
        { data: pending, error: pendingError }
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase
          .from('stock_movements')
          .select('*')
          .gte('created_at', isoDate),
        supabase
          .from('sales_orders')
          .select('*')
          .eq('status', 'pending'),
        supabase
          .from('products')
          .select('*')
          .lt('stock_quantity', supabase.raw('min_stock')),
        supabase
          .from('sales_orders')
          .select(`
            *,
            customer:customers(razao_social)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ]);

      // Verifica erros
      if (productsError) throw productsError;
      if (movementsError) throw movementsError;
      if (ordersError) throw ordersError;
      if (lowStockError) throw lowStockError;
      if (pendingError) throw pendingError;

      if (products) {
        const totalValue = products.reduce((sum, product) => 
          sum + (product.price * product.stock_quantity), 0);
        
        const lowStockProds = products.filter(p => p.stock_quantity <= p.min_stock);

        setMetrics({
          totalProducts: products.length,
          stockValue: totalValue,
          lowStockItems: lowStockProds.length,
          monthlyMovements: movements?.length || 0,
          pendingOrders: orders?.length || 0,
          totalCustomers: 0,
          activeDrivers: 0,
          availableVehicles: 0
        });

        setLowStockProducts(lowStock || []);
        setPendingOrders(pending || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setDbError('Erro ao buscar dados do dashboard. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  }

  const stockMovementData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Entradas',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: '#FF8A00',
        backgroundColor: 'rgba(255, 138, 0, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Saídas',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: '#FF4B4B',
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const financialData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Receitas',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Despesas',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'Lucro',
        data: [0, 0, 0, 0, 0, 0],
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

      {/* Mensagem de erro do banco de dados */}
      {dbError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {dbError}
              </p>
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
                R$ {metrics.stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ArrowUpRight className="h-4 w-4 mr-1 text-green-500" />
            <span>{metrics.totalProducts} produtos cadastrados</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Movimentações</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.monthlyMovements}
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
                {metrics.lowStockItems}
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
                {metrics.pendingOrders}
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
                {metrics.totalCustomers}
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
                {metrics.activeDrivers}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Veículos Disponíveis</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.availableVehicles}
              </p>
            </div>
            <div className="p-3 bg-pink-100 rounded-lg">
              <Truck className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </div>
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
                      callback: (value) => `R$ ${value}`,
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
    </div>
  );
}

// Export both as default and named export
export default Overview;

export { Overview }