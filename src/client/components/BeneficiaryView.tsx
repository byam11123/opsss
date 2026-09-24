import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
// OpsFlow 360 – Beneficiary Addition & Management View

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Beneficiary, PaymentStatusHistory } from '../../types';
import { StatusBadge } from './common/StatusBadge';
import { DriveAttachmentViewerModal } from './common/DriveAttachmentViewerModal';
import {
  UserCheck,
  Search,
  Plus,
  Building,
  CreditCard,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Send,
  Lock,
  History,
  Upload,
  FileText,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Filter,
} from 'lucide-react';

interface BeneficiaryViewProps {
  initialCreateOpen?: boolean;
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const BeneficiaryView: React.FC<BeneficiaryViewProps> = ({ initialCreateOpen = false }) => {
  const { currentUser, hasPermission, hasRole } = useAuth();

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: sortedBeneficiaries, requestSort, sortConfig } = useSortableData(beneficiaries);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [additionStatusFilter, setAdditionStatusFilter] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [serverSummary, setServerSummary] = useState<{
    totalCount: number;
    approvedCount: number;
    addedInPortalCount: number;
    pendingCount: number;
    rejectedCount: number;
  } | null>(null);

  // Viewer state for Google Drive / Cheque documents
  const [viewerData, setViewerData] = useState<{
    url: string;
    title?: string;
    vendorName?: string;
    sheetNo?: string;
  } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(initialCreateOpen);
  const [selectedRecord, setSelectedRecord] = useState<Beneficiary | null>(null);
  const [historyList, setHistoryList] = useState<PaymentStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action Dialogs
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionReference, setActionReference] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Creation form state
  const [formData, setFormData] = useState({
    nameOfBeneficiary: '',
    accountNo: '',
    ifscCode: '',
    bankName: '',
    purpose: '',
    cancelledChequeUrl: '',
    remark: '',
    department: currentUser?.department || 'Operations',
  });
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, benSummary] = await Promise.all([
        api.listBeneficiaries({
          search: searchTerm,
          status: statusFilter,
          additionStatus: additionStatusFilter,
          page,
          pageSize,
        }),
        api.getBeneficiarySummary().catch(() => null),
      ]);
      setBeneficiaries(res.items || []);
      setTotalItems(res.pagination?.totalItems || (res.items || []).length);
      if ((res as any).summary) {
        setServerSummary((res as any).summary);
      } else if (benSummary) {
        setServerSummary(benSummary);
      }
    } catch (err) {
      console.error('Failed to load beneficiaries', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, additionStatusFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, additionStatusFilter]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await api.syncSheets();
      setSyncNotice(`Synchronized ${res?.data?.syncedCount || 0} live records across all sheets.`);
      await loadData();
    } catch (err: any) {
      setSyncNotice(`Sync Notice: ${err.message || 'Updated from live repository'}`);
      await loadData();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  // Summary KPIs from live sheets dataset
  const summary = useMemo(() => {
    const total = serverSummary?.totalCount ?? totalItems ?? beneficiaries.length;
    const approvedCount = serverSummary?.approvedCount ?? beneficiaries.filter(b => b.status === 'APPROVED').length;
    const addedInPortalCount = serverSummary?.addedInPortalCount ?? beneficiaries.filter(b => b.additionStatus === 'DONE' || b.additionStatus === 'ADDED').length;
    const pendingReviewCount = serverSummary?.pendingCount ?? beneficiaries.filter(b => ['SUBMITTED', 'UNDER_REVIEW', 'HOLD'].includes(b.status)).length;
    const rejectedCount = serverSummary?.rejectedCount ?? beneficiaries.filter(b => ['REJECTED', 'CANCELLED', 'NOT_APPROVED'].includes(b.status)).length;

    return {
      total,
      approvedCount,
      addedInPortalCount,
      pendingReviewCount,
      rejectedCount,
    };
  }, [serverSummary, beneficiaries, totalItems]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const viewDetails = async (record: Beneficiary) => {
    setSelectedRecord(record);
    setHistoryLoading(true);
    try {
      const h = await api.getBeneficiaryHistory(record.id);
      setHistoryList(h);
    } catch (err) {
      console.error('Failed to load beneficiary history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.uploadFile(file, 'BENEFICIARY_CHEQUE');
      setFormData(prev => ({ ...prev, cancelledChequeUrl: res.downloadUrl || `/api/files/${res.id}/download` }));
      setUploadedFileName(file.name);
    } catch (err: any) {
      setFormError(err.message || 'File upload failed');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formData.nameOfBeneficiary.trim();
    const cleanAcc = formData.accountNo.trim().replace(/\s+/g, '');
    const cleanIfsc = formData.ifscCode.trim().toUpperCase();

    if (!cleanName) {
      setFormError('Beneficiary Name is required.');
      return;
    }
    if (!cleanAcc || cleanAcc.length < 9 || cleanAcc.length > 18 || !/^\d+$/.test(cleanAcc)) {
      setFormError('Account number must be numeric and between 9 to 18 digits.');
      return;
    }
    if (!IFSC_REGEX.test(cleanIfsc)) {
      setFormError('Invalid IFSC code format (e.g. SBIN0004283, ICIC0000161).');
      return;
    }
    if (!formData.bankName.trim()) {
      setFormError('Bank Name is required.');
      return;
    }
    if (!formData.purpose.trim()) {
      setFormError('Purpose of onboarding beneficiary is required.');
      return;
    }
    if (!formData.cancelledChequeUrl) {
      setFormError('Cancelled Cheque document upload is mandatory for fraud prevention.');
      return;
    }

    setFormSubmitting(true);
    try {
      const created = await api.createBeneficiary({
        ...formData,
        accountNo: cleanAcc,
        ifscCode: cleanIfsc,
      });
      setShowCreateModal(false);
      setFormData({
        nameOfBeneficiary: '',
        accountNo: '',
        ifscCode: '',
        bankName: '',
        purpose: '',
        cancelledChequeUrl: '',
        remark: '',
        department: currentUser?.department || 'Operations',
      });
      setUploadedFileName(null);
      await loadData();
      viewDetails(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit beneficiary');
    } finally {
      setFormSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (!selectedRecord || !actionType) return;
    setActionError(null);

    if (['REJECT', 'CANCEL'].includes(actionType) && !actionRemarks.trim()) {
      setActionError(`Mandatory ${actionType.toLowerCase()} reason is required.`);
      return;
    }
    if (actionType === 'COMPLETE_ENTRY' && !actionReference.trim() && !actionRemarks.trim()) {
      setActionError('Bank portal reference number or entry remarks are required.');
      return;
    }
    if (actionType === 'MARK_FAILED' && !actionRemarks.trim()) {
      setActionError('Please specify reason for beneficiary entry failure.');
      return;
    }

    setSubmittingAction(true);
    try {
      let updated: Beneficiary;
      if (actionType === 'REVIEW') {
        updated = await api.reviewBeneficiary(selectedRecord.id, actionRemarks);
      } else if (actionType === 'APPROVE') {
        updated = await api.approveBeneficiary(selectedRecord.id, actionRemarks);
      } else if (actionType === 'REJECT') {
        updated = await api.rejectBeneficiary(selectedRecord.id, actionRemarks);
      } else if (actionType === 'CANCEL') {
        updated = await api.cancelBeneficiary(selectedRecord.id, actionRemarks);
      } else if (actionType === 'START_ENTRY') {
        updated = await api.startBeneficiaryEntry(selectedRecord.id, actionRemarks);
      } else if (actionType === 'COMPLETE_ENTRY') {
        updated = await api.completeBeneficiaryEntry(selectedRecord.id, actionReference, actionRemarks);
      } else if (actionType === 'MARK_FAILED') {
        updated = await api.markBeneficiaryFailed(selectedRecord.id, actionRemarks);
      } else {
        throw new Error('Unknown action');
      }

      setSelectedRecord(updated);
      setActionType(null);
      setActionRemarks('');
      setActionReference('');
      await loadData();
      const h = await api.getBeneficiaryHistory(updated.id);
      setHistoryList(h);
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute action');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Google Sheets Integration Live Banner */}
      <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-950">Connected Google Sheet:</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Ops Flow 360 - Beneficiary Addition Form (Responses)
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                15nd-fIaWYoiS3LYZnY-C0bnicHomEemgAnu_Ll6z7gA
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Two-stage bank validation and live syncing active. Ingesting bank accounts and cancelled cheque attachments in secure viewer mode.
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
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
            title="Fetch fresh records from Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
          <a
            href="https://docs.google.com/spreadsheets/d/15nd-fIaWYoiS3LYZnY-C0bnicHomEemgAnu_Ll6z7gA/edit"
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
            <UserCheck className="h-5 w-5 text-indigo-600" />
            Beneficiary Master & Approval Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-stage validation for bank accounts, IFSC validation, cancelled cheque verification, and portal registration.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Beneficiary Request</span>
        </button>
      </div>

      {/* Summary KPI Cards - Clickable to Auto-Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Beneficiaries */}
        <div
          id="ben-card-all"
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('');
            setAdditionStatusFilter('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('');
              setAdditionStatusFilter('');
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            !statusFilter && !additionStatusFilter
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to show all beneficiaries"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Total Beneficiaries</span>
            {!statusFilter && !additionStatusFilter ? (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600">All</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{summary.total}</span>
            <span className="text-[10px] text-slate-400">Accounts</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {!statusFilter && !additionStatusFilter ? 'Currently showing all' : 'Click to show all accounts'}
          </span>
        </div>

        {/* Card 2: Approved Beneficiaries */}
        <div
          id="ben-card-approved"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'APPROVED' && !additionStatusFilter) {
              setStatusFilter('');
            } else {
              setStatusFilter('APPROVED');
              setAdditionStatusFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'APPROVED' && !additionStatusFilter) {
                setStatusFilter('');
              } else {
                setStatusFilter('APPROVED');
                setAdditionStatusFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Approved Beneficiaries"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Approved</span>
            {statusFilter === 'APPROVED' ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-700">{summary.approvedCount}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Ready</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'APPROVED' ? 'Filtering: Approved (Click to reset)' : 'Click to filter approved'}
          </span>
        </div>

        {/* Card 3: Added in Bank Portal */}
        <div
          id="ben-card-added"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (additionStatusFilter === 'DONE' && !statusFilter) {
              setAdditionStatusFilter('');
            } else {
              setAdditionStatusFilter('DONE');
              setStatusFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (additionStatusFilter === 'DONE' && !statusFilter) {
                setAdditionStatusFilter('');
              } else {
                setAdditionStatusFilter('DONE');
                setStatusFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            additionStatusFilter === 'DONE'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Added in Bank Portal"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Added in Portal</span>
            {additionStatusFilter === 'DONE' ? (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Active Ready</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-700">{summary.addedInPortalCount}</span>
            <span className="text-[10px] text-indigo-600 font-medium">Bank Synced</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {additionStatusFilter === 'DONE' ? 'Filtering: In Portal (Click to reset)' : 'Click to filter in portal'}
          </span>
        </div>

        {/* Card 4: Pending / On Hold */}
        <div
          id="ben-card-pending"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'SUBMITTED' && !additionStatusFilter) {
              setStatusFilter('');
            } else {
              setStatusFilter('SUBMITTED');
              setAdditionStatusFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'SUBMITTED' && !additionStatusFilter) {
                setStatusFilter('');
              } else {
                setStatusFilter('SUBMITTED');
                setAdditionStatusFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'SUBMITTED' || statusFilter === 'UNDER_REVIEW' || statusFilter === 'HOLD'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Pending / Under Review beneficiaries"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Pending / On Hold</span>
            {statusFilter === 'SUBMITTED' || statusFilter === 'UNDER_REVIEW' || statusFilter === 'HOLD' ? (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Action req.</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-700">{summary.pendingReviewCount}</span>
            <span className="text-[10px] text-amber-600 font-medium">In Review</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'SUBMITTED' || statusFilter === 'UNDER_REVIEW' || statusFilter === 'HOLD' ? 'Filtering: Pending (Click to reset)' : 'Click to filter pending'}
          </span>
        </div>

        {/* Card 5: Rejected / Not Approved */}
        <div
          id="ben-card-rejected"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'NOT_APPROVED' || statusFilter === 'REJECTED') {
              setStatusFilter('');
            } else {
              setStatusFilter('NOT_APPROVED');
              setAdditionStatusFilter('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'NOT_APPROVED' || statusFilter === 'REJECTED') {
                setStatusFilter('');
              } else {
                setStatusFilter('NOT_APPROVED');
                setAdditionStatusFilter('');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'NOT_APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'CANCELLED'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Rejected / Not Approved beneficiaries"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Not Approved / Rejected</span>
            {statusFilter === 'NOT_APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'CANCELLED' ? (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Declined</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-700">{summary.rejectedCount}</span>
            <span className="text-[10px] text-rose-600 font-medium">Flagged</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'NOT_APPROVED' || statusFilter === 'REJECTED' ? 'Filtering: Rejected (Click to reset)' : 'Click to filter rejected'}
          </span>
        </div>
      </div>

      {/* Active Filter Banner */}
      {(Boolean(statusFilter) || Boolean(additionStatusFilter)) && (
        <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Card Filter Active:{' '}
              <strong className="font-semibold">
                {statusFilter ? `${statusFilter} Approval Status` : ''}
                {statusFilter && additionStatusFilter ? ' • ' : ''}
                {additionStatusFilter ? `${additionStatusFilter} Bank Portal Status` : ''}
              </strong>{' '}
              ({totalItems} matching beneficiaries found)
            </span>
          </div>
          <button
            onClick={() => {
              setStatusFilter('');
              setAdditionStatusFilter('');
            }}
            className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer text-[11px]"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Sheet No, Beneficiary, Account, IFSC, Bank..."
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
          <option value="HOLD">On Hold</option>
          <option value="NOT_APPROVED">Not Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={additionStatusFilter}
          onChange={(e) => setAdditionStatusFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Bank Addition Statuses</option>
          <option value="NOT_STARTED">Not Started / Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Added (Done)</option>
          <option value="HOLD">On Hold</option>
          <option value="NOT_APPROVED">Not Approved</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Beneficiaries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="nameOfBeneficiary" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Account Number" sortKey="accountNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="IFSC Code" sortKey="ifscCode" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Bank Name" sortKey="bankName" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3">Cheque Doc</th>
                <th className="px-4 py-3"><SortHeader label="Approval Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Bank Addition" sortKey="additionStatus" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Loading beneficiaries...
                  </td>
                </tr>
              ) : beneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No beneficiary records match criteria.
                  </td>
                </tr>
              ) : (
                beneficiaries.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => viewDetails(b)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-900 whitespace-nowrap">
                      {b.sheetNo}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {b.nameOfBeneficiary}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {b.accountNo}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {b.ifscCode}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{b.bankName}</td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {b.cancelledChequeUrl ? (
                        <button
                          onClick={() =>
                            setViewerData({
                              url: b.cancelledChequeUrl!,
                              title: `Cheque Proof: ${b.nameOfBeneficiary}`,
                              vendorName: b.nameOfBeneficiary,
                              sheetNo: b.sheetNo,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 transition-colors shadow-2xs"
                          title="Open Cancelled Cheque in Secure Viewer"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>View Doc</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={b.status} type="approval" size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={b.additionStatus} type="addition" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetails(b);
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

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="py-1 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries · Showing {beneficiaries.length} of {totalItems} beneficiaries</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  <StatusBadge status={selectedRecord.additionStatus} type="addition" size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Beneficiary: <strong>{selectedRecord.nameOfBeneficiary}</strong> · Dept: {selectedRecord.department}
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
              {/* Requester Immutability Banner */}
              {currentUser?.role === 'EMPLOYEE_REQUESTER' && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Immutable Record Policy:</span> Account and IFSC details cannot be modified after submission. To prevent fraud, corrections require cancellation and re-submission.
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Account Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{selectedRecord.accountNo}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{selectedRecord.ifscCode}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Bank Name</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{selectedRecord.bankName}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Cancelled Cheque Proof</span>
                  {selectedRecord.cancelledChequeUrl ? (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setViewerData({
                            url: selectedRecord.cancelledChequeUrl!,
                            title: `Cancelled Cheque / Bank Proof: ${selectedRecord.nameOfBeneficiary}`,
                            vendorName: selectedRecord.nameOfBeneficiary,
                            sheetNo: selectedRecord.sheetNo,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Open in Viewer</span>
                      </button>
                      <a
                        href={selectedRecord.cancelledChequeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium text-xs px-2 py-1 rounded-md border border-slate-200 bg-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Direct Tab</span>
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
                  <span className="text-slate-400 font-medium block">Purpose of Addition</span>
                  <p className="text-slate-800 font-medium mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {selectedRecord.purpose}
                  </p>
                </div>
                {selectedRecord.remark && (
                  <div>
                    <span className="text-slate-400 font-medium block">Submission Remarks</span>
                    <p className="text-slate-600 mt-0.5 p-2 rounded-lg bg-slate-50">{selectedRecord.remark}</p>
                  </div>
                )}
                {selectedRecord.entryReferenceNumber && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-semibold block">Bank Beneficiary ID / UTR Ref</span>
                    <span className="font-mono text-sm font-bold text-emerald-900 mt-0.5 block">
                      {selectedRecord.entryReferenceNumber}
                    </span>
                    {selectedRecord.entryRemarks && (
                      <p className="text-xs text-emerald-800 mt-1">{selectedRecord.entryRemarks}</p>
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
                  Beneficiary Approval & Bank Registration Timeline
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
                {selectedRecord.status === 'SUBMITTED' && hasPermission('BENEFICIARY_REVIEW') && (
                  <button
                    onClick={() => setActionType('REVIEW')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                  >
                    Mark Under Review
                  </button>
                )}

                {/* Reject action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('BENEFICIARY_REJECT') && (
                  <button
                    onClick={() => setActionType('REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Reject
                  </button>
                )}

                {/* Approve action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('BENEFICIARY_APPROVE') && (
                  <button
                    onClick={() => setActionType('APPROVE')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Approve Beneficiary
                  </button>
                )}

                {/* Start bank entry action (Bank Operator / Approver) */}
                {selectedRecord.status === 'APPROVED' &&
                  selectedRecord.additionStatus === 'NOT_STARTED' &&
                  hasPermission('BENEFICIARY_START_ENTRY') && (
                    <button
                      onClick={() => setActionType('START_ENTRY')}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      Start Bank Entry
                    </button>
                  )}

                {/* Complete entry action */}
                {selectedRecord.status === 'APPROVED' &&
                  selectedRecord.additionStatus === 'IN_PROGRESS' &&
                  hasPermission('BENEFICIARY_COMPLETE_ENTRY') && (
                    <>
                      <button
                        onClick={() => setActionType('MARK_FAILED')}
                        className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold"
                      >
                        Mark Failed
                      </button>
                      <button
                        onClick={() => setActionType('COMPLETE_ENTRY')}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Complete Bank Registration
                      </button>
                    </>
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

            {actionType === 'COMPLETE_ENTRY' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Beneficiary Reference / Registration ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BEN-HDFC-884912"
                  value={actionReference}
                  onChange={(e) => setActionReference(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {['REJECT', 'CANCEL', 'MARK_FAILED'].includes(actionType) ? 'Mandatory Reason *' : 'Operational Remarks'}
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

      {/* New Beneficiary Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">New Beneficiary Onboarding Request</h3>
                <p className="text-xs text-slate-500">Atomic number BPL/BEN/YYYYMMDD/NN generated on submission.</p>
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
                  Name of Beneficiary (as in Bank Records) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Fuel Station Pvt Ltd"
                  value={formData.nameOfBeneficiary}
                  onChange={(e) => setFormData({ ...formData, nameOfBeneficiary: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="9 to 18 digits"
                    value={formData.accountNo}
                    onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0004283"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono uppercase focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Name & Branch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India, Raipur Main Branch"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Cancelled Cheque Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cancelled Cheque / Bank Letter (Mandatory) <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="cheque-file-upload"
                  />
                  <label htmlFor="cheque-file-upload" className="cursor-pointer block">
                    <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 block">
                      {uploadedFileName || 'Click to select or drag Cancelled Cheque (PDF, JPG, PNG)'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Maximum file size: 10 MB</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purpose of Beneficiary Addition <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular heavy equipment diesel supplier for Siladehi plant"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
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
                  <span>{formSubmitting ? 'Submitting...' : 'Submit Beneficiary'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Secure Attachment Viewer */}
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
