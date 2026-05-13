export const apiVersion = 'v1';

export enum SalaryType {
  DAILY = 'DAILY',
  EVENT = 'EVENT',
  MONTHLY = 'MONTHLY',
  HYBRID = 'HYBRID',
}

export enum Carrier {
  VODAFONE = 'VODAFONE',
  ORANGE = 'ORANGE',
  ETISALAT = 'ETISALAT',
  WE = 'WE',
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  FOOD = 'FOOD',
  HOTEL = 'HOTEL',
  TRANSPORTATION = 'TRANSPORTATION',
  INTERNET = 'INTERNET',
  SIM_RECHARGE = 'SIM_RECHARGE',
  REPAIR = 'REPAIR',
  EMERGENCY = 'EMERGENCY',
  MISC = 'MISC',
}

export enum DeviceType {
  LIVEU = 'LIVEU',
  TVU = 'TVU',
  DEJERO = 'DEJERO',
  SRT = 'SRT',
  CUSTOM = 'CUSTOM',
}

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
  RETIRED = 'RETIRED',
}

export enum MaintenanceStatus {
  OK = 'OK',
  DUE = 'DUE',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
}

export enum AssetType {
  DEVICE = 'DEVICE',
  SIM = 'SIM',
  ROUTER = 'ROUTER',
  OPERATOR = 'OPERATOR',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AssignmentStatus {
  RESERVED = 'RESERVED',
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
}

export enum PreferredLanguage {
  EN = 'EN',
  AR = 'AR',
}

export enum ThemePreference {
  SYSTEM = 'SYSTEM',
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
    pagination?: PaginationMeta;
  };
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  organizationId: string;
  branchId?: string | null;
  status: string;
  role: {
    id: string;
    name: string;
    permissions: Array<{
      permission: {
        key: string;
      };
    }>;
  };
  operatorProfile?: {
    id: string;
    status: string;
  } | null;
};

export type LoginResponse = {
  user: AuthUser | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};
