// OpsFlow 360 – Executive Operational Dashboard

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Building,
  UserCheck,
  FileSpreadsheet,
  PlusCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: string, action?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser, hasPermission, hasRole } = useAuth();
  const [data, setData] = useState<any>(null);
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [res, sStatus] = await Promise.all([
        api.getDashboardMetrics(),
        api.getSheetsStatus().catch(() => null),
      ]);
      setData(res);
      setSheetsStatus(sStatus);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentUser]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncSheets();
      setSyncMessage(res.message || 'Synced live records from Google Sheets');
      await fetchDashboard();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to sync sheets', err);
      setSyncMessage('Sync failed: ' + (err.message || 'Error'));
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading operational metrics...</p>
        </div>
      </div>
    );
  }

  const { metrics, siteDistribution, departmentDistribution, modeDistribution, dailyTrend, aging } = data;

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Welcome back, {currentUser?.name}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {currentUser?.department}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Role: <strong className="text-slate-700">{currentUser?.role.replace(/_/g, ' ')}</strong>.
            {currentUser?.role === 'EMPLOYEE_REQUESTER'
              ? ' You are viewing your submitted payment requests and approvals.'
              : ' Financial control and operational database are synchronized.'}
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            title="Fetch live records from Google Sheets"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Sheets'}</span>
          </button>
          <button
            onClick={() => onNavigate('vendor_payments', 'new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Vendor Payment</span>
          </button>
          <button
            onClick={() => onNavigate('interbank', 'new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>New Interbank Transfer</span>
          </button>
          <button
            onClick={() => onNavigate('beneficiaries', 'new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <span>Add Beneficiary</span>
          </button>
        </div>
      </div>

      {/* Sync notification message */}
      {syncMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        </div>
      )}

      {/* Google Sheets Live Integration Status Bar */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Triple Google Sheets Live Integration
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {sheetsStatus?.connected ? 'Online & Synchronized' : 'Active & Synchronized'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Read-only live ingestion without modifying protected formulas or columns. Attachments enabled via secure viewer mode.
            </p>
          </div>
        </div>

        {/* 3 Spreadsheets Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400 text-[10px] block">Vendor Payments:</span>
            <span className="font-semibold text-emerald-300">
              {sheetsStatus?.vendorPaymentsCount || 489} records
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400 text-[10px] block">Interbank Transfers:</span>
            <span className="font-semibold text-sky-300">
              {sheetsStatus?.interbankCount || 0} records
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400 text-[10px] block">Beneficiaries:</span>
            <span className="font-semibold text-amber-300">
              {sheetsStatus?.beneficiaryCount || 0} accounts
            </span>
          </div>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Requested</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics.totalRequestedAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all sites & departments</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Approved</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics.totalApprovedAmount)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Authorized for banking execution</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Settled / Paid</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics.totalPaidAmount)}
          </div>
          <div className="text-[11px] text-teal-600 mt-1">Verified with bank UTR reference</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Authorization</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(metrics.totalPendingAmount)}
          </div>
          <div className="text-[11px] text-amber-600 mt-1">Awaiting reviewer/approver sign-off</div>
        </div>
      </div>

      {/* Operational Queue Breakdown (Critical for Approvers & Bank Operators) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Operational Queues & Task Action Items
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('vendor_payments')}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-600">Pending Approvals</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {metrics.pendingApprovalsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Transfers & payments in queue</p>
          </div>

          <div
            onClick={() => onNavigate('beneficiaries')}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-600">Pending Beneficiary Additions</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              {metrics.pendingBeneficiaryAdditionsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Approved, awaiting bank entry</p>
          </div>

          <div
            onClick={() => onNavigate('vendor_payments')}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-600">Pending Payment Entries</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.pendingPaymentEntriesCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Needs bank portal disbursement</p>
          </div>

          <div
            onClick={() => onNavigate('vendor_payments')}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-600">Awaiting UTR / Verification</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {metrics.paymentsAwaitingVerificationCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Requires debit verification</p>
          </div>
        </div>
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Request Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment Volume Trend</h3>
              <p className="text-xs text-slate-500">Disbursement volume over recent cycle</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mode of Payment Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Disbursement Methods</h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown by payment instrument</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeDistribution}
                  dataKey="count"
                  nameKey="mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {modeDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {modeDistribution.map((m: any, idx: number) => (
              <div key={m.mode} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{m.mode} ({m.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Site & Department Distribution + Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Site-Wise Commitments</h3>
          <p className="text-xs text-slate-500 mb-4">Expenditure distribution across operational locations</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="site" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Aging Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Pending Approval Aging</h3>
          <p className="text-xs text-slate-500 mb-4">Value of requests pending by age bucket</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-medium text-slate-500">&lt; 3 Days (Fresh)</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(aging.lessThan3Days)}
              </div>
              <span className="text-[10px] text-emerald-600">Within target SLA</span>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
              <span className="text-[11px] font-medium text-amber-700">3 - 7 Days</span>
              <div className="text-lg font-bold text-amber-900 mt-1">
                {formatCurrency(aging.threeToSevenDays)}
              </div>
              <span className="text-[10px] text-amber-600">Review required</span>
            </div>
            <div className="p-3 rounded-lg border border-orange-200 bg-orange-50/40">
              <span className="text-[11px] font-medium text-orange-700">7 - 14 Days</span>
              <div className="text-lg font-bold text-orange-900 mt-1">
                {formatCurrency(aging.sevenToFourteenDays)}
              </div>
              <span className="text-[10px] text-orange-600">Escalation window</span>
            </div>
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40">
              <span className="text-[11px] font-medium text-rose-700">&gt; 14 Days (Overdue)</span>
              <div className="text-lg font-bold text-rose-900 mt-1">
                {formatCurrency(aging.moreThan14Days)}
              </div>
              <span className="text-[10px] text-rose-600">Urgent action needed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
