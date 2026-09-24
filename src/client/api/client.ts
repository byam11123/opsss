// OpsFlow 360 – API Client Service

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
  ITChecklistTask,
  ITDoer,
  ITChecklistSummary,
  PurchaseFMSSummary,
  PurchaseFMSFilterParams,
  PurchasePipelineItem,
} from '../../types';

class ApiClient {
  private currentUserId: string = 'usr-1'; // Default to Super Admin (Rajesh Sharma)

  setUserId(id: string) {
    this.currentUserId = id;
    localStorage.setItem('opsflow_current_user_id', id);
  }

  getUserId(): string {
    const saved = localStorage.getItem('opsflow_current_user_id');
    return saved || this.currentUserId;
  }

  public buildQueryString(params: Record<string, any> = {}): string {
    const cleanParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      if (
        val !== undefined &&
        val !== null &&
        val !== '' &&
        val !== 'ALL' &&
        val !== 'undefined' &&
        val !== 'null'
      ) {
        cleanParams[key] = String(val);
      }
    }
    return new URLSearchParams(cleanParams).toString();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'x-user-id': this.getUserId(),
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      const errorMsg = data.error?.message || `Request failed with status ${res.status}`;
      const err: any = new Error(errorMsg);
      err.code = data.error?.code;
      err.fields = data.error?.fields;
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  }

  // Auth & System
  async getCurrentUser(): Promise<{ user: User; permissions: string[]; roleDefinition: Role }> {
    return this.request('/api/auth/me');
  }

  async login(userId: string): Promise<{ user: User; permissions: string[]; accessToken: string }> {
    this.setUserId(userId);
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getMasterData(): Promise<{
    users: User[];
    roles: Role[];
    permissions: Permission[];
    departments: Department[];
    locations: Location[];
  }> {
    const [users, roles, permissions, departments, locations] = await Promise.all([
      this.request<User[]>('/api/users'),
      this.request<Role[]>('/api/roles'),
      this.request<Permission[]>('/api/permissions'),
      this.request<Department[]>('/api/departments'),
      this.request<Location[]>('/api/locations'),
    ]);
    return { users, roles, permissions, departments, locations };
  }

  async getSheetsStatus(): Promise<any> {
    return this.request('/api/sheets/status');
  }

  // Dashboard & Reports
  async getDashboardMetrics(): Promise<any> {
    return this.request('/api/reports/dashboard');
  }

  // Interbank Transfers
  async listInterbankTransfers(params: Record<string, any> = {}): Promise<PaginatedResult<InterbankTransfer>> {
    const query = this.buildQueryString(params);
    return this.request(`/api/interbank-transfers?${query}`);
  }

  async getInterbankTransfer(id: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}`);
  }

  async getInterbankHistory(id: string): Promise<PaymentStatusHistory[]> {
    return this.request(`/api/interbank-transfers/${id}/history`);
  }

  async createInterbankTransfer(data: Partial<InterbankTransfer>): Promise<InterbankTransfer> {
    return this.request('/api/interbank-transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewInterbankTransfer(id: string, remarks?: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async approveInterbankTransfer(id: string, remarks?: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async rejectInterbankTransfer(id: string, reason: string, remarks?: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, remarks }),
    });
  }

  async cancelInterbankTransfer(id: string, reason: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async startProcessingInterbankTransfer(id: string, remarks?: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/start-processing`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async completeInterbankTransfer(id: string, paymentReferenceNumber: string, processingRemarks?: string): Promise<InterbankTransfer> {
    return this.request(`/api/interbank-transfers/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ paymentReferenceNumber, processingRemarks }),
    });
  }

  async getInterbankSummary(): Promise<any> {
    return this.request('/api/interbank-transfers/summary');
  }

  // Beneficiaries
  async listBeneficiaries(params: Record<string, any> = {}): Promise<PaginatedResult<Beneficiary>> {
    const query = this.buildQueryString(params);
    return this.request(`/api/beneficiaries?${query}`);
  }

  async getBeneficiary(id: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}`);
  }

  async getBeneficiaryHistory(id: string): Promise<PaymentStatusHistory[]> {
    return this.request(`/api/beneficiaries/${id}/history`);
  }

  async createBeneficiary(data: Partial<Beneficiary>): Promise<Beneficiary> {
    return this.request('/api/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewBeneficiary(id: string, remarks?: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async approveBeneficiary(id: string, remarks?: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async rejectBeneficiary(id: string, reason: string, remarks?: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, remarks }),
    });
  }

  async cancelBeneficiary(id: string, reason: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async startBeneficiaryEntry(id: string, remarks?: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/start-entry`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async completeBeneficiaryEntry(id: string, entryReferenceNumber: string, entryRemarks?: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/complete-entry`, {
      method: 'POST',
      body: JSON.stringify({ entryReferenceNumber, entryRemarks }),
    });
  }

  async markBeneficiaryFailed(id: string, remarks: string): Promise<Beneficiary> {
    return this.request(`/api/beneficiaries/${id}/mark-failed`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async getBeneficiarySummary(): Promise<any> {
    return this.request('/api/beneficiaries/summary');
  }

  // Vendor Payments
  async listVendorPayments(params: Record<string, any> = {}): Promise<PaginatedResult<VendorPayment>> {
    const query = this.buildQueryString(params);
    return this.request(`/api/vendor-payments?${query}`);
  }

  async getVendorPaymentSummary(): Promise<any> {
    return this.request('/api/vendor-payments/summary');
  }

  async getVendorPayment(id: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}`);
  }

  async getVendorPaymentHistory(id: string): Promise<PaymentStatusHistory[]> {
    return this.request(`/api/vendor-payments/${id}/history`);
  }

  async createVendorPayment(data: Partial<VendorPayment>): Promise<VendorPayment> {
    return this.request('/api/vendor-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewVendorPayment(id: string, remarks?: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async approveVendorPayment(id: string, remarks?: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async rejectVendorPayment(id: string, reason: string, remarks?: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, remarks }),
    });
  }

  async cancelVendorPayment(id: string, reason: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async startVendorPaymentEntry(id: string, remarks?: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/start-payment-entry`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async completeVendorPaymentEntry(id: string, paymentReferenceNumber?: string, paymentEntryRemarks?: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/complete-payment-entry`, {
      method: 'POST',
      body: JSON.stringify({ paymentReferenceNumber, paymentEntryRemarks }),
    });
  }

  async markVendorPaymentPaid(
    id: string,
    paymentReferenceNumber: string,
    paymentRemarks?: string,
    verificationRemarks?: string,
    paymentProofFileIds?: string[]
  ): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({
        paymentReferenceNumber,
        paymentRemarks,
        verificationRemarks,
        paymentProofFileIds,
      }),
    });
  }

  async markVendorPaymentFailed(id: string, remarks: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/mark-failed`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  async markVendorPaymentReversed(id: string, remarks: string): Promise<VendorPayment> {
    return this.request(`/api/vendor-payments/${id}/mark-reversed`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  }

  // Audit Logs
  async listAuditLogs(params: Record<string, any> = {}): Promise<PaginatedResult<AuditLog>> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/audit-logs?${query}`);
  }

  // Notifications
  async listNotifications(): Promise<AppNotification[]> {
    return this.request('/api/notifications');
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.request(`/api/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request('/api/notifications/read-all', { method: 'POST' });
  }

  // Reports & Exports
  async getPaymentReport(params: Record<string, any> = {}): Promise<any> {
    const res = await this.listVendorPayments(params);
    const totalAmount = (res.items || []).reduce((sum, p) => sum + p.amountToBePaid, 0);
    const paidAmount = (res.items || [])
      .filter(p => p.paymentStatus === 'PAID')
      .reduce((sum, p) => sum + p.amountToBePaid, 0);

    return {
      items: res.items,
      summary: {
        count: res.pagination?.totalItems || res.items.length,
        totalAmount,
        paidAmount,
      },
    };
  }

  async exportPaymentsCsv(params: Record<string, any> = {}): Promise<string> {
    const query = new URLSearchParams(params).toString();
    const headers: Record<string, string> = {
      'x-user-id': this.getUserId(),
    };

    const res = await fetch(`/api/reports/export/csv?${query}`, { headers });
    return res.text();
  }

  // Google Sheets Database Status & Sync
  async syncSheets(): Promise<any> {
    return this.request('/api/sheets/sync', { method: 'POST' });
  }

  // File Upload
  async uploadFile(file: File, folder: string = 'VENDOR_PAYMENT'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // IT Checklist Module
  async listITTasks(params: Record<string, any> = {}): Promise<PaginatedResult<ITChecklistTask>> {
    const query = this.buildQueryString(params);
    return this.request(`/api/it-checklist/tasks?${query}`);
  }

  async getITChecklistSummary(): Promise<ITChecklistSummary> {
    return this.request('/api/it-checklist/summary');
  }

  async getITDoers(): Promise<ITDoer[]> {
    return this.request('/api/it-checklist/doers');
  }

  async completeITTask(taskId: string, data: { remarks?: string; actualDate?: string } = {}): Promise<ITChecklistTask> {
    return this.request(`/api/it-checklist/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncITChecklist(): Promise<any> {
    return this.request('/api/it-checklist/sync', { method: 'POST' });
  }

  // Purchase FMS Module
  async getPurchaseFMSSummary(): Promise<PurchaseFMSSummary> {
    return this.request('/api/purchase-fms/summary');
  }

  async getPurchaseFMSPipeline(params: PurchaseFMSFilterParams = {}): Promise<PaginatedResult<PurchasePipelineItem>> {
    const query = this.buildQueryString(params as any);
    return this.request(`/api/purchase-fms/pipeline?${query}`);
  }
}

export const api = new ApiClient();
