import { permissions, type Permission } from '@broadcast/auth';

export type NavigationItem = {
  label: string;
  href: string;
  permission?: Permission;
};

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/users', permission: permissions.usersRead },
  { label: 'Operators', href: '/operators', permission: permissions.operatorsRead },
  { label: 'Events', href: '/events', permission: permissions.eventsRead },
  { label: 'Devices', href: '/devices', permission: permissions.devicesRead },
  { label: 'SIM Cards', href: '/sims', permission: permissions.simsRead },
  { label: 'Routers', href: '/routers', permission: permissions.routersRead },
  { label: 'Operations', href: '/events', permission: permissions.eventsRead },
  { label: 'Inventory', href: '/inventory', permission: permissions.devicesRead },
  { label: 'Expenses', href: '/expenses', permission: permissions.expensesRead },
  { label: 'Payroll', href: '/payroll', permission: permissions.payrollRead },
  { label: 'Finance', href: '/finance', permission: permissions.financeRead },
  { label: 'Notifications', href: '/notifications', permission: permissions.notificationsRead },
  { label: 'Reports', href: '/reports', permission: permissions.reportsRead },
  { label: 'Automation', href: '/automation', permission: permissions.automationRead },
  { label: 'Sync', href: '/sync', permission: permissions.syncManage },
  { label: 'Analytics', href: '/analytics', permission: permissions.analyticsRead },
  { label: 'Settings', href: '/settings', permission: permissions.settingsManage },
];

export function filterNavigation(
  items: NavigationItem[],
  userPermissions: readonly string[],
): NavigationItem[] {
  return items.filter((item) => !item.permission || userPermissions.includes(item.permission));
}
