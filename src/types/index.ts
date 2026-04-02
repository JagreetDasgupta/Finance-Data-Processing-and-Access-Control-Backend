export interface PaginationQuery {
  page?:  number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items:      T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface DateRange {
  from: Date;
  to:   Date;
}

export interface IdParam {
  id: string;
}

export type RoleName = 'viewer' | 'analyst' | 'admin';

export interface RoleDto {
  id:        string;
  name:      RoleName;
  createdAt: Date;
}

export interface AuthUser {
  id:       string;
  email:    string;
  roleId:   string;
  roleName: RoleName;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserDto {
  id:        string;
  name:      string;
  email:     string;
  status:    UserStatus;
  roleId:    string;
  roleName:  RoleName;
  createdAt: Date;
}

export type RecordType = 'INCOME' | 'EXPENSE';

export interface FinancialRecordDto {
  id:        string;
  amount:    string;
  type:      RecordType;
  category:  string;
  date:      string;
  notes:     string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardSummary {
  totalIncome:   string;
  totalExpenses: string;
  balance:       string;
  recordCount:   number;
  period: {
    from: string;
    to:   string;
  };
}

export interface CategoryTotal {
  category: string;
  type:     RecordType;
  total:    string;
  count:    number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
