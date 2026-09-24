import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
// OpsFlow 360 – Interbank Transfer Workflow & Management View

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { InterbankTransfer, PaymentStatusHistory } from '../../types';
import { StatusBadge } from './common/StatusBadge';
import {
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  Calendar,
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
  Download,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface InterbankViewProps {
  initialCreateOpen?: boolean;
}

export const InterbankView: React.FC<InterbankViewProps> = ({ initialCreateOpen = false }) => {
  const { currentUser, hasPermission, hasRole } = useAuth();

  const [transfers, setTransfers] = useState<InterbankTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: sortedItems, requestSort, sortConfig } = useSortableData(transfers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [serverSummary, setServerSummary] = useState<{
    totalCount: number;
    totalAmount: number;
    approvedCount: number;
    approvedAmount: number;
    pendingCount: number;
    pendingAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
  } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(initialCreateOpen);
  const [selectedRecord, setSelectedRecord] = useState<InterbankTransfer | null>(null);
  const [historyList, setHistoryList] = useState<PaymentStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action Dialogs
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionReference, setActionReference] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    transferFrom: 'HDFC Bank - 50200012345678 (Raipur Primary)',
    transferTo: 'SBI - 38472910482 (Siladehi Escrow)',
    purpose: '',
    amount: '',
    site: currentUser?.location || 'Siladehi Site',
    department: currentUser?.department || 'Administration',
    priority: 'NORMAL' as const,
    remarks: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, ibSummary] = await Promise.all([
        api.listInterbankTransfers({
          search: searchTerm,
          status: statusFilter,
          site: siteFilter,
          priority: priorityFilter,
          page,
          pageSize,
        }),
        api.getInterbankSummary().catch(() => null),
      ]);
      setTransfers(res.items || []);
      setTotalItems(res.pagination?.totalItems || (res.items || []).length);
      if ((res as any).summary) {
        setServerSummary((res as any).summary);
      } else if (ibSummary) {
        setServerSummary(ibSummary);
      }
    } catch (err) {
      console.error('Failed to load interbank transfers', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, siteFilter, priorityFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, siteFilter, priorityFilter]);

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

  // Dynamic sites extracted from records
  const uniqueSites = useMemo(() => {
    const set = new Set<string>(['Raipur Office', 'Siladehi Site', 'Bilaspur Depot', 'Bijetala Site', 'Raipur Workshop']);
    transfers.forEach(t => {
      if (t.site) set.add(t.site);
    });
    return Array.from(set);
  }, [transfers]);

  // Summary Metrics from live sheets dataset
  const summary = useMemo(() => {
    const totalCount = serverSummary?.totalCount ?? totalItems ?? transfers.length;
    const totalAmt = serverSummary?.totalAmount ?? transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const approvedCount = serverSummary?.approvedCount ?? transfers.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED').length;
    const approvedAmt = serverSummary?.approvedAmount ?? transfers.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingCount = serverSummary?.pendingCount ?? transfers.filter(t => ['SUBMITTED', 'UNDER_REVIEW', 'HOLD'].includes(t.status)).length;
    const pendingAmt = serverSummary?.pendingAmount ?? transfers.filter(t => ['SUBMITTED', 'UNDER_REVIEW', 'HOLD'].includes(t.status)).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const rejectedCount = serverSummary?.rejectedCount ?? transfers.filter(t => ['REJECTED', 'CANCELLED'].includes(t.status)).length;
    const rejectedAmt = serverSummary?.rejectedAmount ?? transfers.filter(t => ['REJECTED', 'CANCELLED'].includes(t.status)).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      totalCount,
      totalAmt,
      approvedCount,
      approvedAmt,
      pendingCount,
      pendingAmt,
      rejectedCount,
      rejectedAmt,
    };
  }, [serverSummary, transfers, totalItems]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Load history when a record is selected
  const viewDetails = async (record: InterbankTransfer) => {
    setSelectedRecord(record);
    setHistoryLoading(true);
    try {
      const h = await api.getInterbankHistory(record.id);
      setHistoryList(h);
    } catch (err) {
      console.error('Failed to load record history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.transferFrom || !formData.transferTo) {
      setFormError('Please select both source and destination accounts.');
      return;
    }
    if (formData.transferFrom.trim().toLowerCase() === formData.transferTo.trim().toLowerCase()) {
      setFormError('Transfer From and Transfer To accounts cannot be identical.');
      return;
    }
    if (!formData.purpose.trim()) {
      setFormError('Purpose of transfer is mandatory.');
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a valid positive number.');
      return;
    }

    setFormSubmitting(true);
    try {
      const created = await api.createInterbankTransfer({
        ...formData,
        amount: numAmount,
      });
      setShowCreateModal(false);
      setFormData({
        transferFrom: 'HDFC Bank - 50200012345678 (Raipur Primary)',
        transferTo: 'SBI - 38472910482 (Siladehi Escrow)',
        purpose: '',
        amount: '',
        site: currentUser?.location || 'Siladehi Site',
        department: currentUser?.department || 'Administration',
        priority: 'NORMAL',
        remarks: '',
      });
      await loadData();
      viewDetails(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit interbank transfer');
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
    if (actionType === 'COMPLETE' && !actionReference.trim()) {
      setActionError('Payment reference number (UTR) is required to complete transfer.');
      return;
    }

    setSubmittingAction(true);
    try {
      let updated: InterbankTransfer;
      if (actionType === 'REVIEW') {
        updated = await api.reviewInterbankTransfer(selectedRecord.id, actionRemarks);
      } else if (actionType === 'APPROVE') {
        updated = await api.approveInterbankTransfer(selectedRecord.id, actionRemarks);
      } else if (actionType === 'REJECT') {
        updated = await api.rejectInterbankTransfer(selectedRecord.id, actionRemarks);
      } else if (actionType === 'CANCEL') {
        updated = await api.cancelInterbankTransfer(selectedRecord.id, actionRemarks);
      } else if (actionType === 'START_PROCESSING') {
        updated = await api.startProcessingInterbankTransfer(selectedRecord.id, actionRemarks);
      } else if (actionType === 'COMPLETE') {
        updated = await api.completeInterbankTransfer(selectedRecord.id, actionReference, actionRemarks);
      } else {
        throw new Error('Unknown action');
      }

      setSelectedRecord(updated);
      setActionType(null);
      setActionRemarks('');
      setActionReference('');
      await loadData();
      const h = await api.getInterbankHistory(updated.id);
      setHistoryList(h);
    } catch (err: any) {
      setActionError(err.message || 'Failed to execute action');
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
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-950">Connected Google Sheet:</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Ops INTERBANK (IBT) Transfer Form (Responses)
              </span>
              <span className="text-[11px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                1VTHJhHcxAf-1ny_pNsWg9_-AZUiOuJtjZ4-8FphAD6o
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Live bi-directional synchronization active. Reading all internal account transfers and site funding records without modifying source columns.
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
            href="https://docs.google.com/spreadsheets/d/1VTHJhHcxAf-1ny_pNsWg9_-AZUiOuJtjZ4-8FphAD6o/edit"
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
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            Interbank Transfers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage internal treasury transfers, site fundings, and escrow settlements with atomic sequence generation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Interbank Transfer</span>
        </button>
      </div>

      {/* Summary KPI Cards - Clickable to Auto-Filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Transfers */}
        <div
          id="ib-card-all"
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStatusFilter('');
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            !statusFilter
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to view all transfers"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Total Transfers</span>
            {!statusFilter ? (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600">All</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{summary.totalCount}</span>
            <span className="text-[10px] font-medium text-slate-500">{formatCurrency(summary.totalAmt)}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {!statusFilter ? 'Currently showing all' : 'Click to show all transfers'}
          </span>
        </div>

        {/* Card 2: Approved & Completed */}
        <div
          id="ib-card-approved"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'APPROVED' || statusFilter === 'COMPLETED') {
              setStatusFilter('');
            } else {
              setStatusFilter('APPROVED');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'APPROVED' || statusFilter === 'COMPLETED') {
                setStatusFilter('');
              } else {
                setStatusFilter('APPROVED');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'APPROVED' || statusFilter === 'COMPLETED'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Approved & Completed transfers"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Approved & Completed</span>
            {statusFilter === 'APPROVED' || statusFilter === 'COMPLETED' ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-700">{summary.approvedCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">{formatCurrency(summary.approvedAmt)}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'APPROVED' || statusFilter === 'COMPLETED' ? 'Filtering: Approved (Click to reset)' : 'Click to filter approved'}
          </span>
        </div>

        {/* Card 3: Under Review / Pending */}
        <div
          id="ib-card-pending"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW') {
              setStatusFilter('');
            } else {
              setStatusFilter('SUBMITTED');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW') {
                setStatusFilter('');
              } else {
                setStatusFilter('SUBMITTED');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Pending / Under Review transfers"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Under Review / Pending</span>
            {statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW' ? (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Action req.</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-700">{summary.pendingCount}</span>
            <span className="text-[11px] font-semibold text-amber-600">{formatCurrency(summary.pendingAmt)}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'SUBMITTED' || statusFilter === 'PENDING' || statusFilter === 'UNDER_REVIEW' ? 'Filtering: Pending (Click to reset)' : 'Click to filter pending'}
          </span>
        </div>

        {/* Card 4: Rejected / Cancelled */}
        <div
          id="ib-card-rejected"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (statusFilter === 'REJECTED' || statusFilter === 'CANCELLED') {
              setStatusFilter('');
            } else {
              setStatusFilter('REJECTED');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (statusFilter === 'REJECTED' || statusFilter === 'CANCELLED') {
                setStatusFilter('');
              } else {
                setStatusFilter('REJECTED');
              }
            }
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none relative group ${
            statusFilter === 'REJECTED' || statusFilter === 'CANCELLED'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-500/50 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs hover:-translate-y-0.5'
          }`}
          title="Click to filter by Rejected / Cancelled transfers"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px] block">Rejected / Cancelled</span>
            {statusFilter === 'REJECTED' || statusFilter === 'CANCELLED' ? (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Filtered
              </span>
            ) : (
              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Declined</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-700">{summary.rejectedCount}</span>
            <span className="text-[11px] font-semibold text-rose-600">{formatCurrency(summary.rejectedAmt)}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {statusFilter === 'REJECTED' || statusFilter === 'CANCELLED' ? 'Filtering: Rejected (Click to reset)' : 'Click to filter rejected'}
          </span>
        </div>
      </div>

      {/* Active Filter Banner */}
      {Boolean(statusFilter) && (
        <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Card Filter Active: <strong className="font-semibold">{statusFilter} Transfers</strong> ({totalItems} matching records found)
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('')}
            className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer text-[11px]"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Sheet No, account, purpose, requester, site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="HOLD">On Hold</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Sites ({uniqueSites.length})</option>
          {uniqueSites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
        >
          <option value="">All Priorities</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Transfers Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Transfer From" sortKey="transferFrom" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Transfer To" sortKey="transferTo" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Site / Dept" sortKey="siteId" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Requested By" sortKey="requestedBy" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Priority" sortKey="priority" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Loading interbank records...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No interbank transfer records match the criteria.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => viewDetails(item)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-900 whitespace-nowrap">
                      {item.sheetNo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate font-medium text-slate-800" title={item.transferFrom}>
                      {item.transferFrom}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate font-medium text-slate-800" title={item.transferTo}>
                      {item.transferTo}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{item.site}</span>
                      <span className="block text-[10px] text-slate-400">{item.department}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.requestedBy}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={item.priority} type="priority" size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={item.status} type="approval" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetails(item);
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
            <span>entries · Showing {transfers.length} of {totalItems} transfers</span>
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

      {/* Details & Workflow Actions Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-base font-bold text-slate-900">
                    {selectedRecord.sheetNo}
                  </h3>
                  <StatusBadge status={selectedRecord.status} type="approval" size="sm" />
                  <StatusBadge status={selectedRecord.priority} type="priority" size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted by {selectedRecord.requestedBy} on {new Date(selectedRecord.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Requester Immutability Notice if Employee */}
              {currentUser?.role === 'EMPLOYEE_REQUESTER' && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Immutable Record Policy:</span> Submitted payment requests cannot be edited. You can track real-time approval progress below or cancel if required before processing.
                  </div>
                </div>
              )}

              {/* Transfer Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Transfer From Account</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{selectedRecord.transferFrom}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Transfer To Account</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{selectedRecord.transferTo}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Transfer Amount</span>
                  <span className="font-bold text-slate-900 text-lg mt-0.5 block">
                    {formatCurrency(selectedRecord.amount)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Location / Site</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{selectedRecord.site} ({selectedRecord.department})</span>
                </div>
              </div>

              {/* Purpose & Remarks */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Purpose of Transfer</span>
                  <p className="text-slate-800 font-medium mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {selectedRecord.purpose}
                  </p>
                </div>
                {selectedRecord.remarks && (
                  <div>
                    <span className="text-slate-400 font-medium block">Submission Remarks</span>
                    <p className="text-slate-600 mt-0.5 p-2 rounded-lg bg-slate-50">{selectedRecord.remarks}</p>
                  </div>
                )}
                {selectedRecord.paymentReferenceNumber && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-semibold block">Bank UTR / Reference Number</span>
                    <span className="font-mono text-sm font-bold text-emerald-900 mt-0.5 block">
                      {selectedRecord.paymentReferenceNumber}
                    </span>
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

              {/* Status History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-indigo-600" />
                  Immutable Status Timeline
                </h4>
                {historyLoading ? (
                  <p className="text-xs text-slate-400">Loading timeline...</p>
                ) : historyList.length === 0 ? (
                  <p className="text-xs text-slate-400">No status transitions recorded yet.</p>
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

            {/* Modal Footer: Role-Gated Workflow Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-400 font-mono">
                v{selectedRecord.recordVersion} · ID: {selectedRecord.id}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Cancel action (Requester or Admin if not completed) */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) &&
                  (currentUser?.id === selectedRecord.requestedByUserId || currentUser?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => setActionType('CANCEL')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      Cancel Request
                    </button>
                  )}

                {/* Review action (Finance Approver / Admin) */}
                {selectedRecord.status === 'SUBMITTED' && hasPermission('INTERBANK_REVIEW') && (
                  <button
                    onClick={() => setActionType('REVIEW')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                  >
                    Mark Under Review
                  </button>
                )}

                {/* Reject action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('INTERBANK_REJECT') && (
                  <button
                    onClick={() => setActionType('REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Reject
                  </button>
                )}

                {/* Approve action */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedRecord.status) && hasPermission('INTERBANK_APPROVE') && (
                  <button
                    onClick={() => setActionType('APPROVE')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Approve Request
                  </button>
                )}

                {/* Start processing action (Bank Operator / Approver) */}
                {selectedRecord.status === 'APPROVED' && hasPermission('INTERBANK_START_PROCESSING') && (
                  <button
                    onClick={() => setActionType('START_PROCESSING')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    Start Processing
                  </button>
                )}

                {/* Complete action */}
                {['APPROVED', 'PROCESSING'].includes(selectedRecord.status) && hasPermission('INTERBANK_COMPLETE') && (
                  <button
                    onClick={() => setActionType('COMPLETE')}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Complete with UTR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Execution Prompt Modal (e.g. Reason / Remarks / UTR input) */}
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

            {actionType === 'COMPLETE' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Reference Number (UTR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC-9948201"
                  value={actionReference}
                  onChange={(e) => setActionReference(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {['REJECT', 'CANCEL'].includes(actionType) ? 'Mandatory Reason *' : 'Operational Remarks'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  ['REJECT', 'CANCEL'].includes(actionType)
                    ? 'State clear reason for this action...'
                    : 'Add notes for the audit trail...'
                }
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

      {/* New Interbank Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">New Interbank Transfer Request</h3>
                <p className="text-xs text-slate-500">Atomic number BPL/BANK/YYYYMMDD/NN generated on submit.</p>
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
                  Transfer From Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.transferFrom}
                  onChange={(e) => setFormData({ ...formData, transferFrom: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="HDFC Bank - 50200012345678 (Raipur Primary)">HDFC Bank - 50200012345678 (Raipur Primary)</option>
                  <option value="ICICI Bank - 001105023948 (Central Corporate)">ICICI Bank - 001105023948 (Central Corporate)</option>
                  <option value="Axis Bank - 918020038472910 (Operations Account)">Axis Bank - 918020038472910 (Operations Account)</option>
                  <option value="SBI - 38472910482 (Siladehi Escrow)">SBI - 38472910482 (Siladehi Escrow)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Transfer To Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.transferTo}
                  onChange={(e) => setFormData({ ...formData, transferTo: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="SBI - 38472910482 (Siladehi Escrow)">SBI - 38472910482 (Siladehi Escrow)</option>
                  <option value="Axis Bank - 918020038472910 (Operations Account)">Axis Bank - 918020038472910 (Operations Account)</option>
                  <option value="HDFC Bank - 50200012345678 (Raipur Primary)">HDFC Bank - 50200012345678 (Raipur Primary)</option>
                  <option value="ICICI Bank - 001105023948 (Central Corporate)">ICICI Bank - 001105023948 (Central Corporate)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Site</label>
                  <select
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                  >
                    <option value="Raipur Office">Raipur Office</option>
                    <option value="Siladehi Site">Siladehi Site</option>
                    <option value="Bilaspur Depot">Bilaspur Depot</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purpose of Transfer <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Funding Siladehi site operational cash & vendor payout"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Additional Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional context for financial approver..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
                  <span>{formSubmitting ? 'Submitting...' : 'Submit Transfer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
