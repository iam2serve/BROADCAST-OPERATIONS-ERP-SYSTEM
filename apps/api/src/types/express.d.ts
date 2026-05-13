declare namespace Express {
  export interface Request {
    requestId?: string;
    cookies?: Record<string, string | undefined>;
    user?: {
      userId: string;
      organizationId: string;
      branchId?: string | undefined;
      roleId: string;
      permissions: string[];
      sessionId: string;
    };
  }
}
