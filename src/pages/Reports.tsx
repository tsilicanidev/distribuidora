import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, Download, Filter } from 'lucide-react';
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
    format?: (value: any, row?: any) => string;
  }[];
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    enddate: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
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
        // Fetch products with their sales and purchase data using explicit foreign key relationships
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            unit,
            sales_order_items:sales_order_items_product_id_fkey (
              quantity,
              unit_price,
              total_price,
              sales_order:sales_orders (
                status
              )
            ),
            customer_order_items:customer_order_items_product_id_fkey (
              quantity,
              unit_price,
              total_price,
              order:customer_orders (
                status
              )
            )
          `);

        if (productsError) throw productsError;

        if (!products || products.length === 0) {
          setError('Nenhum produto encontrado.');
          return;
        }

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

        // Take top 20 products for the chart
        const topProducts = productStats.slice(0, 20);

        data = {
          title: 'Relatório de Lucratividade por Produto',
          chartData: {
            labels: topProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
            datasets: [
              {
                label: 'Preço de Compra (R$)',
                data: topProducts.map(p => p.avgPurchasePrice),
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
              },
              {
                label: 'Preço de Venda (R$)',
                data: topProducts.map(p => p.avgSalePrice),
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
              },
              {
                label: 'Margem de Lucro (%)',
                data: topProducts.map(p => p.profitMargin),
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
      } else if (filters.type === 'all' || filters.type === 'sellers') {
        // Fetch sales orders with seller data
        const { data: orders, error: ordersError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            seller_id,
            seller:profiles(
              id,
              full_name,
              commission_rate
            ),
            total_amount,
            commission_amount,
            status,
            created_at
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
          setError('Nenhum pedido encontrado para o período selecionado.');
          return;
        }

        // Group orders by seller
        const sellerStats = orders.reduce((acc: any, order) => {
          const sellerName = order.seller?.full_name || 'Sem vendedor';
          const sellerId = order.seller?.id || 'unknown';
          
          if (!acc[sellerId]) {
            acc[sellerId] = {
              sellerId,
              sellerName,
              commissionRate: order.seller?.commission_rate || 5,
              orderCount: 0,
              totalAmount: 0,
              totalCommission: 0,
              completedOrders: 0,
              pendingOrders: 0,
              rejectedOrders: 0
            };
          }
          
          acc[sellerId].orderCount += 1;
          acc[sellerId].totalAmount += order.total_amount || 0;
          acc[sellerId].totalCommission += order.commission_amount || 0;
          
          if (order.status === 'completed') {
            acc[sellerId].completedOrders += 1;
          } else if (order.status === 'pending') {
            acc[sellerId].pendingOrders += 1;
          } else if (order.status === 'rejected') {
            acc[sellerId].rejectedOrders += 1;
          }
          
          return acc;
        }, {});

        // Convert to array and sort by total amount
        const sellerData = Object.values(sellerStats);
        sellerData.sort((a: any, b: any) => b.totalAmount - a.totalAmount);

        // Prepare chart data
        const sellerNames = sellerData.map((seller: any) => 
          seller.sellerName.length > 15 ? seller.sellerName.substring(0, 15) + '...' : seller.sellerName
        );
        const totalAmounts = sellerData.map((seller: any) => seller.totalAmount);
        const totalCommissions = sellerData.map((seller: any) => seller.totalCommission);

        data = {
          title: 'Relatório de Desempenho de Vendedores',
          chartData: {
            labels: sellerNames,
            datasets: [
              {
                label: 'Valor Total de Vendas (R$)',
                data: totalAmounts,
                backgroundColor: 'rgba(255, 138, 0, 0.8)', // Orange
              },
              {
                label: 'Comissões (R$)',
                data: totalCommissions,
                backgroundColor: 'rgba(75, 192, 192, 0.8)', // Teal
              }
            ],
          },
          tableData: sellerData,
          tableColumns: [
            { 
              header: 'Vendedor', 
              accessor: 'sellerName' 
            },
            { 
              header: 'Taxa de Comissão', 
              accessor: 'commissionRate',
              format: (value) => `${value}%`
            },
            { 
              header: 'Qtd. Pedidos', 
              accessor: 'orderCount' 
            },
            { 
              header: 'Pedidos Concluídos', 
              accessor: 'completedOrders' 
            },
            { 
              header: 'Pedidos Pendentes', 
              accessor: 'pendingOrders' 
            },
            { 
              header: 'Valor Total', 
              accessor: 'totalAmount',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Comissão Total', 
              accessor: 'totalCommission',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Média por Pedido', 
              accessor: 'totalAmount',
              format: (value, row) => `R$ ${(value / (row.orderCount || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
          ],
        };
      } else if (filters.type === 'all' || filters.type === 'inventory') {
        // Fetch stock movements
        const { data: movements, error: movementsError } = await supabase
          .from('stock_movements')
          .select(`
            id,
            product_id,
            quantity,
            type,
            created_at,
            product:products(
              name,
              unit,
              price
            )
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (movementsError) throw movementsError;

        if (!movements || movements.length === 0) {
          setError('Nenhuma movimentação de estoque encontrada para o período selecionado.');
          return;
        }

        // Group movements by product
        const productStats = movements.reduce((acc: any, movement) => {
          const productId = movement.product_id;
          const productName = movement.product?.name || 'Produto Desconhecido';
          
          if (!acc[productId]) {
            acc[productId] = {
              productId,
              productName,
              unit: movement.product?.unit || 'UN',
              price: movement.product?.price || 0,
              inQuantity: 0,
              outQuantity: 0,
              inValue: 0,
              outValue: 0,
              movementCount: 0
            };
          }
          
          acc[productId].movementCount += 1;
          
          if (movement.type === 'IN') {
            acc[productId].inQuantity += movement.quantity;
            acc[productId].inValue += movement.quantity * acc[productId].price;
          } else {
            acc[productId].outQuantity += movement.quantity;
            acc[productId].outValue += movement.quantity * acc[productId].price;
          }
          
          return acc;
        }, {});

        // Convert to array and sort by total movement value
        const productData = Object.values(productStats);
        productData.sort((a: any, b: any) => 
          (b.inValue + b.outValue) - (a.inValue + a.outValue)
        );

        // Group by month for the chart
        const monthlyData = movements.reduce((acc: any, movement) => {
          const month = new Date(movement.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!acc[month]) {
            acc[month] = {
              inQuantity: 0,
              outQuantity: 0,
            };
          }
          
          if (movement.type === 'IN') {
            acc[month].inQuantity += movement.quantity;
          } else {
            acc[month].outQuantity += movement.quantity;
          }
          
          return acc;
        }, {});

        const months = Object.keys(monthlyData);
        const inQuantities = months.map(month => monthlyData[month].inQuantity);
        const outQuantities = months.map(month => monthlyData[month].outQuantity);

        data = {
          title: 'Relatório de Movimentação de Estoque',
          chartData: {
            labels: months,
            datasets: [
              {
                label: 'Entradas',
                data: inQuantities,
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
              },
              {
                label: 'Saídas',
                data: outQuantities,
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
              }
            ],
          },
          tableData: productData,
          tableColumns: [
            { 
              header: 'Produto', 
              accessor: 'productName' 
            },
            { 
              header: 'Unidade', 
              accessor: 'unit' 
            },
            { 
              header: 'Preço', 
              accessor: 'price',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Qtd. Entrada', 
              accessor: 'inQuantity'
            },
            { 
              header: 'Valor Entrada', 
              accessor: 'inValue',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Qtd. Saída', 
              accessor: 'outQuantity'
            },
            { 
              header: 'Valor Saída', 
              accessor: 'outValue',
              format: (value) => `R$ ${value.toFixed(2)}`
            },
            { 
              header: 'Saldo Qtd.', 
              accessor: 'inQuantity',
              format: (value, row) => `${value - row.outQuantity}`
            },
            { 
              header: 'Saldo Valor', 
              accessor: 'inValue',
              format: (value, row) => `R$ ${(value - row.outValue).toFixed(2)}`
            }
          ],
        };
      } else if (filters.type === 'all' || filters.type === 'sales') {
        // Fetch sales orders
        const { data: orders, error: ordersError } = await supabase
          .from('sales_orders')
          .select(`
            id,
            number,
            customer:customers!sales_orders_customer_id_fkey(
              razao_social,
              cpf_cnpj
            ),
            seller:profiles(
              full_name
            ),
            total_amount,
            commission_amount,
            status,
            created_at,
            payment_method
          `)
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
          setError('Nenhum pedido encontrado para o período selecionado.');
          return;
        }

        // Group orders by payment method
        const paymentMethodStats = orders.reduce((acc: any, order) => {
          const paymentMethod = order.payment_method || 'Não informado';
          
          if (!acc[paymentMethod]) {
            acc[paymentMethod] = {
              paymentMethod,
              orderCount: 0,
              totalAmount: 0,
              completedOrders: 0,
              pendingOrders: 0,
              rejectedOrders: 0
            };
          }
          
          acc[paymentMethod].orderCount += 1;
          acc[paymentMethod].totalAmount += order.total_amount || 0;
          
          if (order.status === 'completed') {
            acc[paymentMethod].completedOrders += 1;
          } else if (order.status === 'pending') {
            acc[paymentMethod].pendingOrders += 1;
          } else if (order.status === 'rejected') {
            acc[paymentMethod].rejectedOrders += 1;
          }
          
          return acc;
        }, {});

        // Convert to array and sort by total amount
        const paymentData = Object.values(paymentMethodStats);
        paymentData.sort((a: any, b: any) => b.totalAmount - a.totalAmount);

        // Group by month for the chart
        const monthlyData = orders.reduce((acc: any, order) => {
          const month = new Date(order.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!acc[month]) {
            acc[month] = {
              totalAmount: 0,
              orderCount: 0,
            };
          }
          
          acc[month].totalAmount += order.total_amount || 0;
          acc[month].orderCount += 1;
          
          return acc;
        }, {});

        const months = Object.keys(monthlyData);
        const totalAmounts = months.map(month => monthlyData[month].totalAmount);
        const orderCounts = months.map(month => monthlyData[month].orderCount);

        // Format payment method names
        const formatPaymentMethod = (method: string) => {
          const methods: Record<string, string> = {
            'dinheiro': 'Dinheiro',
            'cartao_credito': 'Cartão de Crédito',
            'cartao_debito': 'Cartão de Débito',
            'pix': 'PIX',
            'boleto': 'Boleto Bancário',
            'transferencia': 'Transferência Bancária',
            'cheque': 'Cheque',
            'prazo': 'A Prazo',
            'Não informado': 'Não informado'
          };
          
          return methods[method] || method;
        };

        // Update payment method names in data
        const formattedPaymentData = paymentData.map((item: any) => ({
          ...item,
          paymentMethod: formatPaymentMethod(item.paymentMethod)
        }));

        data = {
          title: 'Relatório de Vendas por Forma de Pagamento',
          chartData: {
            labels: months,
            datasets: [
              {
                label: 'Valor Total (R$)',
                data: totalAmounts,
                backgroundColor: 'rgba(255, 138, 0, 0.8)', // Orange
              },
              {
                label: 'Quantidade de Pedidos',
                data: orderCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
              }
            ],
          },
          tableData: formattedPaymentData,
          tableColumns: [
            { 
              header: 'Forma de Pagamento', 
              accessor: 'paymentMethod' 
            },
            { 
              header: 'Qtd. Pedidos', 
              accessor: 'orderCount' 
            },
            { 
              header: 'Pedidos Concluídos', 
              accessor: 'completedOrders' 
            },
            { 
              header: 'Pedidos Pendentes', 
              accessor: 'pendingOrders' 
            },
            { 
              header: 'Pedidos Rejeitados', 
              accessor: 'rejectedOrders' 
            },
            { 
              header: 'Valor Total', 
              accessor: 'totalAmount',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Média por Pedido', 
              accessor: 'totalAmount',
              format: (value, row) => `R$ ${(value / (row.orderCount || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            }
          ],
        };
      } else if (filters.type === 'all' || filters.type === 'financial') {
        // Fetch sales orders for revenue
        const { data: salesOrders, error: salesError } = await supabase
          .from('sales_orders')
          .select('id, total_amount, created_at, status')
          .gte('created_at', filters.startDate)
          .lte('created_at', filters.endDate + 'T23:59:59')
          .order('created_at');

        if (salesError) throw salesError;

        // Fetch fiscal invoices for expenses
        const { data: fiscalInvoices, error: invoicesError } = await supabase
          .from('fiscal_invoices')
          .select('id, total_amount, issue_date, status')
          .gte('issue_date', filters.startDate)
          .lte('issue_date', filters.endDate + 'T23:59:59')
          .order('issue_date');

        if (invoicesError) throw invoicesError;

        if ((!salesOrders || salesOrders.length === 0) && (!fiscalInvoices || fiscalInvoices.length === 0)) {
          setError('Nenhum dado financeiro encontrado para o período selecionado.');
          return;
        }

        // Group by month
        const monthlyData: Record<string, { revenue: number; expenses: number; profit: number }> = {};

        // Process sales orders (revenue)
        salesOrders?.forEach(order => {
          const month = new Date(order.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
          }
          
          if (order.status === 'completed' || order.status === 'approved') {
            monthlyData[month].revenue += order.total_amount || 0;
          }
        });

        // Process fiscal invoices (expenses)
        fiscalInvoices?.forEach(invoice => {
          const month = new Date(invoice.issue_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
          }
          
          if (invoice.status === 'issued') {
            monthlyData[month].expenses += invoice.total_amount || 0;
          }
        });

        // Calculate profit
        Object.keys(monthlyData).forEach(month => {
          monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
        });

        // Sort months chronologically
        const months = Object.keys(monthlyData).sort((a, b) => {
          const dateA = new Date(a.split('/')[1], ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].indexOf(a.split(' ')[0].toLowerCase()), 1);
          const dateB = new Date(b.split('/')[1], ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].indexOf(b.split(' ')[0].toLowerCase()), 1);
          return dateA.getTime() - dateB.getTime();
        });

        const revenues = months.map(month => monthlyData[month].revenue);
        const expenses = months.map(month => monthlyData[month].expenses);
        const profits = months.map(month => monthlyData[month].profit);

        // Calculate totals
        const totalRevenue = revenues.reduce((sum, value) => sum + value, 0);
        const totalExpenses = expenses.reduce((sum, value) => sum + value, 0);
        const totalProfit = profits.reduce((sum, value) => sum + value, 0);

        // Prepare table data
        const tableData = months.map(month => ({
          month,
          revenue: monthlyData[month].revenue,
          expenses: monthlyData[month].expenses,
          profit: monthlyData[month].profit
        }));

        // Add total row
        tableData.push({
          month: 'TOTAL',
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalProfit
        });

        data = {
          title: 'Relatório Financeiro',
          chartData: {
            labels: months,
            datasets: [
              {
                label: 'Receitas (R$)',
                data: revenues,
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
              },
              {
                label: 'Despesas (R$)',
                data: expenses,
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
              },
              {
                label: 'Lucro (R$)',
                data: profits,
                backgroundColor: 'rgba(255, 138, 0, 0.8)', // Orange
              }
            ],
          },
          tableData: tableData,
          tableColumns: [
            { 
              header: 'Mês', 
              accessor: 'month' 
            },
            { 
              header: 'Receitas', 
              accessor: 'revenue',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Despesas', 
              accessor: 'expenses',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Lucro', 
              accessor: 'profit',
              format: (value) => `R$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            },
            { 
              header: 'Margem de Lucro', 
              accessor: 'profit',
              format: (value, row) => row.revenue > 0 ? `${((value / row.revenue) * 100).toFixed(2)}%` : '0.00%',
            }
          ],
        };
      }

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(`Error generating report:\n\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para exportar o relatório.');
      return;
    }
    
    // Generate HTML content
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
          }
          h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .print-button {
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            background-color: #FF8A00;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          @media print {
            .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>${reportData.title}</h1>
        
        <h2>Período: ${filters.startDate} a ${filters.endDate}</h2>
        
        <table>
          <thead>
            <tr>
              ${reportData.tableColumns.map(column => `<th>${column.header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${reportData.tableData.map(row => `
              <tr>
                ${reportData.tableColumns.map(column => {
                  const value = row[column.accessor];
                  return `<td>${column.format ? column.format(value, row) : value}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Relatório gerado em ${new Date().toLocaleString()}</p>
          <p>J&P Distribuidora de Alimentos</p>
        </div>
        
        <button class="print-button" onclick="window.print()">Imprimir Relatório</button>
      </body>
      </html>
    `;
    
    // Write content to the new window
    printWindow.document.write(content);
    printWindow.document.close();
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