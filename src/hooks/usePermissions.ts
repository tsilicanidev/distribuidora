import { useRole } from './useRole';

interface Permissions {
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canManageDrivers: boolean;
  canViewReports: boolean;
  canApproveOrders: boolean;
  canManageCustomers: boolean;
  canManageDeliveries: boolean;
  canManageInvoices: boolean;
  canManageStock: boolean;
}

export function usePermissions(): Permissions {
  const { role } = useRole();

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isWarehouse = role === 'warehouse';

  return {
    canCreateProduct: isAdmin || isManager,
    canEditProduct: isAdmin || isManager,
    canDeleteProduct: isAdmin,
    canManageUsers: isAdmin,
    canManageVehicles: isAdmin || isManager,
    canManageDrivers: isAdmin || isManager,
    canViewReports: isAdmin || isManager,
    canApproveOrders: isAdmin || isManager,
    canManageCustomers: isAdmin || isManager,
    canManageDeliveries: isAdmin || isManager || isWarehouse,
    canManageInvoices: isAdmin || isManager,
    canManageStock: isAdmin || isManager || isWarehouse,
  };
}