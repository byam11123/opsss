// OpsFlow 360 – Core Domain Models & Type Definitions

export type RoleType =
  | 'SUPER_ADMIN'
  | 'MANAGEMENT_VIEWER'
  | 'EMPLOYEE_REQUESTER'
  | 'DEPARTMENT_MANAGER'
  | 'FINANCE_APPROVER'
  | 'BENEFICIARY_ENTRY_USER'
  | 'PAYMENT_ENTRY_USER'
  | 'PAYMENT_VERIFIER'
  | 'AUDITOR_VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  department: string;
  location: string;
  phone?: string;
  active: boolean;
  avatarUrl?: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  code: RoleType;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface Permission {
  code: string;
  name: string;
  module: 'auth' | 'interbank' | 'beneficiary' | 'vendor_payment' | 'system' | 'reports' | 'audit';
  description: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headUserId?: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  state: string;
  active?: boolean;
}

// ==========================================
// INTERBANK TRANSFER
// ==========================================

export type InterbankStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'HOLD';

export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface InterbankTransfer {
  // Primary Sheet Columns
  sheetNo: string;                   // Sheet No. e.g. BPL/BANK/20260905/01
  timestamp: string;                 // Submission timestamp
  transferFrom: string;              // Account name/number
  transferTo: string;                // Account name/number
  purpose: string;
  requestedBy: string;               // Display name
  site: string;                      // Location
  amount: number;
  remarks?: string;
  status: InterbankStatus;
  approvalTimestamp?: string;

  // System & Tracking Columns
  id: string;                        // Internal UUID
  requestedByUserId: string;
  department: string;
  priority: PriorityLevel;
  attachmentFileIds: string[];
  approvalLevel?: number;
  approvalRemarks?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  paymentReferenceNumber?: string;
  processingRemarks?: string;
  completedTimestamp?: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  recordVersion: number;
  active: boolean;
  archived: boolean;
}

// ==========================================
// BENEFICIARY
// ==========================================

export type BeneficiaryApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'NOT_APPROVED'
  | 'HOLD';

export type BeneficiaryAdditionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'FAILED'
  | 'CANCELLED'
  | 'HOLD';

export interface Beneficiary {
  // Primary Sheet Columns
  sheetNo: string;                   // e.g. BPL/BEN/20260905/01
  timestamp: string;
  nameOfBeneficiary: string;
  accountNo: string;
  ifscCode: string;
  bankName: string;
  purpose: string;
  cancelledChequeUrl?: string;
  remark?: string;
  status: BeneficiaryApprovalStatus;
  approvalTimestamp?: string;
  beneficiaryEntry?: string;         // 'Not Started' | 'In Progress' | 'Done' | 'Failed'
  beneficiaryEntryTimestamp?: string;
  additionStatus: BeneficiaryAdditionStatus;
  additionTimestamp?: string;

  // System & Tracking Columns
  id: string;
  submittedByUserId: string;
  department: string;
  rejectionReason?: string;
  cancellationReason?: string;
  entryReferenceNumber?: string;
  entryRemarks?: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  recordVersion: number;
  active: boolean;
  archived: boolean;
}

// ==========================================
// VENDOR PAYMENT
// ==========================================

export type VendorPaymentApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'HOLD';

export type PaymentEntryStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'FAILED'
  | 'CANCELLED'
  | 'HOLD';

export type PaymentStatus =
  | 'NOT_PAID'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REVERSED'
  | 'CANCELLED'
  | 'HOLD';

export type PaymentMode = 'ACCOUNT' | 'NEFT' | 'RTGS' | 'IMPS' | 'CHEQUE' | 'CASH' | 'WALLET' | 'UPI';

export interface VendorPayment {
  // Primary Sheet Columns
  sheetNo: string;                   // e.g. BPL/PAY/20260905/01
  timestamp: string;
  vendorName: string;
  beneficiaryId?: string;
  billNoPO: string;
  purposeOfPayment: string;
  requestedBy: string;
  site: string;
  modeOfPayment: PaymentMode;
  poBillInvoiceUrl?: string;
  amountToBePaid: number;
  remark?: string;
  status: VendorPaymentApprovalStatus;
  approvalTimestamp?: string;
  paymentEntry: PaymentEntryStatus;
  paymentEntryTimestamp?: string;
  paymentStatus: PaymentStatus;
  paymentDoneTimestamp?: string;
  paymentRemarks?: string;

  // System & Tracking Columns
  id: string;
  submittedByUserId: string;
  department: string;
  paymentReferenceNumber?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  approvalRemarks?: string;
  paymentEntryRemarks?: string;
  paymentVerificationRemarks?: string;
  paymentProofFileIds?: string[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  recordVersion: number;
  active: boolean;
  archived: boolean;
}

// ==========================================
// HISTORY, AUDIT & NOTIFICATIONS
// ==========================================

export interface PaymentStatusHistory {
  id: string;
  recordType: 'INTERBANK' | 'BENEFICIARY' | 'VENDOR_PAYMENT';
  recordId: string;
  sheetNo: string;
  oldStatus: string;
  newStatus: string;
  changedByUserId: string;
  changedByName: string;
  remarks?: string;
  timestamp: string;
}

export type AuditAction =
  | 'CREATE'
  | 'SUBMIT'
  | 'VIEW'
  | 'UPDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'START_PROCESSING'
  | 'COMPLETE'
  | 'START_BENEFICIARY_ENTRY'
  | 'COMPLETE_BENEFICIARY_ENTRY'
  | 'START_PAYMENT_ENTRY'
  | 'COMPLETE_PAYMENT_ENTRY'
  | 'MARK_PAID'
  | 'MARK_FAILED'
  | 'MARK_REVERSED'
  | 'UPLOAD_FILE'
  | 'DOWNLOAD_FILE'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ROLE_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'STATUS_OVERRIDE';

export interface AuditLog {
  auditId: string;
  recordType: string;
  recordId: string;
  sheetNo: string;
  action: AuditAction;
  oldValueJson?: string;
  newValueJson?: string;
  oldStatus?: string;
  newStatus?: string;
  remarks?: string;
  performedByUserId: string;
  performedByName: string;
  userRole: string;
  timestamp: string;
  ipAddress?: string;
  deviceInformation?: string;
  requestId?: string;
  module: string;
  successFlag: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'TASK';
  referenceType?: 'INTERBANK' | 'BENEFICIARY' | 'VENDOR_PAYMENT' | 'SYSTEM';
  referenceId?: string;
  sheetNo?: string;
  readStatus: boolean;
  createdAt: string;
  readAt?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  driveFileId?: string;
  downloadUrl: string;
  folder: 'INTERBANK' | 'BENEFICIARY' | 'VENDOR_PAYMENT' | 'PAYMENT_PROOF' | 'REPORTS';
  uploadedByUserId: string;
  uploadedByName: string;
  createdAt: string;
}

export interface SequenceCounter {
  prefixKey: string; // e.g. BANK:20260905
  currentValue: number;
  lastUpdated: string;
}

// ==========================================
// API & PAGINATION
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: string[];
  };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ==========================================
// IT CHECKLIST MODULE
// ==========================================

export type ITFrequency = 'W' | 'M' | 'D' | 'Q';
export type ITTaskStatus = 'Done' | 'Pending' | 'Overdue';

export interface ITChecklistTask {
  id: string;                      // Unique ID / Task ID
  taskId: string;                  // Numeric string e.g. "270"
  doerName: string;                // e.g. "Amanat Bharadwaj (8084801020)"
  doerEmail: string;               // e.g. "rws.store1@gmail.com"
  department: string;              // e.g. "Store in charge", "IT Eng."
  frequency: ITFrequency;          // 'W' = Weekly, 'M' = Monthly
  task: string;                    // Task name e.g. "All Computer/Laptop Cleaning (CSR)"
  site: string;                    // Extracted/mapped site e.g. "CSR / Siladehi", "Raipur Office"
  equipmentType: string;           // "Computer/Laptop", "CCTV Camera", "Switch/Modem", "Intercom", "Printer/Cartridge", "Other"
  plannedDate: string;             // DD/MM/YYYY
  actualDate?: string;             // DD/MM/YYYY or timestamp
  status: ITTaskStatus;            // 'Done' | 'Pending' | 'Overdue'
  email?: string;
  buddyEmail?: string;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
}

export interface ITDoer {
  name: string;
  department: string;
  email: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
  complianceRate: number;         // 0 to 100 percentage
}

export interface ITChecklistSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  weeklyTasks: number;
  monthlyTasks: number;
  overallComplianceRate: number;
  doersCount: number;
  sitesCount: number;
}

export interface ITChecklistFilterParams {
  search?: string;
  doerName?: string;
  site?: string;
  frequency?: string;
  status?: string;
  equipmentType?: string;
  page?: number;
  pageSize?: number;
}

// ==========================================
// PURCHASE FMS MODULE
// ==========================================

export type PurchasePipelineStatus = 'Pending PO' | 'Pending Material' | 'Pending Dispatch' | 'Completed';

export interface PurchaseStage {
  id: string;
  sheet: 'Indent' | 'PO' | 'Store';
  name: string;
  responsible: string;
  plannedDate: string;
  actualDate: string;
  status: string;
  delay: string;
}

export interface PurchasePipelineItem {
  id: string;
  requisitionNo?: string;
  indentNo: string;
  indentDate: string;
  siteName: string;
  priority: string;

  poNumber?: string;
  vendorName?: string;
  poDate?: string;

  poGenerated: boolean;
  materialReceived: boolean;
  dispatched: boolean;

  status: PurchasePipelineStatus;
  
  stages: PurchaseStage[];
  
  currentBottleneck?: {
    stageName: string;
    responsible: string;
    delay: string;
    sheet: string;
  };
}

export interface PurchaseFMSSummary {
  totalIndents: number;
  poGenerated: number;
  materialReceived: number;
  dispatched: number;
  pendingPO: number;
  pendingMaterial: number;
  pendingDispatch: number;
}

export interface PurchaseFMSFilterParams {
  search?: string;
  siteName?: string;
  priority?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  pageSize?: number;
}

