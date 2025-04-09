import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Products } from './Products';
import { StockMovements } from './StockMovements';
import Overview from './Overview';
import { Customers } from './Customers';
import { Reports } from './Reports';
import { InvoiceEntry } from './InvoiceEntry';
import { DeliveryNotes } from './DeliveryNotes';
import { FiscalInvoices } from './FiscalInvoices';
import { Settings } from './Settings';
import { Drivers } from './Drivers';
import { SalesOrders } from './SalesOrders';
import { DeliveryRoutes } from './DeliveryRoutes';
import CustomerOrderLinks from './CustomerOrderLinks';
import { Suppliers } from './Suppliers';
import { Sellers } from './Sellers';
import { useAuth } from '../hooks/useAuth';

function Dashboard() {
  const { isAdmin, isManager } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-fadeIn">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock" element={<StockMovements />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/routes" element={<DeliveryRoutes />} />
              <Route path="/invoice-entry" element={<InvoiceEntry />} />
              <Route path="/delivery-notes" element={<DeliveryNotes />} />
              <Route path="/fiscal-invoices" element={<FiscalInvoices />} />
              <Route path="/reports" element={<Reports />} />
              <Route 
                path="/settings" 
                element={
                  isAdmin || isManager ? <Settings /> : <Navigate to="/" replace />
                } 
              />
              <Route path="/sales" element={<SalesOrders />} />
              <Route path="/customer-orders" element={<CustomerOrderLinks />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;