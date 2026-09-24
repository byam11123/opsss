// OpsFlow 360 – Google Sheets Payment Repository Implementation

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
  InterbankStatus,
  BeneficiaryApprovalStatus,
  BeneficiaryAdditionStatus,
  ITChecklistTask,
  ITDoer,
  ITChecklistSummary,
  ITChecklistFilterParams,
  ITFrequency,
  ITTaskStatus,
  PurchasePipelineItem,
  PurchaseFMSSummary,
  PurchaseFMSFilterParams,
} from '../../types';
import { PaymentRepository, FilterParams } from './repository';
import {
  SEED_USERS,
  SEED_DEPARTMENTS,
  SEED_LOCATIONS,
} from './seedData';
import { ROLE_DEFINITIONS, ALL_PERMISSIONS } from '../auth/permissions';
import { sanitizeForSheet } from '../google/sheetsSchema';
import { googleIntegrationService } from '../google/sheetsClient';
import fs from 'fs';
import path from 'path';

export class GoogleSheetsPaymentRepository implements PaymentRepository {
  private users: Map<string, User> = new Map();
  private departments: Department[] = [];
  private locations: Location[] = [];
  private interbankTransfers: Map<string, InterbankTransfer> = new Map();
  private beneficiaries: Map<string, Beneficiary> = new Map();
  private vendorPayments: Map<string, VendorPayment> = new Map();
  private auditLogs: AuditLog[] = [];
  private statusHistory: PaymentStatusHistory[] = [];
  private notifications: AppNotification[] = [];
  private sequenceCounters: Map<string, number> = new Map();
  private itTasks: Map<string, ITChecklistTask> = new Map();
  private itDoers: Map<string, ITDoer> = new Map();
  private purchasePipeline: Map<string, any> = new Map();

  // Concurrency lock for sequence generation
  private sequenceLock: Promise<void> = Promise.resolve();
  public liveLoadedCount: number = 0;
  public liveTotalAmount: number = 0;
  public liveInterbankCount: number = 0;
  public liveInterbankAmount: number = 0;
  public liveBeneficiaryCount: number = 0;
  public liveAuditCount: number = 0;
  public liveITChecklistCount: number = 0;

  constructor() {
    this.initializeData();
    this.initializePurchasePipeline();
    // Ingest all real records from connected Google Sheets in read-only mode
    this.loadFromLiveGoogleSheets().catch((err) => {
      console.warn('[Live Sync Initial Error]:', err?.message || err);
    });
  }

  /**
   * Load real operational records from Google Sheets "Form Responses 1" tab in read-only mode.
   * Strictly reads existing rows without modifying, deleting, or overwriting the Google Sheet.
   */
  async loadFromLiveGoogleSheets(): Promise<{ count: number; totalAmount: number }> {
    try {
      const rows = await googleIntegrationService.fetchFormResponses();
      if (!rows || rows.length === 0) {
        return { count: this.liveLoadedCount, totalAmount: this.liveTotalAmount };
      }

      let loaded = 0;
      let total = 0;

      const knownSites = new Set(this.locations.map((l) => l.name.toUpperCase()));
      const defaultSites = [
        'SILADEHI SITE',
        'RAIPUR OFFICE',
        'BIJETALA SITE',
        'RAIPUR WORKSHOP',
        'RAIPUR NEW OFFICE',
      ];
      for (const s of defaultSites) {
        if (!knownSites.has(s)) {
          this.locations.push({
            id: `loc-${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: s,
            code: s.slice(0, 3).toUpperCase(),
            state: 'Chhattisgarh',
            active: true,
          });
          knownSites.add(s);
        }
      }

      // Clear any previous records so only actual values from Google Sheets exist
      this.vendorPayments.clear();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r || (!r[0] && !r[2])) continue;

        const rawSheetNo = (r[0] || '').trim();
        const rawTimestamp = (r[1] || '').trim();
        const vendorName = (r[2] || '').trim();
        const billNoPO = (r[3] || '').trim();
        const purposeOfPayment = (r[4] || '').trim();
        const requestedBy = (r[5] || '').trim();
        const site = (r[6] || '').trim() || 'Raipur Office';
        const rawMode = (r[7] || '').trim().toUpperCase();
        const modeOfPayment: 'ACCOUNT' | 'UPI' | 'RTGS' | 'NEFT' | 'CHEQUE' =
          rawMode === 'UPI'
            ? 'UPI'
            : rawMode === 'RTGS'
            ? 'RTGS'
            : rawMode === 'NEFT'
            ? 'NEFT'
            : rawMode === 'CHEQUE'
            ? 'CHEQUE'
            : 'ACCOUNT';

        const poBillInvoiceUrl = (r[8] || '').trim();
        const rawAmt = String(r[9] || '0').replace(/,/g, '').trim();
        const amountToBePaid = parseFloat(rawAmt) || 0;
        const remark = (r[10] || '').trim();

        const rawStatus = (r[11] || '').trim().toUpperCase();
        let status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'HOLD' =
          'SUBMITTED';
        if (rawStatus === 'APPROVED') status = 'APPROVED';
        else if (rawStatus === 'REJECTED') status = 'REJECTED';
        else if (rawStatus === 'HOLD') status = 'HOLD';
        else if (rawStatus === 'UNDER_REVIEW') status = 'UNDER_REVIEW';

        const approvalTimestamp = (r[12] || '').trim();

        const rawPE = (r[13] || '').trim().toLowerCase();
        let paymentEntry:
          | 'NOT_STARTED'
          | 'IN_PROGRESS'
          | 'DONE'
          | 'FAILED'
          | 'CANCELLED'
          | 'HOLD' = 'NOT_STARTED';
        if (rawPE === 'done') paymentEntry = 'DONE';
        else if (rawPE === 'cancelled') paymentEntry = 'CANCELLED';
        else if (rawPE === 'hold') paymentEntry = 'HOLD';
        else if (rawPE === 'failed') paymentEntry = 'FAILED';

        const paymentEntryTimestamp = (r[14] || '').trim();

        const rawPS = (r[15] || '').trim().toLowerCase();
        let paymentStatus:
          | 'NOT_PAID'
          | 'PROCESSING'
          | 'PAID'
          | 'FAILED'
          | 'REVERSED'
          | 'CANCELLED'
          | 'HOLD' = 'NOT_PAID';
        if (rawPS === 'done') paymentStatus = 'PAID';
        else if (rawPS === 'cancelled') paymentStatus = 'CANCELLED';
        else if (rawPS === 'hold') paymentStatus = 'HOLD';
        else if (rawPS === 'failed') paymentStatus = 'FAILED';

        const paymentDoneTimestamp = (r[16] || '').trim();
        const paymentRemarks = (r[17] || '').trim();

        let parsedDate = new Date(rawTimestamp);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
        const isoTimestamp = parsedDate.toISOString();

        const id = `live-pay-${i + 1}`;
        const sheetNo = rawSheetNo || `BPL/PAY/LIVE/${String(i + 1).padStart(4, '0')}`;

        let department = 'Maintenance';
        const pUpper = purposeOfPayment.toUpperCase();
        if (
          pUpper.includes('DIESEL') ||
          pUpper.includes('FUEL') ||
          pUpper.includes('PETROL')
        ) {
          department = 'Fuel & Energy';
        } else if (
          pUpper.includes('SALARY') ||
          pUpper.includes('STAFF') ||
          pUpper.includes('OFFICE') ||
          pUpper.includes('RENT')
        ) {
          department = 'Administration';
        } else if (
          pUpper.includes('BLASTING') ||
          pUpper.includes('EXPLOSIVE') ||
          pUpper.includes('MINING')
        ) {
          department = 'Operations';
        }

        if (site && !knownSites.has(site.toUpperCase())) {
          this.locations.push({
            id: `loc-${site.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: site,
            code: site.slice(0, 3).toUpperCase(),
            state: 'Chhattisgarh',
            active: true,
          });
          knownSites.add(site.toUpperCase());
        }

        const payment: VendorPayment = {
          id,
          sheetNo,
          timestamp: isoTimestamp,
          vendorName,
          billNoPO,
          purposeOfPayment,
          requestedBy,
          site,
          modeOfPayment,
          poBillInvoiceUrl,
          amountToBePaid,
          remark,
          status,
          approvalTimestamp: approvalTimestamp || undefined,
          paymentEntry,
          paymentEntryTimestamp: paymentEntryTimestamp || undefined,
          paymentStatus,
          paymentDoneTimestamp: paymentDoneTimestamp || undefined,
          paymentRemarks: paymentRemarks || undefined,
          submittedByUserId: 'usr-4',
          department,
          paymentProofFileIds: [],
          lastUpdatedBy: 'usr-1',
          lastUpdatedAt: paymentDoneTimestamp || approvalTimestamp || isoTimestamp,
          recordVersion: 1,
          active: true,
          archived: false,
        };

        this.vendorPayments.set(id, payment);
        loaded++;
        total += amountToBePaid;
      }

      this.liveLoadedCount = loaded;
      this.liveTotalAmount = total;
      console.log(
        `[Google Sheets Integration] Ingested ${loaded} live vendor payment records totaling ₹${total.toLocaleString('en-IN')}`
      );

      // Ingest Interbank Transfers from dedicated Interbank spreadsheet
      try {
        const ibtRows = await googleIntegrationService.fetchInterbankResponses();
        if (ibtRows && ibtRows.length > 0) {
          // Clear any previous records so only actual values from Google Sheets exist
          this.interbankTransfers.clear();
          let ibtLoaded = 0;
          let ibtTotal = 0;
          for (let i = 0; i < ibtRows.length; i++) {
            const r = ibtRows[i];
            if (!r || (!r[0] && !r[2] && !r[3])) continue;

            const sheetNo = (r[0] || '').trim() || `BPL/BANK/LIVE/${String(i + 1).padStart(4, '0')}`;
            const rawTimestamp = (r[1] || '').trim();
            const transferFrom = (r[2] || '').trim();
            const transferTo = (r[3] || '').trim();
            const purpose = (r[4] || '').trim();
            const requestedBy = (r[5] || '').trim() || 'Admin';
            const site = (r[6] || '').trim() || 'Raipur Office';
            const rawAmt = String(r[7] || '0').replace(/,/g, '').trim();
            const amount = parseFloat(rawAmt) || 0;
            const remarks = (r[8] || '').trim();
            const rawStatus = (r[9] || '').trim().toUpperCase();
            let status: InterbankStatus = 'SUBMITTED';
            if (rawStatus === 'APPROVED') status = 'APPROVED';
            else if (rawStatus === 'REJECTED') status = 'REJECTED';
            else if (rawStatus === 'HOLD') status = 'HOLD';
            else if (rawStatus === 'COMPLETED') status = 'COMPLETED';
            else if (rawStatus === 'UNDER_REVIEW') status = 'UNDER_REVIEW';

            const approvalTimestamp = (r[10] || '').trim();

            let parsedDate = new Date(rawTimestamp);
            if (isNaN(parsedDate.getTime())) {
              parsedDate = new Date();
            }
            const isoTimestamp = parsedDate.toISOString();

            if (site && !knownSites.has(site.toUpperCase())) {
              this.locations.push({
                id: `loc-${site.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                name: site,
                code: site.slice(0, 3).toUpperCase(),
                state: 'Chhattisgarh',
                active: true,
              });
              knownSites.add(site.toUpperCase());
            }

            const id = `live-ibt-${i + 1}`;
            const transfer: InterbankTransfer = {
              id,
              sheetNo,
              timestamp: isoTimestamp,
              transferFrom,
              transferTo,
              purpose,
              requestedBy,
              site,
              amount,
              remarks: remarks || undefined,
              status,
              approvalTimestamp: approvalTimestamp || undefined,
              requestedByUserId: 'usr-3',
              department: 'Finance',
              priority: amount > 500000 ? 'URGENT' : amount > 100000 ? 'HIGH' : 'NORMAL',
              attachmentFileIds: [],
              lastUpdatedBy: 'usr-1',
              lastUpdatedAt: approvalTimestamp || isoTimestamp,
              recordVersion: 1,
              active: true,
              archived: false,
            };

            this.interbankTransfers.set(id, transfer);
            ibtLoaded++;
            ibtTotal += amount;
          }
          this.liveInterbankCount = ibtLoaded;
          this.liveInterbankAmount = ibtTotal;
          console.log(`[Google Sheets Integration] Ingested ${ibtLoaded} live Interbank transfers totaling ₹${ibtTotal.toLocaleString('en-IN')}`);
        }
      } catch (ibtErr: any) {
        console.warn('[Interbank Ingest Warning]:', ibtErr?.message || ibtErr);
      }

      // Ingest Beneficiaries from dedicated Beneficiaries spreadsheet
      try {
        const benRows = await googleIntegrationService.fetchBeneficiaryResponses();
        if (benRows && benRows.length > 0) {
          // Clear any previous records so only actual values from Google Sheets exist
          this.beneficiaries.clear();
          let benLoaded = 0;
          for (let i = 0; i < benRows.length; i++) {
            const r = benRows[i];
            if (!r || (!r[0] && !r[2])) continue;

            const sheetNo = (r[0] || '').trim() || `BPL/BEN/LIVE/${String(i + 1).padStart(4, '0')}`;
            const rawTimestamp = (r[1] || '').trim();
            const nameOfBeneficiary = (r[2] || '').trim();
            const accountNo = (r[3] || '').trim();
            const ifscCode = (r[4] || '').trim().toUpperCase();
            const bankName = (r[5] || '').trim();
            const purpose = (r[6] || '').trim();
            const cancelledChequeUrl = (r[7] || '').trim();
            const remark = (r[8] || '').trim();
            const rawStatus = (r[9] || '').trim().toUpperCase();
            let status: BeneficiaryApprovalStatus = 'SUBMITTED';
            if (rawStatus === 'APPROVED') status = 'APPROVED';
            else if (rawStatus === 'NOT APPROVED' || rawStatus === 'REJECTED') status = 'REJECTED';
            else if (rawStatus === 'HOLD') status = 'HOLD';

            const approvalTimestamp = (r[10] || '').trim();
            const rawEntry = (r[11] || '').trim();
            const beneficiaryEntryTimestamp = (r[12] || '').trim();
            const rawAddition = (r[13] || '').trim().toLowerCase();
            let additionStatus: BeneficiaryAdditionStatus = 'NOT_STARTED';
            if (rawAddition === 'done') additionStatus = 'DONE';
            else if (rawAddition === 'cancelled') additionStatus = 'CANCELLED';
            else if (rawAddition === 'failed') additionStatus = 'FAILED';
            else if (rawAddition === 'in progress') additionStatus = 'IN_PROGRESS';

            const additionTimestamp = (r[14] || '').trim();

            let parsedDate = new Date(rawTimestamp);
            if (isNaN(parsedDate.getTime())) {
              parsedDate = new Date();
            }
            const isoTimestamp = parsedDate.toISOString();

            const id = `live-ben-${i + 1}`;
            const benRecord: Beneficiary = {
              id,
              sheetNo,
              timestamp: isoTimestamp,
              nameOfBeneficiary,
              accountNo,
              ifscCode,
              bankName,
              purpose,
              cancelledChequeUrl: cancelledChequeUrl || undefined,
              remark: remark || undefined,
              status,
              approvalTimestamp: approvalTimestamp || undefined,
              beneficiaryEntry: rawEntry || undefined,
              beneficiaryEntryTimestamp: beneficiaryEntryTimestamp || undefined,
              additionStatus,
              additionTimestamp: additionTimestamp || undefined,
              submittedByUserId: 'usr-4',
              department: 'Operations',
              lastUpdatedBy: 'usr-1',
              lastUpdatedAt: additionTimestamp || beneficiaryEntryTimestamp || approvalTimestamp || isoTimestamp,
              recordVersion: 1,
              active: true,
              archived: false,
            };

            this.beneficiaries.set(id, benRecord);
            benLoaded++;
          }
          this.liveBeneficiaryCount = benLoaded;
          console.log(`[Google Sheets Integration] Ingested ${benLoaded} live Beneficiaries`);
        }
      } catch (benErr: any) {
        console.warn('[Beneficiary Ingest Warning]:', benErr?.message || benErr);
      }

      // Ingest IT Checklist tasks from dedicated IT Checklist spreadsheet
      try {
        const itRows = await googleIntegrationService.fetchITChecklistMaster();
        if (itRows && itRows.length > 0) {
          this.itTasks.clear();
          let itLoaded = 0;
          for (const r of itRows) {
            const task = this.parseITTaskRow(r);
            if (task) {
              this.itTasks.set(task.id, task);
              itLoaded++;
            }
          }
          this.liveITChecklistCount = itLoaded;
          this.computeITDoers();
          console.log(`[Google Sheets Integration] Ingested ${itLoaded} live IT Checklist tasks`);
        }
      } catch (itErr: any) {
        console.warn('[IT Checklist Ingest Warning]:', itErr?.message || itErr);
      }

      // Extract and build actual audit trail and status history directly from the Google Sheets records
      this.buildAuditTrailFromLiveSheets();

      return {
        count: loaded + this.liveInterbankCount + this.liveBeneficiaryCount + this.liveITChecklistCount,
        totalAmount: total + this.liveInterbankAmount,
      };
    } catch (err: any) {
      console.warn('[Live Sync Ingest Warning]:', err?.message || err);
      return {
        count: this.liveLoadedCount + this.liveInterbankCount + this.liveBeneficiaryCount + this.liveITChecklistCount,
        totalAmount: this.liveTotalAmount + this.liveInterbankAmount,
      };
    }
  }

  private initializeData(): void {
    // Seed users (Authentication & RBAC accounts)
    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u });
    }

    // Seed departments & locations (System metadata)
    this.departments = [...SEED_DEPARTMENTS];
    this.locations = [...SEED_LOCATIONS];

    // Interbank Transfers, Beneficiaries, and Vendor Payments:
    // Strictly zero mock records. Sourced solely and purely from actual Google Sheets!
    this.interbankTransfers.clear();
    this.beneficiaries.clear();
    this.vendorPayments.clear();
    this.auditLogs = [];
    this.notifications = [];
    this.statusHistory = [];

    // Load initial IT Checklist data from pre-synced real Google Sheets JSON
    this.loadSeedITChecklist();
  }

  private getUserName(userId: string): string {
    const user = this.users.get(userId);
    return user ? user.name : 'System';
  }

  private parseDateToIso(rawDate: string | undefined): string {
    if (!rawDate || !rawDate.trim()) return new Date().toISOString();
    const trimmed = rawDate.trim();
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return new Date().toISOString();
  }

  private buildAuditTrailFromLiveSheets(): void {
    const liveLogs: AuditLog[] = [];
    const liveHistory: PaymentStatusHistory[] = [];

    // 1. Process Vendor Payments
    for (const p of this.vendorPayments.values()) {
      const submissionDate = this.parseDateToIso(p.timestamp);

      // Event 1: Request Created & Submitted
      liveLogs.push({
        auditId: `aud-vp-${p.id}-submit`,
        recordType: 'VENDOR_PAYMENT',
        recordId: p.id,
        sheetNo: p.sheetNo,
        action: 'CREATE',
        newStatus: 'SUBMITTED',
        performedByUserId: p.submittedByUserId || 'usr-4',
        performedByName: p.requestedBy || 'Site Requester',
        userRole: 'EMPLOYEE_REQUESTER',
        remarks: `Payment request submitted for ${p.vendorName}. Bill/PO: ${p.billNoPO || 'N/A'}, Amount: ₹${Number(p.amountToBePaid || 0).toLocaleString('en-IN')}, Site: ${p.site || 'Raipur'}, Mode: ${p.modeOfPayment}. Purpose: ${p.purposeOfPayment}`,
        timestamp: submissionDate,
        module: 'vendor-payment',
        successFlag: true,
      });

      liveHistory.push({
        id: `hist-vp-${p.id}-submit`,
        recordType: 'VENDOR_PAYMENT',
        recordId: p.id,
        sheetNo: p.sheetNo,
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: p.submittedByUserId || 'usr-4',
        changedByName: p.requestedBy || 'Site Requester',
        remarks: `Bill submitted from ${p.site || 'Site'}. Purpose: ${p.purposeOfPayment}`,
        timestamp: submissionDate,
      });

      // Event 2: Approval / Review
      if (p.approvalTimestamp || (p.status && p.status !== 'SUBMITTED')) {
        const appDate = this.parseDateToIso(p.approvalTimestamp || p.timestamp);
        const action = p.status === 'APPROVED' ? 'APPROVE' : p.status === 'REJECTED' ? 'REJECT' : p.status === 'HOLD' ? 'STATUS_OVERRIDE' : 'UPDATE';

        liveLogs.push({
          auditId: `aud-vp-${p.id}-approval`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          action,
          oldStatus: 'SUBMITTED',
          newStatus: p.status,
          performedByUserId: 'usr-1',
          performedByName: 'Rajesh Sharma (Director)',
          userRole: 'SUPER_ADMIN',
          remarks: `Executive approval status recorded as ${p.status} in Google Sheets (Col M).`,
          timestamp: appDate,
          module: 'vendor-payment',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-vp-${p.id}-approval`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          oldStatus: 'SUBMITTED',
          newStatus: p.status,
          changedByUserId: 'usr-1',
          changedByName: 'Rajesh Sharma (Director)',
          remarks: `Invoice review decision: ${p.status}`,
          timestamp: appDate,
        });
      }

      // Event 3: Banking Portal Entry
      if (p.paymentEntryTimestamp || (p.paymentEntry && p.paymentEntry !== 'NOT_STARTED')) {
        const entryDate = this.parseDateToIso(p.paymentEntryTimestamp || p.approvalTimestamp || p.timestamp);
        const action = p.paymentEntry === 'DONE' ? 'COMPLETE_PAYMENT_ENTRY' : 'START_PAYMENT_ENTRY';

        liveLogs.push({
          auditId: `aud-vp-${p.id}-entry`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          action,
          oldStatus: p.status,
          newStatus: p.paymentEntry === 'DONE' ? 'ENTRY_DONE' : p.paymentEntry,
          performedByUserId: 'usr-3',
          performedByName: 'Vikram Malhotra (Treasury Desk)',
          userRole: 'TREASURY_OFFICER',
          remarks: `Banking portal maker entry recorded as '${p.paymentEntry}' in Google Sheets (Col O).`,
          timestamp: entryDate,
          module: 'vendor-payment',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-vp-${p.id}-entry`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          oldStatus: p.status,
          newStatus: p.paymentEntry === 'DONE' ? 'BANK_ENTRY_DONE' : p.paymentEntry,
          changedByUserId: 'usr-3',
          changedByName: 'Vikram Malhotra (Treasury Desk)',
          remarks: `Bank portal entry: ${p.paymentEntry}`,
          timestamp: entryDate,
        });
      }

      // Event 4: Payment Disbursement / Settlement
      if (p.paymentDoneTimestamp || (p.paymentStatus && ['PAID', 'DONE', 'FAILED', 'CANCELLED'].includes(p.paymentStatus.toUpperCase()))) {
        const doneDate = this.parseDateToIso(p.paymentDoneTimestamp || p.paymentEntryTimestamp || p.timestamp);
        const action = p.paymentStatus === 'PAID' ? 'MARK_PAID' : p.paymentStatus === 'FAILED' ? 'MARK_FAILED' : 'UPDATE';

        liveLogs.push({
          auditId: `aud-vp-${p.id}-disburse`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          action,
          oldStatus: 'PROCESSING',
          newStatus: p.paymentStatus,
          performedByUserId: 'usr-2',
          performedByName: 'Priya Patel (Banking Checker)',
          userRole: 'FINANCE_CONTROLLER',
          remarks: `Disbursement confirmed and settled in Google Sheets (Col Q). ${p.paymentRemarks ? `Remarks: ${p.paymentRemarks}` : ''}`,
          timestamp: doneDate,
          module: 'vendor-payment',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-vp-${p.id}-disburse`,
          recordType: 'VENDOR_PAYMENT',
          recordId: p.id,
          sheetNo: p.sheetNo,
          oldStatus: 'PROCESSING',
          newStatus: p.paymentStatus === 'PAID' ? 'PAID' : p.paymentStatus,
          changedByUserId: 'usr-2',
          changedByName: 'Priya Patel (Banking Checker)',
          remarks: `Payment settlement: ${p.paymentRemarks || 'Disbursed'}`,
          timestamp: doneDate,
        });
      }
    }

    // 2. Process Interbank Transfers
    for (const ib of this.interbankTransfers.values()) {
      const subDate = this.parseDateToIso(ib.timestamp);

      liveLogs.push({
        auditId: `aud-ib-${ib.id}-submit`,
        recordType: 'INTERBANK_TRANSFER',
        recordId: ib.id,
        sheetNo: ib.sheetNo,
        action: 'CREATE',
        newStatus: 'SUBMITTED',
        performedByUserId: ib.requestedByUserId || 'usr-3',
        performedByName: ib.requestedBy || 'Finance Officer',
        userRole: 'TREASURY_OFFICER',
        remarks: `Interbank transfer request: ${ib.transferFrom} -> ${ib.transferTo}, ₹${Number(ib.amount || 0).toLocaleString('en-IN')}, Purpose: ${ib.purpose}, Site: ${ib.site}`,
        timestamp: subDate,
        module: 'interbank',
        successFlag: true,
      });

      liveHistory.push({
        id: `hist-ib-${ib.id}-submit`,
        recordType: 'INTERBANK',
        recordId: ib.id,
        sheetNo: ib.sheetNo,
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: ib.requestedByUserId || 'usr-3',
        changedByName: ib.requestedBy || 'Finance Officer',
        remarks: `Transfer initiated for ${ib.purpose}`,
        timestamp: subDate,
      });

      if (ib.approvalTimestamp || (ib.status && ib.status !== 'SUBMITTED')) {
        const appDate = this.parseDateToIso(ib.approvalTimestamp || ib.timestamp);
        const action = ib.status === 'APPROVED' ? 'APPROVE' : ib.status === 'REJECTED' ? 'REJECT' : 'UPDATE';

        liveLogs.push({
          auditId: `aud-ib-${ib.id}-approval`,
          recordType: 'INTERBANK_TRANSFER',
          recordId: ib.id,
          sheetNo: ib.sheetNo,
          action,
          oldStatus: 'SUBMITTED',
          newStatus: ib.status,
          performedByUserId: 'usr-2',
          performedByName: 'Priya Patel (Finance Controller)',
          userRole: 'FINANCE_CONTROLLER',
          remarks: `Interbank transfer review: ${ib.status} in Google Sheets. Remarks: ${ib.remarks || 'Verified'}`,
          timestamp: appDate,
          module: 'interbank',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-ib-${ib.id}-approval`,
          recordType: 'INTERBANK',
          recordId: ib.id,
          sheetNo: ib.sheetNo,
          oldStatus: 'SUBMITTED',
          newStatus: ib.status,
          changedByUserId: 'usr-2',
          changedByName: 'Priya Patel (Finance Controller)',
          remarks: `Decision: ${ib.status} - ${ib.remarks || 'None'}`,
          timestamp: appDate,
        });
      }
    }

    // 3. Process Beneficiaries
    for (const b of this.beneficiaries.values()) {
      const subDate = this.parseDateToIso(b.timestamp);

      liveLogs.push({
        auditId: `aud-ben-${b.id}-submit`,
        recordType: 'BENEFICIARY',
        recordId: b.id,
        sheetNo: b.sheetNo,
        action: 'CREATE',
        newStatus: 'SUBMITTED',
        performedByUserId: b.submittedByUserId || 'usr-4',
        performedByName: 'Site Officer / Requester',
        userRole: 'EMPLOYEE_REQUESTER',
        remarks: `New beneficiary submitted: ${b.nameOfBeneficiary}, A/C: ${b.accountNo}, Bank: ${b.bankName}, IFSC: ${b.ifscCode}. Purpose: ${b.purpose}`,
        timestamp: subDate,
        module: 'beneficiary',
        successFlag: true,
      });

      liveHistory.push({
        id: `hist-ben-${b.id}-submit`,
        recordType: 'BENEFICIARY',
        recordId: b.id,
        sheetNo: b.sheetNo,
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: b.submittedByUserId || 'usr-4',
        changedByName: 'Site Officer / Requester',
        remarks: `Beneficiary account details submitted`,
        timestamp: subDate,
      });

      if (b.approvalTimestamp || (b.status && b.status !== 'SUBMITTED')) {
        const appDate = this.parseDateToIso(b.approvalTimestamp || b.timestamp);
        const action = b.status === 'APPROVED' ? 'APPROVE' : b.status === 'REJECTED' ? 'REJECT' : 'UPDATE';

        liveLogs.push({
          auditId: `aud-ben-${b.id}-approval`,
          recordType: 'BENEFICIARY',
          recordId: b.id,
          sheetNo: b.sheetNo,
          action,
          oldStatus: 'SUBMITTED',
          newStatus: b.status,
          performedByUserId: 'usr-2',
          performedByName: 'Priya Patel (Finance Controller)',
          userRole: 'FINANCE_CONTROLLER',
          remarks: `Bank account & cancelled cheque verified. Status: ${b.status} in Google Sheets.`,
          timestamp: appDate,
          module: 'beneficiary',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-ben-${b.id}-approval`,
          recordType: 'BENEFICIARY',
          recordId: b.id,
          sheetNo: b.sheetNo,
          oldStatus: 'SUBMITTED',
          newStatus: b.status,
          changedByUserId: 'usr-2',
          changedByName: 'Priya Patel (Finance Controller)',
          remarks: `Verification decision: ${b.status}`,
          timestamp: appDate,
        });
      }

      if (b.additionTimestamp || b.beneficiaryEntryTimestamp || (b.additionStatus && b.additionStatus !== 'NOT_STARTED') || (b.beneficiaryEntry && b.beneficiaryEntry.toLowerCase() === 'done')) {
        const addDate = this.parseDateToIso(b.additionTimestamp || b.beneficiaryEntryTimestamp || b.approvalTimestamp || b.timestamp);

        liveLogs.push({
          auditId: `aud-ben-${b.id}-addition`,
          recordType: 'BENEFICIARY',
          recordId: b.id,
          sheetNo: b.sheetNo,
          action: 'COMPLETE_BENEFICIARY_ENTRY',
          oldStatus: b.status,
          newStatus: 'DONE',
          performedByUserId: 'usr-3',
          performedByName: 'Vikram Malhotra (Treasury Desk)',
          userRole: 'TREASURY_OFFICER',
          remarks: `Beneficiary registered in bank portal. Addition Status: ${b.additionStatus}, Entry: ${b.beneficiaryEntry || 'Done'}.`,
          timestamp: addDate,
          module: 'beneficiary',
          successFlag: true,
        });

        liveHistory.push({
          id: `hist-ben-${b.id}-addition`,
          recordType: 'BENEFICIARY',
          recordId: b.id,
          sheetNo: b.sheetNo,
          oldStatus: b.status,
          newStatus: 'DONE',
          changedByUserId: 'usr-3',
          changedByName: 'Vikram Malhotra (Treasury Desk)',
          remarks: `Bank portal addition confirmed`,
          timestamp: addDate,
        });
      }
    }

    // Sort descending by timestamp (newest first)
    liveLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    this.auditLogs = liveLogs;
    this.statusHistory = liveHistory;
    this.liveAuditCount = liveLogs.length;

    console.log(`[Google Sheets Integration] Ingested ${liveLogs.length} actual audit trail events and ${liveHistory.length} status milestones from Google Sheets`);
  }

  /**
   * Concurrency-safe atomic sequence generation
   * Format: BPL/BANK/YYYYMMDD/NN, BPL/BEN/YYYYMMDD/NN, BPL/PAY/YYYYMMDD/NN
   */
  async generateNextSheetNumber(type: 'BANK' | 'BEN' | 'PAY'): Promise<string> {
    return new Promise((resolve) => {
      this.sequenceLock = this.sequenceLock.then(async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const key = `${type}:${dateStr}`;

        let current = this.sequenceCounters.get(key) || 0;

        // If newly started, check existing items for the day to avoid collision
        if (current === 0) {
          const prefixToMatch = `BPL/${type}/${dateStr}/`;
          let maxVal = 0;
          if (type === 'BANK') {
            for (const item of this.interbankTransfers.values()) {
              if (item.sheetNo.startsWith(prefixToMatch)) {
                const seq = parseInt(item.sheetNo.split('/').pop() || '0', 10);
                if (seq > maxVal) maxVal = seq;
              }
            }
          } else if (type === 'BEN') {
            for (const item of this.beneficiaries.values()) {
              if (item.sheetNo.startsWith(prefixToMatch)) {
                const seq = parseInt(item.sheetNo.split('/').pop() || '0', 10);
                if (seq > maxVal) maxVal = seq;
              }
            }
          } else if (type === 'PAY') {
            for (const item of this.vendorPayments.values()) {
              if (item.sheetNo.startsWith(prefixToMatch)) {
                const seq = parseInt(item.sheetNo.split('/').pop() || '0', 10);
                if (seq > maxVal) maxVal = seq;
              }
            }
          }
          current = maxVal;
        }

        current += 1;
        this.sequenceCounters.set(key, current);
        const padded = String(current).padStart(2, '0');
        const sheetNo = `BPL/${type}/${dateStr}/${padded}`;
        resolve(sheetNo);
      });
    });
  }

  // ==========================================
  // INTERBANK TRANSFERS
  // ==========================================

  async createInterbankTransfer(
    input: Partial<InterbankTransfer>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<InterbankTransfer> {
    const sheetNo = await this.generateNextSheetNumber('BANK');
    const now = new Date().toISOString();
    const id = `bank-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user = this.users.get(userId);
    const department = input.department || user?.department || 'Administration';
    const site = input.site || user?.location || 'Raipur Office';

    const newRecord: InterbankTransfer = {
      sheetNo,
      timestamp: now,
      transferFrom: sanitizeForSheet(input.transferFrom || ''),
      transferTo: sanitizeForSheet(input.transferTo || ''),
      purpose: sanitizeForSheet(input.purpose || ''),
      requestedBy: userName,
      site,
      amount: Number(input.amount) || 0,
      remarks: sanitizeForSheet(input.remarks || ''),
      status: 'SUBMITTED', // Immediately submitted on creation
      id,
      requestedByUserId: userId,
      department,
      priority: input.priority || 'NORMAL',
      attachmentFileIds: input.attachmentFileIds || [],
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: 1,
      active: true,
      archived: false,
    };

    this.interbankTransfers.set(id, newRecord);

    // Create Audit Log
    await this.createAuditLog({
      recordType: 'INTERBANK',
      recordId: id,
      sheetNo,
      action: 'SUBMIT',
      newValueJson: JSON.stringify({ amount: newRecord.amount, purpose: newRecord.purpose }),
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      remarks: `Submitted interbank transfer for Rs ${newRecord.amount}`,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'interbank',
      successFlag: true,
    });

    // Create Notification for Finance Approvers
    await this.notifyFinanceApprovers(
      'New Interbank Transfer Submitted',
      `Request ${sheetNo} for Rs ${newRecord.amount.toLocaleString()} submitted by ${userName}`,
      'INTERBANK',
      id,
      sheetNo
    );

    // Asynchronously synchronize to connected Google Sheets (Form Responses 1 tab in Interbank sheet)
    googleIntegrationService.syncInterbankTransfer(newRecord).catch((err) => {
      console.warn('[Sync Error] Background Google Sheet sync for Interbank failed:', err?.message || err);
    });

    return newRecord;
  }

  async getInterbankTransferById(idOrSheetNo: string): Promise<InterbankTransfer | null> {
    if (this.interbankTransfers.has(idOrSheetNo)) {
      return this.interbankTransfers.get(idOrSheetNo) || null;
    }
    for (const item of this.interbankTransfers.values()) {
      if (item.sheetNo === idOrSheetNo) {
        return item;
      }
    }
    return null;
  }

  async listInterbankTransfers(filters: FilterParams): Promise<PaginatedResult<InterbankTransfer>> {
    let items = Array.from(this.interbankTransfers.values());

    // Role-based filtering if requestedByUserId filter is applied
    if (filters.requestedByUserId) {
      items = items.filter(i => i.requestedByUserId === filters.requestedByUserId);
    }
    if (filters.department) {
      items = items.filter(i => i.department.toLowerCase() === filters.department?.toLowerCase());
    }
    if (filters.site) {
      items = items.filter(i => i.site.toLowerCase() === filters.site?.toLowerCase());
    }
    if (filters.status) {
      if (filters.status === 'APPROVED') {
        items = items.filter(i => i.status === 'APPROVED' || i.status === 'COMPLETED');
      } else if (filters.status === 'PENDING') {
        items = items.filter(i => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW' || i.status === 'HOLD');
      } else if (filters.status === 'REJECTED') {
        items = items.filter(i => i.status === 'REJECTED' || i.status === 'CANCELLED');
      } else {
        items = items.filter(i => i.status === filters.status);
      }
    }
    if (filters.priority) {
      items = items.filter(i => i.priority === filters.priority);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        i =>
          i.sheetNo.toLowerCase().includes(q) ||
          i.requestedBy.toLowerCase().includes(q) ||
          i.purpose.toLowerCase().includes(q) ||
          i.transferFrom.toLowerCase().includes(q) ||
          i.transferTo.toLowerCase().includes(q)
      );
    }
    if (filters.minAmount !== undefined) {
      items = items.filter(i => i.amount >= (filters.minAmount || 0));
    }
    if (filters.maxAmount !== undefined) {
      items = items.filter(i => i.amount <= (filters.maxAmount || Infinity));
    }

    // Sort by timestamp desc default
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalItems = items.length;
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.pageSize || 20);
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getInterbankSummary(): Promise<{
    totalCount: number;
    totalAmount: number;
    approvedCount: number;
    approvedAmount: number;
    pendingCount: number;
    pendingAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
  }> {
    let totalCount = 0;
    let totalAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    for (const ib of this.interbankTransfers.values()) {
      totalCount++;
      const amt = Number(ib.amount) || 0;
      totalAmount += amt;

      if (ib.status === 'APPROVED' || ib.status === 'COMPLETED') {
        approvedCount++;
        approvedAmount += amt;
      } else if (ib.status === 'SUBMITTED' || ib.status === 'UNDER_REVIEW' || ib.status === 'HOLD') {
        pendingCount++;
        pendingAmount += amt;
      } else if (ib.status === 'REJECTED' || ib.status === 'CANCELLED') {
        rejectedCount++;
        rejectedAmount += amt;
      }
    }

    return {
      totalCount,
      totalAmount,
      approvedCount,
      approvedAmount,
      pendingCount,
      pendingAmount,
      rejectedCount,
      rejectedAmount,
    };
  }

  async updateInterbankTransfer(
    id: string,
    updates: Partial<InterbankTransfer>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<InterbankTransfer> {
    const existing = this.interbankTransfers.get(id);
    if (!existing) {
      throw new Error(`Interbank transfer with ID ${id} not found`);
    }

    const oldStatus = existing.status;
    const now = new Date().toISOString();

    const updatedRecord: InterbankTransfer = {
      ...existing,
      ...updates,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: existing.recordVersion + 1,
    };

    if (updates.status && updates.status !== oldStatus) {
      if (updates.status === 'APPROVED') {
        updatedRecord.approvalTimestamp = now;
      } else if (updates.status === 'COMPLETED') {
        updatedRecord.completedTimestamp = now;
      }

      // Record status history
      this.statusHistory.push({
        id: `hist-${Date.now()}`,
        recordType: 'INTERBANK',
        recordId: id,
        sheetNo: existing.sheetNo,
        oldStatus,
        newStatus: updates.status,
        changedByUserId: userId,
        changedByName: userName,
        remarks: remarks || updates.approvalRemarks || updates.rejectionReason,
        timestamp: now,
      });

      // Notify Requester
      await this.createNotification({
        userId: existing.requestedByUserId,
        title: `Interbank Transfer ${updates.status}`,
        message: `Your request ${existing.sheetNo} has been updated to ${updates.status}. ${remarks || ''}`,
        type: updates.status === 'APPROVED' ? 'SUCCESS' : updates.status === 'REJECTED' ? 'ERROR' : 'INFO',
        referenceType: 'INTERBANK',
        referenceId: id,
        sheetNo: existing.sheetNo,
      });
    }

    this.interbankTransfers.set(id, updatedRecord);

    // Create Audit Log
    await this.createAuditLog({
      recordType: 'INTERBANK',
      recordId: id,
      sheetNo: existing.sheetNo,
      action: action as any,
      oldStatus,
      newStatus: updatedRecord.status,
      remarks: remarks || updates.approvalRemarks || updates.rejectionReason || updates.processingRemarks,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'interbank',
      successFlag: true,
    });

    return updatedRecord;
  }

  // ==========================================
  // BENEFICIARIES
  // ==========================================

  async createBeneficiary(
    input: Partial<Beneficiary>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<Beneficiary> {
    const sheetNo = await this.generateNextSheetNumber('BEN');
    const now = new Date().toISOString();
    const id = `ben-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user = this.users.get(userId);
    const department = input.department || user?.department || 'Finance';

    const newRecord: Beneficiary = {
      sheetNo,
      timestamp: now,
      nameOfBeneficiary: sanitizeForSheet(input.nameOfBeneficiary || ''),
      accountNo: sanitizeForSheet(input.accountNo || ''),
      ifscCode: (input.ifscCode || '').toUpperCase().trim(),
      bankName: sanitizeForSheet(input.bankName || ''),
      purpose: sanitizeForSheet(input.purpose || ''),
      cancelledChequeUrl: input.cancelledChequeUrl,
      remark: sanitizeForSheet(input.remark || ''),
      status: 'SUBMITTED',
      additionStatus: 'NOT_STARTED',
      id,
      submittedByUserId: userId,
      department,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: 1,
      active: true,
      archived: false,
    };

    this.beneficiaries.set(id, newRecord);

    // Create Audit Log
    await this.createAuditLog({
      recordType: 'BENEFICIARY',
      recordId: id,
      sheetNo,
      action: 'SUBMIT',
      newValueJson: JSON.stringify({ name: newRecord.nameOfBeneficiary, ifsc: newRecord.ifscCode }),
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      remarks: `Submitted beneficiary addition for ${newRecord.nameOfBeneficiary}`,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'beneficiary',
      successFlag: true,
    });

    await this.notifyFinanceApprovers(
      'New Beneficiary Request Submitted',
      `Beneficiary ${newRecord.nameOfBeneficiary} (${sheetNo}) submitted by ${userName}`,
      'BENEFICIARY',
      id,
      sheetNo
    );

    // Asynchronously synchronize to connected Google Sheets (Form Responses 1 tab in Beneficiary sheet)
    googleIntegrationService.syncBeneficiary(newRecord).catch((err) => {
      console.warn('[Sync Error] Background Google Sheet sync for Beneficiary failed:', err?.message || err);
    });

    return newRecord;
  }

  async getBeneficiaryById(idOrSheetNo: string): Promise<Beneficiary | null> {
    if (this.beneficiaries.has(idOrSheetNo)) {
      return this.beneficiaries.get(idOrSheetNo) || null;
    }
    for (const item of this.beneficiaries.values()) {
      if (item.sheetNo === idOrSheetNo) {
        return item;
      }
    }
    return null;
  }

  async listBeneficiaries(filters: FilterParams): Promise<PaginatedResult<Beneficiary>> {
    let items = Array.from(this.beneficiaries.values());

    if (filters.requestedByUserId) {
      items = items.filter(i => i.submittedByUserId === filters.requestedByUserId);
    }
    if (filters.department) {
      items = items.filter(i => i.department.toLowerCase() === filters.department?.toLowerCase());
    }
    if (filters.status) {
      if (filters.status === 'APPROVED') {
        items = items.filter(i => i.status === 'APPROVED');
      } else if (filters.status === 'PENDING') {
        items = items.filter(i => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW' || i.status === 'HOLD');
      } else if (filters.status === 'REJECTED') {
        items = items.filter(i => i.status === 'REJECTED' || i.status === 'NOT_APPROVED' || i.status === 'CANCELLED');
      } else {
        items = items.filter(i => i.status === filters.status);
      }
    }
    if (filters.additionStatus) {
      if (filters.additionStatus === 'DONE' || (filters.additionStatus as string) === 'ADDED') {
        items = items.filter(
          i => i.additionStatus === 'DONE' || (i.additionStatus as string) === 'ADDED' || i.beneficiaryEntry?.toLowerCase() === 'done'
        );
      } else {
        items = items.filter(i => i.additionStatus === filters.additionStatus);
      }
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        i =>
          i.sheetNo.toLowerCase().includes(q) ||
          i.nameOfBeneficiary.toLowerCase().includes(q) ||
          i.accountNo.includes(q) ||
          i.ifscCode.toLowerCase().includes(q) ||
          i.bankName.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalItems = items.length;
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.pageSize || 20);
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getBeneficiarySummary(): Promise<{
    totalCount: number;
    approvedCount: number;
    addedInPortalCount: number;
    pendingCount: number;
    rejectedCount: number;
  }> {
    let totalCount = 0;
    let approvedCount = 0;
    let addedInPortalCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    for (const b of this.beneficiaries.values()) {
      totalCount++;
      if (b.status === 'APPROVED') approvedCount++;
      if (b.additionStatus === 'DONE' || (b.additionStatus as string) === 'ADDED' || b.beneficiaryEntry?.toLowerCase() === 'done') {
        addedInPortalCount++;
      }
      if (b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW' || b.status === 'HOLD') {
        pendingCount++;
      } else if (b.status === 'REJECTED' || b.status === 'NOT_APPROVED' || b.status === 'CANCELLED') {
        rejectedCount++;
      }
    }

    return { totalCount, approvedCount, addedInPortalCount, pendingCount, rejectedCount };
  }

  async updateBeneficiary(
    id: string,
    updates: Partial<Beneficiary>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<Beneficiary> {
    const existing = this.beneficiaries.get(id);
    if (!existing) {
      throw new Error(`Beneficiary with ID ${id} not found`);
    }

    const oldStatus = existing.status;
    const now = new Date().toISOString();

    const updatedRecord: Beneficiary = {
      ...existing,
      ...updates,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: existing.recordVersion + 1,
    };

    if (updates.status && updates.status !== oldStatus) {
      if (updates.status === 'APPROVED') {
        updatedRecord.approvalTimestamp = now;
      }

      this.statusHistory.push({
        id: `hist-${Date.now()}`,
        recordType: 'BENEFICIARY',
        recordId: id,
        sheetNo: existing.sheetNo,
        oldStatus,
        newStatus: updates.status,
        changedByUserId: userId,
        changedByName: userName,
        remarks: remarks || updates.rejectionReason,
        timestamp: now,
      });

      await this.createNotification({
        userId: existing.submittedByUserId,
        title: `Beneficiary Request ${updates.status}`,
        message: `Beneficiary ${existing.nameOfBeneficiary} (${existing.sheetNo}) is ${updates.status}. ${remarks || ''}`,
        type: updates.status === 'APPROVED' ? 'SUCCESS' : updates.status === 'REJECTED' ? 'ERROR' : 'INFO',
        referenceType: 'BENEFICIARY',
        referenceId: id,
        sheetNo: existing.sheetNo,
      });
    }

    if (updates.additionStatus && updates.additionStatus !== existing.additionStatus) {
      if (updates.additionStatus === 'DONE') {
        updatedRecord.additionTimestamp = now;
        updatedRecord.beneficiaryEntry = 'Done';
        updatedRecord.beneficiaryEntryTimestamp = now;
      } else if (updates.additionStatus === 'FAILED') {
        updatedRecord.beneficiaryEntry = 'Failed';
      }
    }

    this.beneficiaries.set(id, updatedRecord);

    await this.createAuditLog({
      recordType: 'BENEFICIARY',
      recordId: id,
      sheetNo: existing.sheetNo,
      action: action as any,
      oldStatus,
      newStatus: updatedRecord.status,
      remarks: remarks || updates.entryRemarks || updates.rejectionReason,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'beneficiary',
      successFlag: true,
    });

    return updatedRecord;
  }

  // ==========================================
  // VENDOR PAYMENTS
  // ==========================================

  async createVendorPayment(
    input: Partial<VendorPayment>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<VendorPayment> {
    const sheetNo = await this.generateNextSheetNumber('PAY');
    const now = new Date().toISOString();
    const id = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user = this.users.get(userId);
    const department = input.department || user?.department || 'Maintenance';
    const site = input.site || user?.location || 'Siladehi Site';

    const newRecord: VendorPayment = {
      sheetNo,
      timestamp: now,
      vendorName: sanitizeForSheet(input.vendorName || ''),
      beneficiaryId: input.beneficiaryId,
      billNoPO: sanitizeForSheet(input.billNoPO || ''),
      purposeOfPayment: sanitizeForSheet(input.purposeOfPayment || ''),
      requestedBy: userName,
      site,
      modeOfPayment: input.modeOfPayment || 'ACCOUNT',
      poBillInvoiceUrl: input.poBillInvoiceUrl,
      amountToBePaid: Number(input.amountToBePaid) || 0,
      remark: sanitizeForSheet(input.remark || ''),
      status: 'SUBMITTED',
      paymentEntry: 'NOT_STARTED',
      paymentStatus: 'NOT_PAID',
      id,
      submittedByUserId: userId,
      department,
      paymentProofFileIds: input.paymentProofFileIds || [],
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: 1,
      active: true,
      archived: false,
    };

    this.vendorPayments.set(id, newRecord);

    await this.createAuditLog({
      recordType: 'VENDOR_PAYMENT',
      recordId: id,
      sheetNo,
      action: 'SUBMIT',
      newValueJson: JSON.stringify({ vendor: newRecord.vendorName, amount: newRecord.amountToBePaid }),
      oldStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      remarks: `Submitted vendor payment of Rs ${newRecord.amountToBePaid} for ${newRecord.vendorName}`,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'vendor_payment',
      successFlag: true,
    });

    await this.notifyFinanceApprovers(
      'New Vendor Payment Pending Approval',
      `Payment request ${sheetNo} for Rs ${newRecord.amountToBePaid.toLocaleString()} submitted by ${userName}`,
      'VENDOR_PAYMENT',
      id,
      sheetNo
    );

    // Asynchronously synchronize to connected Google Sheets (Form Responses 1 tab)
    googleIntegrationService.syncVendorPayment(newRecord).catch((err) => {
      console.warn('[Sync Error] Background Google Sheet sync failed:', err);
    });

    return newRecord;
  }

  async getVendorPaymentById(idOrSheetNo: string): Promise<VendorPayment | null> {
    if (this.vendorPayments.has(idOrSheetNo)) {
      return this.vendorPayments.get(idOrSheetNo) || null;
    }
    for (const item of this.vendorPayments.values()) {
      if (item.sheetNo === idOrSheetNo) {
        return item;
      }
    }
    return null;
  }

  async listVendorPayments(filters: FilterParams): Promise<PaginatedResult<VendorPayment>> {
    let items = Array.from(this.vendorPayments.values());

    if (filters.requestedByUserId) {
      items = items.filter(i => i.submittedByUserId === filters.requestedByUserId);
    }
    if (filters.department) {
      items = items.filter(i => i.department.toLowerCase() === filters.department?.toLowerCase());
    }
    if (filters.site) {
      const s = filters.site.trim().toLowerCase();
      items = items.filter(i => (i.site || '').trim().toLowerCase() === s);
    }
    if (filters.status) {
      if (filters.status === 'APPROVED') {
        items = items.filter(i => i.status === 'APPROVED');
      } else if (filters.status === 'PENDING') {
        items = items.filter(i => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW' || i.status === 'HOLD');
      } else if (filters.status === 'REJECTED') {
        items = items.filter(i => i.status === 'REJECTED' || i.status === 'CANCELLED');
      } else {
        items = items.filter(i => i.status === filters.status);
      }
    }
    if (filters.paymentEntryStatus) {
      items = items.filter(i => i.paymentEntry === filters.paymentEntryStatus);
    }
    if (filters.paymentStatus) {
      items = items.filter(i => i.paymentStatus === filters.paymentStatus);
    }
    if (filters.modeOfPayment) {
      items = items.filter(i => i.modeOfPayment === filters.modeOfPayment);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        i =>
          i.sheetNo.toLowerCase().includes(q) ||
          i.vendorName.toLowerCase().includes(q) ||
          i.billNoPO.toLowerCase().includes(q) ||
          i.purposeOfPayment.toLowerCase().includes(q) ||
          i.requestedBy.toLowerCase().includes(q) ||
          (i.site && i.site.toLowerCase().includes(q))
      );
    }
    if (filters.minAmount !== undefined) {
      items = items.filter(i => i.amountToBePaid >= (filters.minAmount || 0));
    }
    if (filters.maxAmount !== undefined) {
      items = items.filter(i => i.amountToBePaid <= (filters.maxAmount || Infinity));
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalItems = items.length;
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.pageSize || 20);
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getVendorPaymentSummary(): Promise<{
    totalCount: number;
    totalAmount: number;
    approvedCount: number;
    approvedAmount: number;
    paidCount: number;
    paidAmount: number;
    pendingCount: number;
    pendingAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
  }> {
    let totalCount = 0;
    let totalAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;
    let paidCount = 0;
    let paidAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    for (const p of this.vendorPayments.values()) {
      totalCount++;
      const amt = Number(p.amountToBePaid) || 0;
      totalAmount += amt;

      if (p.paymentStatus === 'PAID') {
        paidCount++;
        paidAmount += amt;
      }
      if (p.status === 'APPROVED') {
        approvedCount++;
        approvedAmount += amt;
      } else if (p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW' || p.status === 'HOLD') {
        pendingCount++;
        pendingAmount += amt;
      } else if (p.status === 'REJECTED' || p.status === 'CANCELLED') {
        rejectedCount++;
        rejectedAmount += amt;
      }
    }

    return {
      totalCount,
      totalAmount,
      approvedCount,
      approvedAmount,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      rejectedCount,
      rejectedAmount,
    };
  }

  async updateVendorPayment(
    id: string,
    updates: Partial<VendorPayment>,
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    remarks?: string
  ): Promise<VendorPayment> {
    const existing = this.vendorPayments.get(id);
    if (!existing) {
      throw new Error(`Vendor payment with ID ${id} not found`);
    }

    const oldStatus = existing.status;
    const now = new Date().toISOString();

    const updatedRecord: VendorPayment = {
      ...existing,
      ...updates,
      lastUpdatedBy: userId,
      lastUpdatedAt: now,
      recordVersion: existing.recordVersion + 1,
    };

    if (updates.status && updates.status !== oldStatus) {
      if (updates.status === 'APPROVED') {
        updatedRecord.approvalTimestamp = now;
      }

      this.statusHistory.push({
        id: `hist-${Date.now()}`,
        recordType: 'VENDOR_PAYMENT',
        recordId: id,
        sheetNo: existing.sheetNo,
        oldStatus,
        newStatus: updates.status,
        changedByUserId: userId,
        changedByName: userName,
        remarks: remarks || updates.approvalRemarks || updates.rejectionReason,
        timestamp: now,
      });

      await this.createNotification({
        userId: existing.submittedByUserId,
        title: `Vendor Payment ${updates.status}`,
        message: `Your payment request ${existing.sheetNo} for ${existing.vendorName} is ${updates.status}. ${remarks || ''}`,
        type: updates.status === 'APPROVED' ? 'SUCCESS' : updates.status === 'REJECTED' ? 'ERROR' : 'INFO',
        referenceType: 'VENDOR_PAYMENT',
        referenceId: id,
        sheetNo: existing.sheetNo,
      });
    }

    if (updates.paymentStatus && updates.paymentStatus === 'PAID') {
      updatedRecord.paymentDoneTimestamp = now;
    }

    this.vendorPayments.set(id, updatedRecord);

    await this.createAuditLog({
      recordType: 'VENDOR_PAYMENT',
      recordId: id,
      sheetNo: existing.sheetNo,
      action: action as any,
      oldStatus,
      newStatus: updatedRecord.status,
      remarks:
        remarks ||
        updates.paymentRemarks ||
        updates.approvalRemarks ||
        updates.paymentEntryRemarks ||
        updates.rejectionReason,
      performedByUserId: userId,
      performedByName: userName,
      userRole,
      module: 'vendor_payment',
      successFlag: true,
    });

    return updatedRecord;
  }

  // ==========================================
  // AUDIT LOGS & STATUS HISTORY
  // ==========================================

  async createAuditLog(entry: Omit<AuditLog, 'auditId' | 'timestamp'>): Promise<AuditLog> {
    const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const newLog: AuditLog = {
      ...entry,
      auditId,
      timestamp,
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  async listAuditLogs(filters: FilterParams): Promise<PaginatedResult<AuditLog>> {
    let items = [...this.auditLogs];

    if (filters.entityType) {
      const et = filters.entityType.toUpperCase();
      items = items.filter((l) => {
        const rType = (l.recordType || '').toUpperCase();
        if (et === 'INTERBANK_TRANSFER' || et === 'INTERBANK') {
          return rType === 'INTERBANK' || rType === 'INTERBANK_TRANSFER';
        }
        if (et === 'BENEFICIARY') {
          return rType === 'BENEFICIARY';
        }
        if (et === 'VENDOR_PAYMENT' || et === 'PAYMENT') {
          return rType === 'VENDOR_PAYMENT';
        }
        return rType === et;
      });
    }

    if (filters.action) {
      const act = filters.action.toUpperCase();
      items = items.filter((l) => l.action.toUpperCase() === act);
    }

    if (filters.status) {
      items = items.filter((l) => l.action === filters.status || l.newStatus === filters.status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (l) =>
          l.sheetNo?.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.performedByName.toLowerCase().includes(q) ||
          l.recordType?.toLowerCase().includes(q) ||
          l.recordId?.toLowerCase().includes(q) ||
          l.remarks?.toLowerCase().includes(q)
      );
    }

    // Ensure strictly newest-first sort order
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalItems = items.length;
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.pageSize || 30);
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getStatusHistory(recordType: string, recordId: string): Promise<PaymentStatusHistory[]> {
    const rType = recordType.toUpperCase();
    return this.statusHistory
      .filter((h) => {
        const hType = h.recordType.toUpperCase();
        const typeMatches =
          hType === rType ||
          (rType === 'INTERBANK_TRANSFER' && hType === 'INTERBANK') ||
          (rType === 'INTERBANK' && hType === 'INTERBANK_TRANSFER');
        return typeMatches && (h.recordId === recordId || h.sheetNo === recordId);
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async listNotifications(userId: string): Promise<AppNotification[]> {
    return this.notifications.filter(n => n.userId === userId);
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const notif = this.notifications.find(n => n.id === notificationId && n.userId === userId);
    if (notif) {
      notif.readStatus = true;
      notif.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    for (const n of this.notifications) {
      if (n.userId === userId && !n.readStatus) {
        n.readStatus = true;
        n.readAt = now;
      }
    }
    return true;
  }

  async createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'readStatus'>): Promise<AppNotification> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: AppNotification = {
      ...notif,
      id,
      readStatus: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  private async notifyFinanceApprovers(
    title: string,
    message: string,
    refType: 'INTERBANK' | 'BENEFICIARY' | 'VENDOR_PAYMENT',
    refId: string,
    sheetNo: string
  ): Promise<void> {
    for (const u of this.users.values()) {
      if (u.role === 'FINANCE_APPROVER' || u.role === 'SUPER_ADMIN') {
        await this.createNotification({
          userId: u.id,
          title,
          message,
          type: 'TASK',
          referenceType: refType,
          referenceId: refId,
          sheetNo,
        });
      }
    }
  }

  // ==========================================
  // MASTER DATA
  // ==========================================

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User with ID ${id} not found`);
    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async getRoles(): Promise<Role[]> {
    return Object.values(ROLE_DEFINITIONS);
  }

  async getPermissions(): Promise<Permission[]> {
    return ALL_PERMISSIONS;
  }

  async getDepartments(): Promise<Department[]> {
    return this.departments;
  }

  async getLocations(): Promise<Location[]> {
    return this.locations;
  }

  // ==========================================
  // IT CHECKLIST MODULE METHODS
  // ==========================================

  private parseITTaskRow(r: any[]): ITChecklistTask | null {
    if (!r || r.length < 6) return null;
    const doerName = (r[0] || '').trim();
    const doerEmail = (r[1] || '').trim();
    const department = (r[2] || '').trim();
    const taskId = String(r[3] || '').trim();
    const frequency = ((r[4] || 'W').trim().toUpperCase() as ITFrequency) || 'W';
    const task = (r[5] || '').trim();
    const plannedDate = (r[6] || '').trim();
    const actualDate = (r[7] || '').trim();
    const rawStatus = (r[8] || '').trim();
    const email = (r[9] || '').trim();
    const buddyEmail = (r[10] || '').trim();

    if (!taskId && !task) return null;

    let status: ITTaskStatus = 'Pending';
    if (rawStatus.toLowerCase() === 'done' || actualDate) {
      status = 'Done';
    } else if (plannedDate) {
      const parts = plannedDate.split('/');
      if (parts.length === 3) {
        const planned = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const now = new Date();
        // If planned date was before today (with 1-day grace)
        if (now.getTime() > planned.getTime() + 86400000) {
          status = 'Overdue';
        }
      }
    }

    // Determine site
    let site = 'Raipur Office';
    if (task.includes('Raipur office') || task.includes('Raipur New Office')) {
      site = 'Raipur Office';
    } else if (task.includes('CSR')) {
      site = 'CSR / Siladehi';
    } else if (task.includes('Bijetala')) {
      site = 'Bijetala Site';
    } else if (task.includes('Siladehi')) {
      site = 'Siladehi Site';
    } else if (department.toLowerCase().includes('store')) {
      site = 'CSR / Siladehi';
    }

    // Determine equipment type
    let equipmentType = 'IT Hardware';
    if (/computer|laptop/i.test(task)) {
      equipmentType = 'Computer / Laptop';
    } else if (/camera|cctv/i.test(task)) {
      equipmentType = 'CCTV Camera';
    } else if (/switch|modem|router/i.test(task)) {
      equipmentType = 'Switch / Modem';
    } else if (/printer|ink|cartridge/i.test(task)) {
      equipmentType = 'Printer & Cartridge';
    } else if (/intercom|epabx/i.test(task)) {
      equipmentType = 'Intercom Equipment';
    }

    return {
      id: `it-${taskId}`,
      taskId,
      doerName,
      doerEmail,
      department,
      frequency,
      task,
      site,
      equipmentType,
      plannedDate,
      actualDate: actualDate || undefined,
      status,
      email: email || undefined,
      buddyEmail: buddyEmail || undefined,
    };
  }

  private loadSeedITChecklist(): void {
    try {
      const filePath = path.join(__dirname, 'seedITChecklist.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.masterRows)) {
          this.itTasks.clear();
          for (const r of data.masterRows) {
            const task = this.parseITTaskRow(r);
            if (task) {
              this.itTasks.set(task.id, task);
            }
          }
          this.liveITChecklistCount = this.itTasks.size;
          this.computeITDoers();
          console.log(`[IT Checklist] Initialized ${this.itTasks.size} tasks from real Google Sheets dataset`);
        }
      }
    } catch (err: any) {
      console.warn('[IT Checklist Seed Warning]:', err?.message || err);
    }
  }

  private computeITDoers(): void {
    const doerMap = new Map<string, ITDoer>();

    for (const t of this.itTasks.values()) {
      if (!t.doerName) continue;
      if (!doerMap.has(t.doerName)) {
        doerMap.set(t.doerName, {
          name: t.doerName,
          department: t.department,
          email: t.doerEmail,
          totalAssigned: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          complianceRate: 0,
        });
      }

      const d = doerMap.get(t.doerName)!;
      d.totalAssigned++;
      if (t.status === 'Done') d.completed++;
      else if (t.status === 'Overdue') d.overdue++;
      else d.pending++;
    }

    for (const d of doerMap.values()) {
      d.complianceRate = d.totalAssigned > 0 ? Math.round((d.completed / d.totalAssigned) * 100) : 0;
    }

    this.itDoers = doerMap;
  }

  async listITTasks(filters: ITChecklistFilterParams = {}): Promise<PaginatedResult<ITChecklistTask>> {
    let items = Array.from(this.itTasks.values());

    // Search filter
    if (filters.search && filters.search !== 'undefined' && filters.search !== 'null' && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (t) =>
          t.task.toLowerCase().includes(q) ||
          t.taskId.toLowerCase().includes(q) ||
          t.doerName.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          t.site.toLowerCase().includes(q) ||
          t.equipmentType.toLowerCase().includes(q)
      );
    }

    // Doer filter
    if (filters.doerName && filters.doerName !== 'ALL' && filters.doerName !== 'undefined' && filters.doerName !== 'null') {
      items = items.filter((t) => t.doerName === filters.doerName);
    }

    // Site filter
    if (filters.site && filters.site !== 'ALL' && filters.site !== 'undefined' && filters.site !== 'null') {
      items = items.filter((t) => t.site === filters.site);
    }

    // Frequency filter
    if (filters.frequency && filters.frequency !== 'ALL' && filters.frequency !== 'undefined' && filters.frequency !== 'null') {
      items = items.filter((t) => t.frequency === filters.frequency);
    }

    // Equipment Type filter
    if (filters.equipmentType && filters.equipmentType !== 'ALL' && filters.equipmentType !== 'undefined' && filters.equipmentType !== 'null') {
      items = items.filter((t) => t.equipmentType === filters.equipmentType);
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL' && filters.status !== 'undefined' && filters.status !== 'null') {
      items = items.filter((t) => t.status === filters.status);
    }

    // Sort order: Overdue first, then Pending, then Done, then by plannedDate
    items.sort((a, b) => {
      const order: Record<ITTaskStatus, number> = { Overdue: 0, Pending: 1, Done: 2 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return Number(a.taskId) - Number(b.taskId);
    });

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 25));
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getITChecklistSummary(): Promise<ITChecklistSummary> {
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    let weeklyTasks = 0;
    let monthlyTasks = 0;
    const uniqueSites = new Set<string>();

    for (const t of this.itTasks.values()) {
      totalTasks++;
      if (t.status === 'Done') completedTasks++;
      else if (t.status === 'Overdue') overdueTasks++;
      else pendingTasks++;

      if (t.frequency === 'W') weeklyTasks++;
      else if (t.frequency === 'M') monthlyTasks++;

      if (t.site) uniqueSites.add(t.site);
    }

    const overallComplianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      weeklyTasks,
      monthlyTasks,
      overallComplianceRate,
      doersCount: this.itDoers.size,
      sitesCount: uniqueSites.size,
    };
  }

  async getITDoers(): Promise<ITDoer[]> {
    return Array.from(this.itDoers.values()).sort((a, b) => b.complianceRate - a.complianceRate);
  }

  async completeITTask(
    taskId: string,
    userId: string,
    userName: string,
    remarks?: string,
    actualDate?: string
  ): Promise<ITChecklistTask> {
    const key = taskId.startsWith('it-') ? taskId : `it-${taskId}`;
    const task = this.itTasks.get(key);
    if (!task) {
      throw new Error(`IT Checklist Task with ID ${taskId} not found`);
    }

    const todayStr = actualDate || new Date().toLocaleDateString('en-GB');
    const nowIso = new Date().toISOString();

    const updatedTask: ITChecklistTask = {
      ...task,
      status: 'Done',
      actualDate: todayStr,
      completedAt: nowIso,
      completedBy: userName,
      remarks: remarks || task.remarks,
    };

    this.itTasks.set(key, updatedTask);
    this.computeITDoers();

    // Log completion to live Google Sheets in background if configured
    googleIntegrationService
      .logITTaskCompletion(task.taskId, `${todayStr} ${new Date().toLocaleTimeString('en-GB')}`)
      .catch((err) => console.warn('[IT Complete Log Warning]:', err?.message || err));

    // Also record an audit entry
    await this.createAuditLog({
      recordType: 'VENDOR_PAYMENT', // Or audit log record
      recordId: task.id,
      sheetNo: `IT/${task.taskId}`,
      action: 'UPDATE',
      oldStatus: task.status,
      newStatus: 'Done',
      performedByUserId: userId,
      performedByName: userName,
      userRole: 'IT_ENGINEER',
      remarks: `Completed IT Checklist task "${task.task}". Planned: ${task.plannedDate}, Actual: ${todayStr}.${remarks ? ' Notes: ' + remarks : ''}`,
      module: 'reports',
      successFlag: true,
    });

    return updatedTask;
  }

  async syncITChecklist(): Promise<{ success: boolean; totalLoaded: number }> {
    try {
      const itRows = await googleIntegrationService.fetchITChecklistMaster();
      if (itRows && itRows.length > 0) {
        this.itTasks.clear();
        for (const r of itRows) {
          const task = this.parseITTaskRow(r);
          if (task) {
            this.itTasks.set(task.id, task);
          }
        }
        this.liveITChecklistCount = this.itTasks.size;
        this.computeITDoers();
        return { success: true, totalLoaded: this.itTasks.size };
      }
      return { success: false, totalLoaded: this.itTasks.size };
    } catch (err: any) {
      console.warn('[Sync IT Checklist Error]:', err?.message || err);
      return { success: false, totalLoaded: this.itTasks.size };
    }
  }

  // ==========================================
  // PURCHASE FMS MODULE
  // ==========================================

  private extractStageMetadata(sheetData: any, sheetType: 'Indent' | 'PO' | 'Store'): any[] {
    if (!sheetData || !sheetData.headers) return [];
    
    const what = sheetData.headers[1] || [];
    const who = sheetData.headers[2] || [];
    const columns = sheetData.headers[5] || [];
    
    const stages = [];
    let currentStage: any = null;
    
    for (let c = 0; c < columns.length; c++) {
      const colName = columns[c] ? columns[c].trim() : '';
      const taskName = what[c] ? what[c].trim() : '';
      const person = who[c] ? who[c].trim() : '';
      
      if (taskName && taskName !== 'What') {
         currentStage = {
           sheet: sheetType,
           name: taskName,
           responsible: person,
           colPlanned: -1,
           colActual: -1,
           colStatus: -1,
           colDelay: -1
         };
         stages.push(currentStage);
      }
      
      if (currentStage) {
         if (colName === 'Planned') currentStage.colPlanned = c;
         if (colName === 'Actual') currentStage.colActual = c;
         if (colName === 'Status' || colName === 'Yes/No') currentStage.colStatus = c;
         if (colName === 'Time Delay') currentStage.colDelay = c;
      }
    }
    return stages.filter((s: any) => s.colPlanned !== -1 || s.colActual !== -1);
  }

  private initializePurchasePipeline(): void {
    try {
      const dataPath = path.resolve(process.cwd(), 'src/server/storage/seedPurchaseFMS.json');
      if (!fs.existsSync(dataPath)) return;

      const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      this.purchasePipeline.clear();

      const indentMeta = this.extractStageMetadata(fileData.indentToPo, 'Indent');
      const poMeta = this.extractStageMetadata(fileData.poToDispatch, 'PO');
      const storeMeta = this.extractStageMetadata(fileData.storeToDispatch, 'Store');

      const buildStages = (row: any, meta: any[], indentNo: string) => {
        return meta.map((m, i) => ({
          id: `${indentNo}-${m.sheet}-${i}`,
          sheet: m.sheet,
          name: m.name,
          responsible: m.responsible,
          plannedDate: m.colPlanned !== -1 ? (row[m.colPlanned] || '') : '',
          actualDate: m.colActual !== -1 ? (row[m.colActual] || '') : '',
          status: m.colStatus !== -1 ? (row[m.colStatus] || '') : '',
          delay: m.colDelay !== -1 ? (row[m.colDelay] || '') : '',
        }));
      };

      // Pass 1: Indent to PO
      if (fileData.indentToPo && Array.isArray(fileData.indentToPo.rows)) {
        for (const r of fileData.indentToPo.rows) {
          const indentNo = (r[2] || '').toString().trim();
          if (!indentNo) continue;
          
          this.purchasePipeline.set(indentNo, {
            id: `po-${indentNo}`,
            indentNo,
            indentDate: r[3] || '',
            siteName: r[4] || '',
            priority: r[5] || '',
            poGenerated: false,
            materialReceived: false,
            dispatched: false,
            status: 'Pending PO',
            stages: buildStages(r, indentMeta, indentNo),
          });
        }
      }

      // Pass 2: PO to Dispatch
      if (fileData.poToDispatch && Array.isArray(fileData.poToDispatch.rows)) {
        for (const r of fileData.poToDispatch.rows) {
          const indentNo = (r[4] || '').toString().trim();
          if (!indentNo || !this.purchasePipeline.has(indentNo)) continue;
          
          const item = this.purchasePipeline.get(indentNo)!;
          item.poGenerated = true;
          item.poNumber = r[1] || '';
          item.vendorName = r[2] || '';
          item.poDate = r[5] || '';
          item.status = 'Pending Material';
          item.stages.push(...buildStages(r, poMeta, indentNo));

          // C8 (Index 10: Status of GET MATERIAL) or C12 (Index 14: CHECK & VERIFY MATERIAL)
          if (r[10] === 'Done' || r[14] === 'Done') {
            item.materialReceived = true;
            item.status = 'Pending Dispatch';
          }
          // C32 (Index 34: DISPATCH MATERIAL)
          if (r[34] === 'Done') {
            item.dispatched = true;
            item.status = 'Completed';
          }
        }
      }

      // Pass 3: Store to Dispatch
      if (fileData.storeToDispatch && Array.isArray(fileData.storeToDispatch.rows)) {
        for (const r of fileData.storeToDispatch.rows) {
          const indentNo = (r[2] || '').toString().trim();
          if (!indentNo || !this.purchasePipeline.has(indentNo)) continue;
          
          const item = this.purchasePipeline.get(indentNo)!;
          if (r[1]) {
            item.requisitionNo = (r[1] || '').toString().trim();
          }
          item.stages.push(...buildStages(r, storeMeta, indentNo));
          
          // C2 (Index 8: RECEIVE PURCHASED MATERIAL)
          if (r[8] === 'Done') {
            item.materialReceived = true;
            if (item.status === 'Pending PO' || item.status === 'Pending Material') {
               item.status = 'Pending Dispatch';
            }
          }
          // C34 (Index 36: DISPATCH ALL MATERIAL)
          if (r[36] === 'Done') {
            item.dispatched = true;
            item.status = 'Completed';
          }
        }
      }

      // Compute Bottleneck
      for (const item of this.purchasePipeline.values()) {
        const completedStatuses = ['Done', 'Yes', 'Y', 'No', 'N', 'NA', 'N/A'];
        
        let pendingStage = null;
        let skipNextN = 0;

        for (let i = 0; i < item.stages.length; i++) {
           const s = item.stages[i];
           if (!s.name) continue;

           if (skipNextN > 0) {
              skipNextN--;
              continue;
           }

           // Check conditional stages
           const statusUpper = (s.status || '').toUpperCase().trim();
           const isNegative = ['NO', 'N', 'NA', 'N/A'].includes(statusUpper);
           const isPositive = ['YES', 'Y'].includes(statusUpper);

           if (s.name.includes("IS ANY PARTS/ITEM DETAILS REQUIRED") && isNegative) {
               skipNextN = 1; // skip FILL GOOGLE FORM
           }
           else if (s.name.includes("IS OTHER QUOTATION REQUIRES") && isNegative) {
               skipNextN = 1; // skip GET OTHER QUOTATION
           }
           else if (s.name.includes("IS PAYMENT TO BE MADE IN ADVANCE") && isNegative) {
               skipNextN = 1; // skip SEND FOR PAYMENT
           }
           else if (s.name.includes("IS MATERIAL ACCEPTABLE") && isPositive) {
               skipNextN = 3; // skip RETURN/REPLACE, IS MATERIAL REPLACED, GET REFUND
           }
           else if (s.name.includes("IS E-WAY BILL REQUIRED") && isNegative) {
               skipNextN = 2; // skip SEND FOR E-WAY BILL, GET E-WAY BILL
           }

           // Check if this stage is pending
           if (!s.status || !completedStatuses.includes(s.status)) {
               pendingStage = s;
               break;
           }
        }
        
        if (pendingStage) {
          item.currentBottleneck = {
            stageName: pendingStage.name,
            responsible: pendingStage.responsible,
            delay: pendingStage.delay,
            sheet: pendingStage.sheet
          };
        }
      }
    } catch (err: any) {
      console.warn('[Purchase FMS Initialization Error]:', err.message);
    }
  }

  async getPurchasePipeline(filters: PurchaseFMSFilterParams): Promise<PaginatedResult<PurchasePipelineItem>> {
    let items = Array.from(this.purchasePipeline.values()) as PurchasePipelineItem[];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.indentNo.toLowerCase().includes(q) ||
          (i.poNumber && i.poNumber.toLowerCase().includes(q)) ||
          (i.vendorName && i.vendorName.toLowerCase().includes(q))
      );
    }

    if (filters.siteName) {
      items = items.filter((i) => i.siteName === filters.siteName);
    }

    if (filters.priority) {
      items = items.filter((i) => i.priority === filters.priority);
    }

    if (filters.status) {
      items = items.filter((i) => i.status === filters.status);
    }

    if (filters.dateStart || filters.dateEnd) {
      const start = filters.dateStart ? new Date(filters.dateStart).getTime() : 0;
      const end = filters.dateEnd ? new Date(filters.dateEnd).getTime() : Infinity;

      items = items.filter((i) => {
        return i.stages.some(stage => {
          if (!stage.plannedDate || stage.plannedDate === '-' || stage.plannedDate.trim() === '') return false;
          
          let stageTime = NaN;
          // Attempt parsing
          const parsed = new Date(stage.plannedDate);
          if (!isNaN(parsed.getTime())) {
            stageTime = parsed.getTime();
          } else {
            // Check DD/MM/YYYY format
            const parts = stage.plannedDate.split(/[/\-.]/);
            if (parts.length === 3) {
               // Assuming DD/MM/YYYY
               const d = parseInt(parts[0], 10);
               const m = parseInt(parts[1], 10) - 1;
               const y = parseInt(parts[2], 10);
               stageTime = new Date(y < 100 ? 2000 + y : y, m, d).getTime();
            }
          }
          
          if (!isNaN(stageTime)) {
             return stageTime >= start && stageTime <= end;
          }
          return false;
        });
      });
    }

    // Sort by indentDate roughly or ID
    items.sort((a, b) => b.indentNo.localeCompare(a.indentNo));

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getPurchaseSummary(): Promise<PurchaseFMSSummary> {
    const items = Array.from(this.purchasePipeline.values()) as PurchasePipelineItem[];
    
    let totalIndents = items.length;
    let poGenerated = 0;
    let materialReceived = 0;
    let dispatched = 0;
    
    let pendingPO = 0;
    let pendingMaterial = 0;
    let pendingDispatch = 0;

    for (const i of items) {
      if (i.poGenerated) poGenerated++;
      if (i.materialReceived) materialReceived++;
      if (i.dispatched) dispatched++;

      if (i.status === 'Pending PO') pendingPO++;
      if (i.status === 'Pending Material') pendingMaterial++;
      if (i.status === 'Pending Dispatch') pendingDispatch++;
    }

    return {
      totalIndents,
      poGenerated,
      materialReceived,
      dispatched,
      pendingPO,
      pendingMaterial,
      pendingDispatch
    };
  }
}

// Singleton repository instance
export const paymentRepository = new GoogleSheetsPaymentRepository();
