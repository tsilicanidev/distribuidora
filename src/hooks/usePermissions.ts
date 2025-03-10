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
  const isMaster = role === 'master';
  const isWarehouse = role === 'warehouse';

  return {
    canCreateProduct: isAdmin || isManager || isMaster,
    canEditProduct: isAdmin || isManager || isMaster,
    canDeleteProduct: isAdmin || isMaster,
    canManageUsers: isAdmin || isMaster,
    canManageVehicles: isAdmin || isManager || isMaster,
    canManageDrivers: isAdmin || isManager || isMaster,
    canViewReports: isAdmin || isManager || isMaster,
    canApproveOrders: isAdmin || isManager || isMaster,
    canManageCustomers: isAdmin || isManager || isMaster,
    canManageDeliveries: isAdmin || isManager || isWarehouse || isMaster,
    canManageInvoices: isAdmin || isManager || isMaster,
    canManageStock: isAdmin || isManager || isWarehouse || isMaster,
  };
}