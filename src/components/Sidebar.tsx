import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp,
  Users, 
  FileText,
  Settings,
  LogOut,
  Truck,
  FileInput,
  ClipboardList,
  Receipt,
  UserSquare2,
  Menu,
  X,
  Link,
  Building2,
  DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function Sidebar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { isSeller, isAdmin, isManager } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg text-gray-600 hover:bg-gray-50 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
        !isOpen ? '-translate-x-full' : 'translate-x-0'
      } lg:relative lg:translate-x-0`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FF8A00]/10 rounded-lg">
              <Truck className="h-8 w-8 text-[#FF8A00]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">J&P</h1>
              <p className="text-sm font-medium text-[#FF8A00]">Distribuidora</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1.5 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5 mr-3" />
            <span className="font-medium">Painel Principal</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
              }`
            }
          >
            <Package className="h-5 w-5 mr-3" />
            <span className="font-medium">Produtos</span>
          </NavLink>

          {!isSeller && (
            <NavLink
              to="/stock"
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                }`
              }
            >
              <TrendingUp className="h-5 w-5 mr-3" />
              <span className="font-medium">Estoque</span>
            </NavLink>
          )}

          <NavLink
            to="/sales"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
              }`
            }
          >
            <TrendingUp className="h-5 w-5 mr-3" />
            <span className="font-medium">Pedidos de Venda</span>
          </NavLink>

          {(isAdmin || isManager) && (
            <NavLink
              to="/customer-orders"
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                }`
              }
            >
              <Link className="h-5 w-5 mr-3" />
              <span className="font-medium">Pedidos Clientes</span>
            </NavLink>
          )}

          {!isSeller && (
            <>
              <NavLink
                to="/customers"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <Users className="h-5 w-5 mr-3" />
                <span className="font-medium">Clientes</span>
              </NavLink>

              <NavLink
                to="/suppliers"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <Building2 className="h-5 w-5 mr-3" />
                <span className="font-medium">Fornecedores</span>
              </NavLink>

              {(isAdmin || isManager) && (
                <NavLink
                  to="/sellers"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                    }`
                  }
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  <span className="font-medium">Vendedores</span>
                </NavLink>
              )}

              <NavLink
                to="/drivers"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <UserSquare2 className="h-5 w-5 mr-3" />
                <span className="font-medium">Motoristas</span>
              </NavLink>

              <NavLink
                to="/invoice-entry"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <FileInput className="h-5 w-5 mr-3" />
                <span className="font-medium">Entrada de NF</span>
              </NavLink>

              <NavLink
                to="/delivery-notes"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <ClipboardList className="h-5 w-5 mr-3" />
                <span className="font-medium">Romaneios</span>
              </NavLink>

              <NavLink
                to="/fiscal-invoices"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <Receipt className="h-5 w-5 mr-3" />
                <span className="font-medium">Notas Fiscais</span>
              </NavLink>

              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                  }`
                }
              >
                <FileText className="h-5 w-5 mr-3" />
                <span className="font-medium">Relatórios</span>
              </NavLink>

              {(isAdmin || isManager) && (
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 text-gray-600 hover:bg-[#FF8A00]/10 hover:text-[#FF8A00] rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : ''
                    }`
                  }
                >
                  <Settings className="h-5 w-5 mr-3" />
                  <span className="font-medium">Configurações</span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}