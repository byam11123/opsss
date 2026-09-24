import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
// OpsFlow 360 – IT Maintenance Checklist Module
// Connects to live Google Sheet: 1NBjkQKe2IOPVJB_LdfPN6c0CotH850DemssPDjZohDo

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { ITChecklistTask, ITDoer, ITChecklistSummary, ITTaskStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  Building,
  Laptop,
  Camera,
  Network,
  Printer,
  PhoneCall,
  UserCheck,
  Check,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export const ITChecklistView: React.FC = () => {
  const [tasks, setTasks] = useState<ITChecklistTask[]>([]);
  const [summary, setSummary] = useState<ITChecklistSummary | null>(null);
  const [doers, setDoers] = useState<ITDoer[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: sortedItems, requestSort, sortConfig } = useSortableData(tasks);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Pagination & Filters state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedDoer, setSelectedDoer] = useState<string>('ALL');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Completion modal state
  const [completingTask, setCompletingTask] = useState<ITChecklistTask | null>(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completionDate, setCompletionDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Task Details Modal
  const [viewingTask, setViewingTask] = useState<ITChecklistTask | null>(null);

  // Fetch Summary and Doers
  const loadMeta = async () => {
    try {
      const [sumRes, doersRes] = await Promise.all([
        api.getITChecklistSummary(),
        api.getITDoers(),
      ]);
      setSummary(sumRes);
      setDoers(doersRes);
    } catch (err) {
      console.error('Failed to load IT checklist summary/doers:', err);
    }
  };

  // Fetch Tasks with current filters
  const loadTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      };
      if (search && search.trim()) params.search = search.trim();
      if (selectedDoer && selectedDoer !== 'ALL') params.doerName = selectedDoer;
      if (selectedSite && selectedSite !== 'ALL') params.site = selectedSite;
      if (selectedFrequency && selectedFrequency !== 'ALL') params.frequency = selectedFrequency;
      if (selectedEquipment && selectedEquipment !== 'ALL') params.equipmentType = selectedEquipment;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await api.listITTasks(params);

      setTasks(res.items || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.totalItems);
      }
    } catch (err) {
      console.error('Failed to load IT checklist tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedDoer, selectedSite, selectedFrequency, selectedEquipment, selectedStatus]);

  useEffect(() => {
    loadTasks();
  }, [page, search, selectedDoer, selectedSite, selectedFrequency, selectedEquipment, selectedStatus]);

  // Handle Sync from Google Sheets
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncITChecklist();
      setSyncMessage(res.message || 'Synchronized with Google Sheets');
      await Promise.all([loadMeta(), loadTasks()]);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err?.message || 'Error'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Handle Mark Done submit
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    setSubmittingCompletion(true);
    try {
      await api.completeITTask(completingTask.taskId, {
        remarks: completionRemarks,
        actualDate: completionDate,
      });
      setCompletingTask(null);
      setCompletionRemarks('');
      await Promise.all([loadMeta(), loadTasks()]);
    } catch (err: any) {
      alert(`Error completing task: ${err?.message || 'Failed'}`);
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Export filtered tasks as CSV
  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    const headers = [
      'Task ID',
      'Doer Name',
      'Department',
      'Site',
      'Equipment Type',
      'Frequency',
      'Task Description',
      'Planned Date',
      'Actual Date',
      'Status',
      'Email',
    ];

    const rows = tasks.map((t) => [
      `"${t.taskId}"`,
      `"${t.doerName}"`,
      `"${t.department}"`,
      `"${t.site}"`,
      `"${t.equipmentType}"`,
      `"${t.frequency === 'W' ? 'Weekly' : 'Monthly'}"`,
      `"${t.task.replace(/"/g, '""')}"`,
      `"${t.plannedDate}"`,
      `"${t.actualDate || ''}"`,
      `"${t.status}"`,
      `"${t.doerEmail || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IT_Checklist_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Equipment icon helper
  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'Computer / Laptop':
        return <Laptop className="h-4 w-4 text-blue-600" />;
      case 'CCTV Camera':
        return <Camera className="h-4 w-4 text-purple-600" />;
      case 'Switch / Modem':
        return <Network className="h-4 w-4 text-indigo-600" />;
      case 'Printer & Cartridge':
        return <Printer className="h-4 w-4 text-emerald-600" />;
      case 'Intercom Equipment':
        return <PhoneCall className="h-4 w-4 text-amber-600" />;
      default:
        return <Laptop className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: ITTaskStatus) => {
    switch (status) {
      case 'Done':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="h-3 w-3" /> Done
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IT Maintenance Checklist</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              52-Week Schedule Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of hardware maintenance, network switches, CCTVs, printers & computer assets across
            sites. Connected directly to Google Sheet ID: <span className="font-mono text-slate-700">1NBjkQKe2IOPVJB...</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Sheet...' : 'Sync with Google Sheet'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-indigo-600 hover:text-indigo-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Interactive Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Tasks */}
          <div
            onClick={() => {
              setSelectedStatus('ALL');
              setSelectedFrequency('ALL');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedStatus === 'ALL' && selectedFrequency === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className={`text-xs font-medium ${selectedStatus === 'ALL' && selectedFrequency === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Tasks
            </span>
            <div className={`text-2xl font-bold mt-1 ${selectedStatus === 'ALL' && selectedFrequency === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {summary.totalTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedStatus === 'ALL' && selectedFrequency === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
              52 Weeks Maintenance
            </p>
          </div>

          {/* Completed */}
          <div
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Done' ? 'ALL' : 'Done');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedStatus === 'Done'
                ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${selectedStatus === 'Done' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Completed
              </span>
              <CheckCircle2 className={`h-4 w-4 ${selectedStatus === 'Done' ? 'text-white' : 'text-emerald-600'}`} />
            </div>
            <div className={`text-2xl font-bold mt-1 ${selectedStatus === 'Done' ? 'text-white' : 'text-emerald-600'}`}>
              {summary.completedTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedStatus === 'Done' ? 'text-emerald-200' : 'text-slate-500'}`}>
              {summary.overallComplianceRate}% Compliance
            </p>
          </div>

          {/* Overdue */}
          <div
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Overdue' ? 'ALL' : 'Overdue');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedStatus === 'Overdue'
                ? 'bg-red-700 text-white border-red-700 ring-2 ring-red-500/20'
                : 'bg-white border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${selectedStatus === 'Overdue' ? 'text-red-100' : 'text-slate-500'}`}>
                Overdue
              </span>
              <AlertTriangle className={`h-4 w-4 ${selectedStatus === 'Overdue' ? 'text-white' : 'text-red-600'}`} />
            </div>
            <div className={`text-2xl font-bold mt-1 ${selectedStatus === 'Overdue' ? 'text-white' : 'text-red-600'}`}>
              {summary.overdueTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedStatus === 'Overdue' ? 'text-red-200' : 'text-slate-500'}`}>
              {summary.overdueTasks === 0 ? 'All up to date' : 'Needs attention'}
            </p>
          </div>

          {/* Pending */}
          <div
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Pending' ? 'ALL' : 'Pending');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedStatus === 'Pending'
                ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${selectedStatus === 'Pending' ? 'text-amber-100' : 'text-slate-500'}`}>
                Pending
              </span>
              <Clock className={`h-4 w-4 ${selectedStatus === 'Pending' ? 'text-white' : 'text-amber-600'}`} />
            </div>
            <div className={`text-2xl font-bold mt-1 ${selectedStatus === 'Pending' ? 'text-white' : 'text-amber-600'}`}>
              {summary.pendingTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedStatus === 'Pending' ? 'text-amber-200' : 'text-slate-500'}`}>
              Scheduled in cycle
            </p>
          </div>

          {/* Weekly Tasks */}
          <div
            onClick={() => {
              setSelectedFrequency(selectedFrequency === 'W' ? 'ALL' : 'W');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedFrequency === 'W'
                ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <span className={`text-xs font-medium ${selectedFrequency === 'W' ? 'text-indigo-100' : 'text-slate-500'}`}>
              Weekly Tasks
            </span>
            <div className={`text-2xl font-bold mt-1 ${selectedFrequency === 'W' ? 'text-white' : 'text-slate-900'}`}>
              {summary.weeklyTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedFrequency === 'W' ? 'text-indigo-200' : 'text-slate-500'}`}>
              High frequency
            </p>
          </div>

          {/* Monthly Tasks */}
          <div
            onClick={() => {
              setSelectedFrequency(selectedFrequency === 'M' ? 'ALL' : 'M');
              setPage(1);
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedFrequency === 'M'
                ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <span className={`text-xs font-medium ${selectedFrequency === 'M' ? 'text-indigo-100' : 'text-slate-500'}`}>
              Monthly Tasks
            </span>
            <div className={`text-2xl font-bold mt-1 ${selectedFrequency === 'M' ? 'text-white' : 'text-slate-900'}`}>
              {summary.monthlyTasks}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedFrequency === 'M' ? 'text-indigo-200' : 'text-slate-500'}`}>
              Cycle maintenance
            </p>
          </div>
        </div>
      )}

      {/* Doer Performance Matrix */}
      {doers && doers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                IT Engineers & Doers Performance
              </h2>
              <p className="text-xs text-slate-500">
                Click any assignee to instantly filter their workload and compliance
              </p>
            </div>
            {selectedDoer !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDoer('ALL');
                  setPage(1);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Clear Doer Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {doers.map((d) => (
              <div
                key={d.name}
                onClick={() => {
                  setSelectedDoer(selectedDoer === d.name ? 'ALL' : d.name);
                  setPage(1);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedDoer === d.name
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900 truncate" title={d.name}>
                    {d.name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {d.complianceRate}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1 truncate" title={d.department || 'IT'}>
                  {d.department || 'IT & Maintenance'}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, d.complianceRate)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
                  <span>Assigned: {d.totalAssigned}</span>
                  <span className="text-emerald-700 font-medium">Done: {d.completed}</span>
                  <span className="text-red-600 font-medium">Due: {d.overdue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search task, equipment, ID or doer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Site Filter */}
          <div>
            <select
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Sites</option>
              <option value="Raipur Office">Raipur Office</option>
              <option value="CSR / Siladehi">CSR / Siladehi</option>
              <option value="Bijetala Site">Bijetala Site</option>
              <option value="Siladehi Site">Siladehi Site</option>
            </select>
          </div>

          {/* Equipment Category Filter */}
          <div>
            <select
              value={selectedEquipment}
              onChange={(e) => {
                setSelectedEquipment(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Equipment</option>
              <option value="Computer / Laptop">Computer / Laptop</option>
              <option value="CCTV Camera">CCTV Camera</option>
              <option value="Switch / Modem">Switch / Modem</option>
              <option value="Printer & Cartridge">Printer & Cartridge</option>
              <option value="Intercom Equipment">Intercom Equipment</option>
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <select
              value={selectedFrequency}
              onChange={(e) => {
                setSelectedFrequency(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Frequencies</option>
              <option value="W">Weekly (W)</option>
              <option value="M">Monthly (M)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Overdue">Overdue</option>
              <option value="Pending">Pending</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <span className="font-semibold text-slate-800">{totalItems}</span> maintenance tasks
            {selectedDoer !== 'ALL' && <span> · Doer: <strong>{selectedDoer}</strong></span>}
            {selectedSite !== 'ALL' && <span> · Site: <strong>{selectedSite}</strong></span>}
            {selectedEquipment !== 'ALL' && <span> · Equipment: <strong>{selectedEquipment}</strong></span>}
            {selectedStatus !== 'ALL' && <span> · Status: <strong>{selectedStatus}</strong></span>}
          </div>

          {(selectedDoer !== 'ALL' ||
            selectedSite !== 'ALL' ||
            selectedEquipment !== 'ALL' ||
            selectedFrequency !== 'ALL' ||
            selectedStatus !== 'ALL' ||
            search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDoer('ALL');
                setSelectedSite('ALL');
                setSelectedEquipment('ALL');
                setSelectedFrequency('ALL');
                setSelectedStatus('ALL');
                setSearch('');
                setPage(1);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tasks Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading IT Checklist records...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-slate-500 max-w-md mx-auto px-4">
            {selectedStatus === 'Overdue' && (!summary || summary.overdueTasks === 0) ? (
              <div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-semibold text-base text-slate-800">Zero Overdue Tasks</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All maintenance tasks scheduled up to today have been completed on time. Upcoming cycles remain scheduled under Pending.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('Pending');
                      setPage(1);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                  >
                    View Pending Tasks ({summary?.pendingTasks || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('Done');
                      setPage(1);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                  >
                    View Completed ({summary?.completedTasks || 0})
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="font-medium text-sm text-slate-700">No maintenance tasks match the selected criteria</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try broadening your search or resetting your active filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoer('ALL');
                    setSelectedSite('ALL');
                    setSelectedEquipment('ALL');
                    setSelectedFrequency('ALL');
                    setSelectedStatus('ALL');
                    setSearch('');
                    setPage(1);
                  }}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4"><SortHeader label="Task ID" sortKey="taskId" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Equipment & Category" sortKey="equipmentType" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Maintenance Action" sortKey="task" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Site Location" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Freq" sortKey="frequency" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Doer / Assignee" sortKey="doerName" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Planned" sortKey="plannedDate" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedItems.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Task ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      #{task.taskId}
                    </td>

                    {/* Equipment Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {getEquipmentIcon(task.equipmentType)}
                        <span className="font-medium text-slate-800 whitespace-nowrap">{task.equipmentType}</span>
                      </div>
                    </td>

                    {/* Task Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div
                        onClick={() => setViewingTask(task)}
                        className="font-medium text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                        title={task.task}
                      >
                        {task.task}
                      </div>
                    </td>

                    {/* Site */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        <Building className="h-3 w-3 text-slate-400" />
                        {task.site}
                      </span>
                    </td>

                    {/* Frequency */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          task.frequency === 'W'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {task.frequency === 'W' ? 'Weekly' : 'Monthly'}
                      </span>
                    </td>

                    {/* Doer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{task.doerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{task.department}</div>
                    </td>

                    {/* Planned Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                      {task.plannedDate}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(task.status)}
                      {task.actualDate && (
                        <div className="text-[10px] text-emerald-600 mt-0.5 font-mono">
                          Done: {task.actualDate}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="View Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>

                        {task.status !== 'Done' ? (
                          <button
                            type="button"
                            onClick={() => setCompletingTask(task)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-2xs"
                          >
                            <Check className="h-3 w-3" /> Mark Done
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold px-2 py-1">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span> ({totalItems} records)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Complete Maintenance Task</h3>
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-mono">Task ID: #{completingTask.taskId}</span>
                <span className="font-semibold text-slate-700">{completingTask.equipmentType}</span>
              </div>
              <p className="font-medium text-slate-900 text-sm mt-1">{completingTask.task}</p>
              <p className="text-slate-500 mt-1">
                Site: <strong>{completingTask.site}</strong> · Assignee: <strong>{completingTask.doerName}</strong>
              </p>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date of Completion (DD/MM/YYYY)</label>
                <input
                  type="text"
                  required
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                  placeholder="24/06/2026"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks / Maintenance Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                  placeholder="Checked connections, updated firmware, cleaned heat sinks..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCompletion}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {submittingCompletion ? 'Recording...' : 'Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Task Details #{viewingTask.taskId}</h3>
                {getStatusBadge(viewingTask.status)}
              </div>
              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Action Item</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{viewingTask.task}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Equipment Type</span>
                  <div className="flex items-center gap-1.5 mt-1 font-medium text-slate-900">
                    {getEquipmentIcon(viewingTask.equipmentType)}
                    <span>{viewingTask.equipmentType}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Site Location</span>
                  <p className="font-medium text-slate-900 mt-1">{viewingTask.site}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Department</span>
                  <p className="font-medium text-slate-900 mt-1">{viewingTask.department}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Frequency</span>
                  <p className="font-medium text-slate-900 mt-1">
                    {viewingTask.frequency === 'W' ? 'Weekly Routine' : 'Monthly Maintenance'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Planned Date</span>
                  <p className="font-mono font-medium text-slate-900 mt-1">{viewingTask.plannedDate}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Actual Completion Date</span>
                  <p className="font-mono font-medium text-emerald-700 mt-1">
                    {viewingTask.actualDate || 'Not Completed'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Assignee & Escalations</span>
                <p className="font-semibold text-slate-900 mt-1">{viewingTask.doerName}</p>
                <div className="text-slate-600 mt-0.5 space-y-0.5">
                  <p>Primary: {viewingTask.doerEmail || viewingTask.email || 'N/A'}</p>
                  {viewingTask.buddyEmail && <p>Buddy / Supervisor: {viewingTask.buddyEmail}</p>}
                </div>
              </div>

              {viewingTask.remarks && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Completion Notes</span>
                  <p className="text-slate-800 mt-1">{viewingTask.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
              {viewingTask.status !== 'Done' ? (
                <button
                  type="button"
                  onClick={() => {
                    const t = viewingTask;
                    setViewingTask(null);
                    setCompletingTask(t);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Check className="h-4 w-4" />
                  Mark Done Now
                </button>
              ) : (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Task Completed
                </span>
              )}

              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
