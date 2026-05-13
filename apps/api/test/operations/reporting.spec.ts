import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, expect, it, vi } from 'vitest';

import { ReportsService } from '../../src/modules/reports/reports.service.js';
import { ReportTypeDto } from '../../src/modules/reports/dto/report.dto.js';

const principal = { userId: 'admin', organizationId: 'org', roleId: 'SUPER_ADMIN', permissions: [], sessionId: 's' };

describe('ReportsService', () => {
  it('stores generated report results', async () => {
    const prisma = {
      expense: { groupBy: vi.fn().mockResolvedValue([{ category: 'FUEL', _count: 1 }]) },
      reportRun: { create: vi.fn().mockResolvedValue({ id: 'report-1' }) },
    };
    const service = new ReportsService(prisma as never, { record: vi.fn() } as never, { enqueue: vi.fn() } as never);

    await service.generate(principal, { reportType: ReportTypeDto.EXPENSE_BREAKDOWN }, {});

    expect(prisma.reportRun.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'COMPLETED' }) });
  });
});
