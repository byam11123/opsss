// OpsFlow 360 – Payment Repository Abstraction Interface

import {
  InterbankTransfer,
  Beneficiary,
  VendorPayment,
  AuditLog,
  PaymentStatusHistory,
  AppNotification,
  User,
  Role,
  Permission,
  Department,
  Location,
  PaginatedResult,
} from '../../types';

export interface FilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  department?: string;
  site?: string;
  requestedByUserId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  modeOfPayment?: string;
  priority?: string;
  additionStatus?: string;
  paymentEntryStatus?: string;
  paymentStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  entityType?: string;
  action?: string;
}

export interface PaymentRepository {
  // Sequence counter
  generateNextSheetNumber(type: 'BANK' | 'BEN' | 'PAY'): Promise<string>;

  // Interbank Transfers
  createInterbankTransfer(
    input: Partial<InterbankTransfer>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<InterbankTransfer>;
  getInterbankTransferById(idOrSheetNo: string): Promise<InterbankTransfer | null>;
  listInterbankTransfers(filters: FilterParams): Promise<PaginatedResult<InterbankTransfer>>;
  getInterbankSummary?(): Promise<any>;
  updateInterbankTransfer(
    id: string,
    updates: Partial<InterbankTransfer>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<InterbankTransfer>;

  // Beneficiaries
  createBeneficiary(
    input: Partial<Beneficiary>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<Beneficiary>;
  getBeneficiaryById(idOrSheetNo: string): Promise<Beneficiary | null>;
  listBeneficiaries(filters: FilterParams): Promise<PaginatedResult<Beneficiary>>;
  getBeneficiarySummary?(): Promise<any>;
  updateBeneficiary(
    id: string,
    updates: Partial<Beneficiary>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<Beneficiary>;

  // Vendor Payments
  createVendorPayment(
    input: Partial<VendorPayment>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<VendorPayment>;
  getVendorPaymentById(idOrSheetNo: string): Promise<VendorPayment | null>;
  listVendorPayments(filters: FilterParams): Promise<PaginatedResult<VendorPayment>>;
  getVendorPaymentSummary?(): Promise<any>;
  updateVendorPayment(
    id: string,
    updates: Partial<VendorPayment>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<VendorPayment>;

  // Audit Logs & Status History
  createAuditLog(entry: Omit<AuditLog, 'auditId' | 'timestamp'>): Promise<AuditLog>;
  listAuditLogs(filters: FilterParams): Promise<PaginatedResult<AuditLog>>;
  getStatusHistory(recordType: string, recordId: string): Promise<PaymentStatusHistory[]>;

  // Notifications
  listNotifications(userId: string): Promise<AppNotification[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
  createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'readStatus'>): Promise<AppNotification>;

  // Master Data & Users
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getRoles(): Promise<Role[]>;
  getPermissions(): Promise<Permission[]>;
  getDepartments(): Promise<Department[]>;
  getLocations(): Promise<Location[]>;

  // IT Checklist
  listITTasks?(filters: any): Promise<any>;
  getITChecklistSummary?(): Promise<any>;
  getITDoers?(): Promise<any>;
  completeITTask?(taskId: string, userId: string, userName: string, remarks?: string, actualDate?: string): Promise<any>;
  syncITChecklist?(): Promise<any>;
}
