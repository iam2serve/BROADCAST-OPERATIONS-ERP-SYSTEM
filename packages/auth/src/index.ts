export const permissions = {
  auditRead: 'audit.read',
  usersRead: 'users.read',
  usersCreate: 'users.create',
  usersUpdate: 'users.update',
  usersInvite: 'users.invite',
  usersManageStatus: 'users.manage_status',
  devicesCreate: 'devices.create',
  devicesRead: 'devices.read',
  devicesRetire: 'devices.retire',
  devicesUpdate: 'devices.update',
  devicesManageStatus: 'devices.manage_status',
  eventsAssignResources: 'events.assign_resources',
  eventsCancel: 'events.cancel',
  eventsCreate: 'events.create',
  eventsDelete: 'events.delete',
  eventsManageStatus: 'events.manage_status',
  eventsRead: 'events.read',
  eventsUpdate: 'events.update',
  assignmentsBulk: 'assignments.bulk',
  assignmentsCreate: 'assignments.create',
  assignmentsReassign: 'assignments.reassign',
  assignmentsRelease: 'assignments.release',
  availabilityRead: 'availability.read',
  expensesApprove: 'expenses.approve',
  expensesRead: 'expenses.read',
  expensesReimburse: 'expenses.reimburse',
  expensesReject: 'expenses.reject',
  expensesReview: 'expenses.review',
  expensesSubmit: 'expenses.submit',
  financeLock: 'finance.lock',
  financeManage: 'finance.manage',
  financeRead: 'finance.read',
  ledgerRead: 'ledger.read',
  payrollManage: 'payroll.manage',
  payrollRead: 'payroll.read',
  notificationsManage: 'notifications.manage',
  notificationsRead: 'notifications.read',
  reportsExport: 'reports.export',
  reportsRead: 'reports.read',
  automationManage: 'automation.manage',
  automationRead: 'automation.read',
  syncManage: 'sync.manage',
  analyticsRead: 'analytics.read',
  operatorsCreate: 'operators.create',
  operatorsRead: 'operators.read',
  operatorsUpdate: 'operators.update',
  operatorsAssign: 'operators.assign',
  routersAssign: 'routers.assign',
  routersCreate: 'routers.create',
  routersRead: 'routers.read',
  routersUpdate: 'routers.update',
  settingsManage: 'settings.manage',
  inventoryTelemetryIngest: 'inventory.telemetry.ingest',
  simsAssign: 'sims.assign',
  simsCreate: 'sims.create',
  simsRead: 'sims.read',
  simsUpdate: 'sims.update',
  simsViewSensitive: 'sims.view_sensitive',
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const systemRoles = [
  'SUPER_ADMIN',
  'TECHNICAL_MANAGER',
  'FINANCE_MANAGER',
  'OPERATOR',
  'VIEWER',
] as const;

export type SystemRole = (typeof systemRoles)[number];

export type AuthenticatedPrincipal = {
  userId: string;
  organizationId: string;
  branchId?: string | undefined;
  roleId: string;
  permissions: Permission[];
  sessionId: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function hasPermission(
  principal: Pick<AuthenticatedPrincipal, 'permissions'> | null | undefined,
  permission: Permission,
): boolean {
  return principal?.permissions.includes(permission) ?? false;
}

export function hasRole(
  principal: Pick<AuthenticatedPrincipal, 'roleId'> | null | undefined,
  role: SystemRole,
): boolean {
  return principal?.roleId === role;
}
