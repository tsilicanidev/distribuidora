import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [location, isMobile]);

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
        className="mobile-menu-button"
        onClick={toggleSidebar}
        aria-label="Menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside className={`sidebar ${!isOpen ? 'closed' : ''} flex flex-col`}>
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
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <LayoutDashboard className="h-5 w-5 mr-3" />
            <span className="font-medium">Painel Principal</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <Package className="h-5 w-5 mr-3" />
            <span className="font-medium">Produtos</span>
          </NavLink>

          <NavLink
            to="/stock"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <TrendingUp className="h-5 w-5 mr-3" />
            <span className="font-medium">Estoque</span>
          </NavLink>

          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <Users className="h-5 w-5 mr-3" />
            <span className="font-medium">Clientes</span>
          </NavLink>

          <NavLink
            to="/drivers"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <UserSquare2 className="h-5 w-5 mr-3" />
            <span className="font-medium">Motoristas</span>
          </NavLink>

          <NavLink
            to="/invoice-entry"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <FileInput className="h-5 w-5 mr-3" />
            <span className="font-medium">Entrada de NF</span>
          </NavLink>

          <NavLink
            to="/delivery-notes"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <ClipboardList className="h-5 w-5 mr-3" />
            <span className="font-medium">Romaneios</span>
          </NavLink>

          <NavLink
            to="/fiscal-invoices"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <Receipt className="h-5 w-5 mr-3" />
            <span className="font-medium">Notas Fiscais</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <FileText className="h-5 w-5 mr-3" />
            <span className="font-medium">Relatórios</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} rounded-lg`
            }
          >
            <Settings className="h-5 w-5 mr-3" />
            <span className="font-medium">Configurações</span>
          </NavLink>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-gray-600 
                     hover:text-red-600 hover:bg-red-50 rounded-lg 
                     transition-all duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}