import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
// OpsFlow 360 – Vendor Payment Operational Workflow View

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VendorPayment, Beneficiary, PaymentStatusHistory } from '../../types';
import { StatusBadge } from './common/StatusBadge';
import { DriveAttachmentViewerModal } from './common/DriveAttachmentViewerModal';
import {
  CreditCard,
  Search,
  Plus,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Send,
  Lock,
  History,
  Upload,
  Download,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
} from 'lucide-react';

interface VendorPaymentViewProps {
  initialCreateOpen?: boolean;
}

export const VendorPaymentView: React.FC<VendorPaymentViewProps> = ({ initialCreateOpen = false }) => {
  const { currentUser, hasPermission, hasRole } = useAuth();

  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [approvedBeneficiaries, setApprovedBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: sortedItems, requestSort, sortConfig } = useSortableData(payments);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Google Sheets live sync & status
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [serverSummary, setServerSummary] = useState<{
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
  } | null>(null);

  // Google Drive Viewer modal state
  const [viewerData, setViewerData] = useState<{
    url: string;
    title?: string;
    vendorName?: string;
    sheetNo?: string;
  } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentEntryFilter, setPaymentEntryFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(initialCreateOpen);
  const [selectedRecord, setSelectedRecord] = useState<VendorPayment | null>(null);
  const [historyList, setHistoryList] = useState<PaymentStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action Dialogs
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionReference, setActionReference] = useState('');
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendorName: '',
    beneficiaryId: '',
    billNoPO: '',
    purposeOfPayment: '',
    site: currentUser?.location || 'Siladehi Site',
    department: currentUser?.department || 'Maintenance',
    modeOfPayment: 'ACCOUNT' as const,
    amountToBePaid: '',
    poBillInvoiceUrl: '',
    remark: '',
  });
  const [uploadedInvoiceName, setUploadedInvoiceName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes, sStatus, dMetrics, vSummary] = await Promise.all([
        api.listVendorPayments({
          search: searchTerm,
          status: statusFilter,
          paymentEntryStatus: paymentEntryFilter,
          paymentStatus: paymentStatusFilter,
          modeOfPayment: modeFilter,
          site: siteFilter,
          page,
          pageSize,
        }),
        api.listBeneficiaries({ status: 'APPROVED', pageSize: 100 }),
        api.getSheetsStatus().catch(() => null),
        api.getDashboardMetrics().catch(() => null),
        api.getVendorPaymentSummary().catch(() => null),
      ]);
      setPayments(pRes.items || []);
      if ((pRes as any).summary) {
        setServerSummary((pRes as any).summary);
      } else if (vSummary) {
        setServerSummary(vSummary);
      }
      if (sStatus) {
        setSheetsStatus(sStatus);
      }
      if (dMetrics?.metrics) {
        setDashboardMetrics(dMetrics.metrics);
      }
      if (pRes.pagination) {
        setTotalRecords(pRes.pagination.totalItems);
        setTotalPages(pRes.pagination.totalPages || 1);
      } else {
        setTotalRecords(pRes.items?.length || 0);
        setTotalPages(1);
      }
      setApprovedBeneficiaries(bRes.items || []);
    } catch (err) {
      console.error('Failed to load vendor payments data', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, paymentEntryFilter, paymentStatusFilter, modeFilter, siteFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, paymentEntryFilter, paymentStatusFilter, modeFilter, siteFilter]);

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    setSyncNotice(null);
    setSyncMessage(null);
    try {
      const res = await api.syncSheets();
      const msg = `Synchronized ${res?.data?.syncedCount || totalRecords} live records across all connected sheets.`;
      setSyncNotice(msg);
      setSyncMessage(msg);
      await loadData();
      setTimeout(() => {
        setSyncNotice(null);
        setSyncMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to sync sheets', err);
      const errMsg = 'Failed to sync from Google Sheets: ' + (err.message || 'Unknown error');
      setSyncNotice(errMsg);
      setSyncMessage(errMsg);
      setTimeout(() => {
        setSyncNotice(null);
        setSyncMessage(null);
      }, 5000);
    } finally {
      setSyncingSheets(false);
    }
  };

  // Summary KPIs calculation matching live Google Sheets dataset
  const summary = useMemo(() => {
    const totalCount = serverSummary?.totalCount ?? totalRecords ?? sheetsStatus?.vendorPaymentsCount ?? payments.length;
    const totalAmount = serverSummary?.totalAmount ?? dashboardMetrics?.totalRequestedAmount ?? sheetsStatus?.liveTotalAmount ?? payments.reduce((sum, p) => sum + (Number(p.amountToBePaid) || 0), 0);
    const approvedCount = serverSummary?.approvedCount ?? payments.filter((p) => p.status === 'APPROVED').length;
    const approvedAmount = serverSummary?.approvedAmount ?? dashboardMetrics?.totalApprovedAmount ?? payments.filter((p) => p.status === 'APPROVED').reduce((sum, p) => sum + (Number(p.amountToBePaid) || 0), 0);
    const paidCount = serverSummary?.paidCount ?? payments.filter((p) => p.paymentStatus === 'PAID').length;
    const paidAmount = serverSummary?.paidAmount ?? dashboardMetrics?.totalPaidAmount ?? payments.filter((p) => p.paymentStatus === 'PAID').reduce((sum, p) => sum + (Number(p.amountToBePaid) || 0), 0);
    const pendingCount = serverSummary?.pendingCount ?? payments.filter((p) => ['SUBMITTED', 'UNDER_REVIEW', 'HOLD'].includes(p.status)).length;
    const pendingAmount = serverSummary?.pendingAmount ?? dashboardMetrics?.totalPendingAmount ?? payments.filter((p) => ['SUBMITTED', 'UNDER_REVIEW', 'HOLD'].includes(p.status)).reduce((sum, p) => sum + (Number(p.amountToBePaid) || 0), 0);
    const rejectedCount = serverSummary?.rejectedCount ?? payments.filter((p) => ['REJECTED', 'CANCELLED'].includes(p.status)).length;

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
    };
  }, [serverSummary, payments, totalRecords, sheetsStatus, dashboardMetrics]);

  const viewDetails = async (record: VendorPayment) => {
    setSelectedRecord(record);
    setHistoryLoading(true);
    try {
      const h = await api.getVendorPaymentHistory(record.id);
      setHistoryList(h);
    } catch (err) {
      console.error('Failed to load payment history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.uploadFile(file, 'VENDOR_PAYMENT');
      setFormData(prev => ({ ...prev, poBillInvoiceUrl: res.downloadUrl || `/api/files/${res.id}/download` }));
      setUploadedInvoiceName(file.name);
    } catch (err: any) {
      setFormError(err.message || 'File upload failed');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.vendorName.trim()) {
      setFormError('Vendor Name is required.');
      return;
    }
    if (!formData.billNoPO.trim()) {
      setFormError('Bill Number / PO Number is required.');
      return;
    }
    if (!formData.purposeOfPayment.trim()) {
      setFormError('Purpose of Payment is required.');
      return;
    }
    const numAmount = parseFloat(formData.amountToBePaid);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Valid positive payment amount is required.');
      return;
    }
    if (['ACCOUNT', 'NEFT', 'RTGS', 'IMPS'].includes(formData.modeOfPayment) && !formData.beneficiaryId) {
      setFormError('You must link an Approved Beneficiary account for electronic bank transfer.');
      return;
    }
    if (!formData.poBillInvoiceUrl) {
      setFormError('Invoice / PO document upload is mandatory for payment clearance.');
      return;
    }

    setFormSubmitting(true);
    try {
      const created = await api.createVendorPayment({
        ...formData,
        amountToBePaid: numAmount,
      });
      setShowCreateModal(false);
      setFormData({
        vendorName: '',
        beneficiaryId: '',
        billNoPO: '',
        purposeOfPayment: '',
        site: currentUser?.location || 'Siladehi Site',
        department: currentUser?.department || 'Maintenance',
        modeOfPayment: 'ACCOUNT',
        amountToBePaid: '',
        poBillInvoiceUrl: '',
        remark: '',
      });
      setUploadedInvoiceName(null);
      await loadData();
      viewDetails(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit payment request');
    } finally {
      setFormSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (!selectedRecord || !actionType) return;
    setActionError(null);

    if (['REJECT', 'CANCEL', 'MARK_FAILED', 'MARK_REVERSED'].includes(actionType) && !actionRemarks.trim()) {
      setActionError(`Mandatory ${actionType.toLowerCase()} reason is required.`);
      return;
    }
    if (actionType === 'MARK_PAID' && !actionReference.trim() && !actionRemarks.trim()) {
      setActionError('Bank UTR reference or payment confirmation remarks are mandatory.');
      return;
    }

    setSubmittingAction(true);
    try {
      let updated: VendorPayment;
      if (actionType === 'REVIEW') {
        updated = await api.reviewVendorPayment(selectedRecord.id, actionRemarks);
      } else if (actionType === 'APPROVE') {
        updated = await api.approveVendorPayment(selectedRecord.id, actionRemarks);
      } else if (actionType === 'REJECT') {
        updated = await api.rejectVendorPayment(selectedRecord.id, actionRemarks);
      } else if (actionType === 'CANCEL') {
        updated = await api.cancelVendorPayment(selectedRecord.id, actionRemarks);
      } else if (actionType === 'START_ENTRY') {
        updated = await api.startVendorPaymentEntry(selectedRecord.id, actionRemarks);
      } else if (actionType === 'COMPLETE_ENTRY') {
        updated = await api.completeVendorPaymentEntry(selectedRecord.id, actionReference, actionRemarks);
      } else if (actionType === 'MARK_PAID') {
        updated = await api.markVendorPaymentPaid(
          selectedRecord.id,
          actionReference,
          actionRemarks,
          verificationRemarks
        );
      } else if (actionType === 'MARK_FAILED') {
        updated = await api.markVendorPaymentFailed(selectedRecord.id, actionRemarks);
      } else if (actionType === 'MARK_REVERSED') {
        updated = await api.markVendorPaymentReversed(selectedRecord.id, actionRemarks);
      } else {
        throw new Error('Unknown action');
      }

      setSelectedRecord(updated);
      setActionType(null);
      setActionRemarks('');
      setActionReference('');
      setVerificationRemarks('');
      await loadData();
      const h = await api.getVendorPaymentHistory(updated.id);
      setHistoryList(h);
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute payment action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-5 pb-12">
      {/* Google Sheets Integration Live Banner */}
      <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-950">Connected Google Sheet:</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Ops Flow 360 - Vendor Payment Process Form (Responses)
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                {sheetsStatus?.spreadsheetId || '1aV7d-5e263Esq1_uO7eY_YvX9aB1Hw0jZ3l3l7h5m5c'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Live operational ingestion active (~{summary.totalCount} records loaded). Strictly read-only to preserve formulas and protected columns. Ingesting bills and attachments in secure viewer mode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          {syncNotice && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
              {syncNotice}
            </span>
          )}
          <button
            onClick={handleSyncSheets}
            disabled={syncingSheets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
            title="Fetch fresh records from Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${syncingSheets ? 'animate-spin' : ''}`} />
            <span>{syncingSheets ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetsStatus?.spreadsheetId || '1aV7d-5e263Esq1_uO7eY_YvX9aB1Hw0jZ3l3l7h5m5c'}/edit`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200 transition-colors"
            title="Open Google Sheet in viewer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Open Sheet</span>
          </a>
        </div>
      </div>

      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Vendor Payment Master & Approval Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-stage validation for vendor invoices, purchase orders, approval hierarchy, bank clearance, and UTR tracking.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Vendor Payment Request</span>
        </button>
      </div>

      {/* Summary KPI Cards - Clickable to Auto-Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Invoices & Bills */}
        <div
          id="vp-card-all"
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('');
            setPaymentStatusFilter('');
            setPaymentEntryFilter('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('');
              setPaymentStatusFilter('');
              setPaymentEntryFilter('');
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            !statusFilter && !paymentStatusFilter && !paymentEntryFilter
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to view all invoices and bills"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Total Invoices & Bills</span>
            {!statusFilter && !paymentStatusFilter && !paymentEntryFilter ? (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600">All</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{summary.totalCount}</span>
            <span className="text-[10px] text-slate-400">Bills</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {!statusFilter && !paymentStatusFilter && !paymentEntryFilter ? 'Currently showing all' : 'Click to show all'}
          </span>
        </div>

        {/* Card 2: Approved Bills */}
        <div
          id="vp-card-approved"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'APPROVED' && !paymentStatusFilter) {
              setStatusFilter('');
            } else {
              setStatusFilter('APPROVED');
              setPaymentStatusFilter('');
              setPaymentEntryFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'APPROVED' && !paymentStatusFilter) {
                setStatusFilter('');
              } else {
                setStatusFilter('APPROVED');
                setPaymentStatusFilter('');
                setPaymentEntryFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'APPROVED' && !paymentStatusFilter
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Approved bills"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Approved Bills</span>
            {statusFilter === 'APPROVED' && !paymentStatusFilter ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-700">{summary.approvedCount}</span>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600">Approved</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'APPROVED' && !paymentStatusFilter ? 'Filtering: Approved (Click to reset)' : 'Click to filter approved'}
          </span>
        </div>

        {/* Card 3: Disbursed / Paid */}
        <div
          id="vp-card-paid"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (paymentStatusFilter === 'PAID') {
              setPaymentStatusFilter('');
            } else {
              setPaymentStatusFilter('PAID');
              setStatusFilter('');
              setPaymentEntryFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (paymentStatusFilter === 'PAID') {
                setPaymentStatusFilter('');
              } else {
                setPaymentStatusFilter('PAID');
                setStatusFilter('');
                setPaymentEntryFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            paymentStatusFilter === 'PAID'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Disbursed / Paid"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Disbursed / Paid</span>
            {paymentStatusFilter === 'PAID' ? (
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Settled</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-blue-700">{summary.paidCount}</span>
            <span className="text-[10px] text-slate-400 group-hover:text-blue-600">Settled</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {paymentStatusFilter === 'PAID' ? 'Filtering: Paid (Click to reset)' : 'Click to filter settled'}
          </span>
        </div>

        {/* Card 4: Pending / In Review */}
        <div
          id="vp-card-pending"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'SUBMITTED' || statusFilter === 'PENDING') {
              setStatusFilter('');
            } else {
              setStatusFilter('SUBMITTED');
              setPaymentStatusFilter('');
              setPaymentEntryFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'SUBMITTED' || statusFilter === 'PENDING') {
                setStatusFilter('');
              } else {
                setStatusFilter('SUBMITTED');
                setPaymentStatusFilter('');
                setPaymentEntryFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'SUBMITTED' || statusFilter === 'PENDING'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Pending / In Review"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Pending / In Review</span>
            {statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' ? (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Action req.</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-700">{summary.pendingCount}</span>
            <span className="text-[10px] text-slate-400 group-hover:text-amber-600">Pending</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' ? 'Filtering: Pending (Click to reset)' : 'Click to filter pending'}
          </span>
        </div>

        {/* Card 5: Rejected */}
        <div
          id="vp-card-rejected"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'REJECTED') {
              setStatusFilter('');
            } else {
              setStatusFilter('REJECTED');
              setPaymentStatusFilter('');
              setPaymentEntryFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'REJECTED') {
                setStatusFilter('');
              } else {
                setStatusFilter('REJECTED');
                setPaymentStatusFilter('');
                setPaymentEntryFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Rejected"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Rejected Bills</span>
            {statusFilter === 'REJECTED' ? (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Declined</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-700">{summary.rejectedCount}</span>
            <span className="text-[10px] text-slate-400 group-hover:text-rose-600">Rejected</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'REJECTED' ? 'Filtering: Rejected (Click to reset)' : 'Click to filter rejected'}
          </span>
        </div>
      </div>

      {/* Active Card Filter Banner */}
      {Boolean(statusFilter || paymentStatusFilter || paymentEntryFilter) && (
        <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Card Filter Active: <strong className="font-semibold">{statusFilter ? `Status: ${statusFilter}` : paymentStatusFilter ? `Payment Status: ${paymentStatusFilter}` : `Entry Status: ${paymentEntryFilter}`}</strong> ({totalRecords} matching records found)
            </span>
          </div>
          <button
            onClick={() => {
              setStatusFilter('');
              setPaymentStatusFilter('');
              setPaymentEntryFilter('');
            }}
            className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer text-[11px]"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Sheet No, Vendor, Bill/PO, Purpose, Requester, Site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Approval Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={paymentEntryFilter}
          onChange={(e) => setPaymentEntryFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Banking Entries</option>
          <option value="NOT_STARTED">Entry Not Started</option>
          <option value="IN_PROGRESS">Entry In Progress</option>
          <option value="DONE">Entry Done</option>
          <option value="FAILED">Entry Failed</option>
        </select>

        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Payment Settlements</option>
          <option value="NOT_PAID">Not Paid</option>
          <option value="PROCESSING">Processing</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REVERSED">Reversed</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Modes</option>
          <option value="ACCOUNT">Account Transfer</option>
          <option value="UPI">UPI</option>
          <option value="NEFT">NEFT</option>
          <option value="RTGS">RTGS</option>
          <option value="IMPS">IMPS</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CASH">Cash</option>
        </select>

        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Sites</option>
          <option value="SILADEHI SITE">Siladehi Site</option>
          <option value="RAIPUR OFFICE">Raipur Office</option>
          <option value="BIJETALA SITE">Bijetala Site</option>
          <option value="RAIPUR WORKSHOP">Raipur Workshop</option>
          <option value="RAIPUR NEW OFFICE">Raipur New Office</option>
          <option value="Bilaspur Depot">Bilaspur Depot</option>
        </select>
      </div>

      {/* Vendor Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Vendor Name" sortKey="vendorName" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Bill / PO No" sortKey="billNoPO" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-3 py-3 text-center">Invoice</th>
                <th className="px-4 py-3"><SortHeader label="Mode" sortKey="modeOfPayment" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amountToBePaid" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Site / Dept" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Approval" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Bank Entry" sortKey="paymentEntry" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Settlement" sortKey="paymentStatus" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    Loading payments data...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                    No vendor payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => viewDetails(p)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-900 whitespace-nowrap">
                      {p.sheetNo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Date(p.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[160px] truncate" title={p.vendorName}>
                      {p.vendorName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{p.billNoPO}</td>
                    <td className="px-3 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {p.poBillInvoiceUrl ? (
                        <button
                          onClick={() =>
                            setViewerData({
                              url: p.poBillInvoiceUrl!,
                              title: `Invoice / Bill: ${p.billNoPO || p.sheetNo}`,
                              vendorName: p.vendorName,
                              sheetNo: p.sheetNo,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition-colors shadow-2xs"
                          title="Open Invoice in Secure Viewer"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Doc</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {p.modeOfPayment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(p.amountToBePaid)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{p.site}</span>
                      <span className="block text-[10px] text-slate-400">{p.department}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={p.status} type="approval" size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={p.paymentEntry} type="addition" size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={p.paymentStatus} type="payment" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetails(p);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-900">{totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(page * pageSize, totalRecords)}</strong> of{' '}
              <strong className="text-slate-900">{totalRecords}</strong> records
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-semibold text-slate-800 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Details & Actions Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-base font-bold text-slate-900">
                    {selectedRecord.sheetNo}
                  </h3>
                  <StatusBadge status={selectedRecord.status} type="approval" size="sm" />
                  <StatusBadge status={selectedRecord.paymentStatus} type="payment" size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor: <strong>{selectedRecord.vendorName}</strong> · PO/Bill: {selectedRecord.billNoPO}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {currentUser?.role === 'EMPLOYEE_REQUESTER' && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Immutable Record Policy:</span> Amount, vendor, and bill attachments cannot be modified after submission. Requesters can track progress below.
                  </div>
                </div>
              )}

              {/* Payment Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Payable Amount</span>
                  <span className="font-bold text-slate-900 text-lg mt-0.5 block">
                    {formatCurrency(selectedRecord.amountToBePaid)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Payment Method</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{selectedRecord.modeOfPayment}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Site & Department</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {selectedRecord.site} ({selectedRecord.department})
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 font-medium block">Invoice / PO Attachment</span>
                  {selectedRecord.poBillInvoiceUrl ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setViewerData({
                            url: selectedRecord.poBillInvoiceUrl!,
                            title: `Invoice Doc: ${selectedRecord.billNoPO || selectedRecord.sheetNo}`,
                            vendorName: selectedRecord.vendorName,
                            sheetNo: selectedRecord.sheetNo,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview Document (Viewer Mode)</span>
                      </button>
                      <a
                        href={selectedRecord.poBillInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <span>Drive Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-rose-500 font-medium mt-1 block">Not attached</span>
                  )}
                </div>
              </div>

              {/* Purpose & Remarks */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Purpose of Payment</span>
                  <p className="text-slate-800 font-medium mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {selectedRecord.purposeOfPayment}
                  </p>
                </div>

                {selectedRecord.paymentReferenceNumber && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-semibold block">Bank UTR / Transaction Reference</span>
                    <span className="font-mono text-sm font-bold text-emerald-900 mt-0.5 block">
                      {selectedRecord.paymentReferenceNumber}
                    </span>
                    {selectedRecord.paymentRemarks && (
                      <p className="text-xs text-emerald-800 mt-1">{selectedRecord.paymentRemarks}</p>
                    )}
                  </div>
                )}

                {selectedRecord.rejectionReason && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-rose-700 font-semibold block">Rejection Reason</span>
                    <span className="text-rose-900 mt-0.5 block">{selectedRecord.rejectionReason}</span>
                  </div>
                )}
                {selectedRecord.cancellationReason && (
                  <div className="p-3 rounded-lg bg-zinc-100 border border-zinc-200">
                    <span className="text-zinc-700 font-semibold block">Cancellation Reason</span>
                    <span className="text-zinc-900 mt-0.5 block">{selectedRecord.cancellationReason}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-indigo-600" />
                  Vendor Payment & Disbursement Timeline
                </h4>
                {historyLoading ? (
                  <p className="text-xs text-slate-400">Loading timeline...</p>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 ml-2">
                    {historyList.map((h) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{h.newStatus}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            By <strong>{h.changedByName}</strong>: {h.remarks || 'Status updated'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400 font-mono">
                v{selectedRecord.recordVersion} · ID: {selectedRecord.id}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Cancel action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) &&
                  (currentUser?.id === selectedRecord.submittedByUserId || currentUser?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => setActionType('CANCEL')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      Cancel Request
                    </button>
                  )}

                {/* Review action */}
                {selectedRecord.status === 'SUBMITTED' && hasPermission('VENDOR_PAYMENT_REVIEW') && (
                  <button
                    onClick={() => setActionType('REVIEW')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                  >
                    Mark Under Review
                  </button>
                )}

                {/* Reject action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('VENDOR_PAYMENT_REJECT') && (
                  <button
                    onClick={() => setActionType('REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Reject
                  </button>
                )}

                {/* Approve action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('VENDOR_PAYMENT_APPROVE') && (
                  <button
                    onClick={() => setActionType('APPROVE')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Approve Payment
                  </button>
                )}

                {/* Start Payment Entry action (Bank Operator / Approver) */}
                {selectedRecord.status === 'APPROVED' &&
                  selectedRecord.paymentEntry === 'NOT_STARTED' &&
                  hasPermission('VENDOR_PAYMENT_START_PAYMENT_ENTRY') && (
                    <button
                      onClick={() => setActionType('START_ENTRY')}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                    >
                      Start Bank Entry
                    </button>
                  )}

                {/* Complete Payment Entry action */}
                {selectedRecord.status === 'APPROVED' &&
                  selectedRecord.paymentEntry === 'IN_PROGRESS' &&
                  hasPermission('VENDOR_PAYMENT_COMPLETE_PAYMENT_ENTRY') && (
                    <button
                      onClick={() => setActionType('COMPLETE_ENTRY')}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                    >
                      Submit to Bank Portal
                    </button>
                  )}

                {/* Mark PAID action */}
                {selectedRecord.status === 'APPROVED' &&
                  selectedRecord.paymentStatus !== 'PAID' &&
                  selectedRecord.paymentStatus !== 'FAILED' &&
                  hasPermission('VENDOR_PAYMENT_MARK_PAID') && (
                    <>
                      <button
                        onClick={() => setActionType('MARK_FAILED')}
                        className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold"
                      >
                        Mark Failed
                      </button>
                      <button
                        onClick={() => setActionType('MARK_PAID')}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Mark as PAID (with UTR)</span>
                      </button>
                    </>
                  )}

                {/* Reversal action for auditors or admins */}
                {selectedRecord.paymentStatus === 'PAID' && hasPermission('VENDOR_PAYMENT_MARK_REVERSED') && (
                  <button
                    onClick={() => setActionType('MARK_REVERSED')}
                    className="px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold"
                  >
                    Mark Reversed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Execution Dialog */}
      {actionType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Confirm Action: {actionType.replace(/_/g, ' ')}
            </h3>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            {['COMPLETE_ENTRY', 'MARK_PAID'].includes(actionType) && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Reference Number (UTR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC-9920148"
                  value={actionReference}
                  onChange={(e) => setActionReference(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            {actionType === 'MARK_PAID' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Statement Debit Verification Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Debited from Account 50200012345678 on today's bank statement"
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {['REJECT', 'CANCEL', 'MARK_FAILED', 'MARK_REVERSED'].includes(actionType)
                  ? 'Mandatory Reason *'
                  : 'Operational Remarks'}
              </label>
              <textarea
                rows={3}
                placeholder="Add context for this action..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setActionRemarks('');
                  setActionReference('');
                  setVerificationRemarks('');
                  setActionError(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={executeAction}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {submittingAction ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Vendor Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-900">New Vendor Payment Request</h3>
                <p className="text-xs text-slate-500">Atomic number BPL/PAY/YYYYMMDD/NN assigned upon submission.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Vendor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DC Earthmovers Equipment Repairs"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Bill No / PO No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV/2026/0921"
                    value={formData.billNoPO}
                    onChange={(e) => setFormData({ ...formData, billNoPO: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount To Be Paid (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 75000"
                    value={formData.amountToBePaid}
                    onChange={(e) => setFormData({ ...formData, amountToBePaid: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mode of Payment</label>
                  <select
                    value={formData.modeOfPayment}
                    onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="ACCOUNT">Account Transfer</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Operational Site</label>
                  <select
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="Siladehi Site">Siladehi Site</option>
                    <option value="Raipur Office">Raipur Office</option>
                    <option value="Bilaspur Depot">Bilaspur Depot</option>
                  </select>
                </div>
              </div>

              {/* Link to Approved Beneficiary */}
              {['ACCOUNT', 'NEFT', 'RTGS', 'IMPS'].includes(formData.modeOfPayment) && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Approved Beneficiary Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.beneficiaryId}
                    onChange={(e) => {
                      const sel = approvedBeneficiaries.find(b => b.id === e.target.value);
                      setFormData({
                        ...formData,
                        beneficiaryId: e.target.value,
                        vendorName: sel ? sel.nameOfBeneficiary : formData.vendorName,
                      });
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Choose verified beneficiary --</option>
                    {approvedBeneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameOfBeneficiary} · {b.bankName} (A/C: {b.accountNo} - IFSC: {b.ifscCode})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Only beneficiaries approved by Finance are authorized for electronic transfer.
                  </span>
                </div>
              )}

              {/* Invoice Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload Invoice / PO Document (Mandatory) <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={handleInvoiceUpload}
                    className="hidden"
                    id="invoice-file-upload"
                  />
                  <label htmlFor="invoice-file-upload" className="cursor-pointer block">
                    <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 block">
                      {uploadedInvoiceName || 'Select Invoice / Purchase Order Document (PDF, JPG, PNG, XLSX)'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Max size 10 MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purpose of Payment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excavator hydraulic pump repair and oil replacement"
                  value={formData.purposeOfPayment}
                  onChange={(e) => setFormData({ ...formData, purposeOfPayment: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Additional Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for reviewer..."
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{formSubmitting ? 'Submitting...' : 'Submit Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Secure Attachment Viewer (Read-Only Viewer with Contact Owner option) */}
      <DriveAttachmentViewerModal
        isOpen={!!viewerData}
        url={viewerData?.url}
        title={viewerData?.title}
        vendorName={viewerData?.vendorName}
        sheetNo={viewerData?.sheetNo}
        onClose={() => setViewerData(null)}
      />
    </div>
  );
};
