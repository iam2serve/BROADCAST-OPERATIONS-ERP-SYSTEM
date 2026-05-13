import { permissions, systemRoles } from '@broadcast/auth';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const rolePermissionMap: Record<(typeof systemRoles)[number], string[]> = {
  SUPER_ADMIN: Object.values(permissions),
  TECHNICAL_MANAGER: [
    permissions.eventsRead,
    permissions.eventsCreate,
    permissions.eventsUpdate,
    permissions.eventsManageStatus,
    permissions.eventsAssignResources,
    permissions.assignmentsCreate,
    permissions.assignmentsRelease,
    permissions.assignmentsReassign,
    permissions.assignmentsBulk,
    permissions.availabilityRead,
    permissions.devicesRead,
    permissions.devicesCreate,
    permissions.devicesUpdate,
    permissions.simsRead,
    permissions.simsCreate,
    permissions.simsUpdate,
    permissions.simsAssign,
    permissions.routersRead,
    permissions.routersCreate,
    permissions.routersUpdate,
    permissions.routersAssign,
    permissions.operatorsRead,
    permissions.notificationsRead,
    permissions.notificationsManage,
    permissions.reportsRead,
    permissions.automationRead,
    permissions.syncManage,
    permissions.analyticsRead,
  ],
  FINANCE_MANAGER: [
    permissions.eventsRead,
    permissions.availabilityRead,
    permissions.expensesReview,
    permissions.expensesRead,
    permissions.expensesApprove,
    permissions.expensesReject,
    permissions.expensesReimburse,
    permissions.financeRead,
    permissions.financeManage,
    permissions.financeLock,
    permissions.ledgerRead,
    permissions.payrollRead,
    permissions.payrollManage,
    permissions.operatorsRead,
    permissions.notificationsRead,
    permissions.notificationsManage,
    permissions.reportsRead,
    permissions.reportsExport,
    permissions.automationRead,
    permissions.automationManage,
    permissions.analyticsRead,
  ],
  OPERATOR: [
    permissions.eventsRead,
    permissions.availabilityRead,
    permissions.devicesRead,
    permissions.simsRead,
    permissions.routersRead,
    permissions.expensesSubmit,
    permissions.expensesRead,
    permissions.notificationsRead,
    permissions.syncManage,
  ],
  VIEWER: [
    permissions.eventsRead,
    permissions.availabilityRead,
    permissions.devicesRead,
    permissions.simsRead,
    permissions.routersRead,
    permissions.operatorsRead,
    permissions.financeRead,
    permissions.notificationsRead,
    permissions.reportsRead,
    permissions.analyticsRead,
  ],
};

async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Default Organization',
    },
  });

  await Promise.all(
    Object.entries(permissions).map(([key, value]) =>
      prisma.permission.upsert({
        where: { key: value },
        update: { description: key },
        create: { key: value, description: key },
      }),
    ),
  );

  for (const roleName of systemRoles) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: roleName,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        name: roleName,
        description: roleName.replaceAll('_', ' '),
      },
    });

    const permissionRows = await prisma.permission.findMany({
      where: { key: { in: rolePermissionMap[roleName] } },
    });

    await Promise.all(
      permissionRows.map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        }),
      ),
    );
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const superAdminName = process.env.SUPER_ADMIN_NAME ?? 'System Administrator';

  if (superAdminEmail && superAdminPassword) {
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: 'SUPER_ADMIN',
        },
      },
    });

    await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: superAdminEmail.toLowerCase(),
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        email: superAdminEmail.toLowerCase(),
        fullName: superAdminName,
        passwordHash: await argon2.hash(superAdminPassword),
        roleId: superAdminRole.id,
      },
    });
  }
}

await main();
await prisma.$disconnect();
