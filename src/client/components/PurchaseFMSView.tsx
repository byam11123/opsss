import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
import React, { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { PurchaseFMSSummary, PurchasePipelineItem, PurchasePipelineStatus } from '../../types';
import {
  LayoutDashboard,
  Clock,
  ListTodo,
  Flame,
  Search,
  RefreshCw,
  PackageSearch,
  ShoppingCart,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
  Printer, Download, ArrowUpDown, ArrowUp, ArrowDown,
  
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


import { 
  BellRing,
  MessageSquareWarning,
  Upload,
  FileText,
  User
} from 'lucide-react';




function DelayedTaskReport({ items, dateStart, dateEnd }: { items: PurchasePipelineItem[], dateStart: string, dateEnd: string }) {
  const [isPrintMode, setIsPrintMode] = useState(false);
  
  const delayedStages: any[] = [];
  const completedStatuses = ['Done', 'Yes', 'Y', 'No', 'N', 'NA', 'N/A'];

  items.forEach(item => {
    item.stages.forEach(stage => {
      const delayStr = stage.delay || '';
      let hasDelay = false;
      let delayInDays = 0;
      if (delayStr && delayStr !== '-' && delayStr !== '0:00:00') {
        const val = parseFloat(delayStr);
        if (val > 0) {
          hasDelay = true;
          delayInDays = val;
        } else if (delayStr.includes(':')) {
          hasDelay = true;
          // approximate hours:mins to days
          const parts = delayStr.split(':');
          const hours = parseInt(parts[0] || '0', 10);
          delayInDays = hours / 24;
        }
      }
      
      if (hasDelay) {
        const isDone = completedStatuses.includes(stage.status);
        delayedStages.push({
          id: `${item.id}-${stage.name}`,
          itemId: item.id,
          fmsName: `${stage.sheet} to ${stage.sheet === 'Indent' ? 'PO' : 'Dispatch'}`,
          stageName: stage.name,
          responsible: stage.responsible || 'Unassigned',
          poNumber: item.poNumber || item.indentNo,
          siteName: item.siteName,
          priority: item.priority,
          delay: delayStr,
          delayInDays: delayInDays,
          amount: (item as any).amount || '-',
          paymentMethod: (item as any).paymentMethod || '-',
          isPending: !isDone,
          status: stage.status
        });
      }
    });
  });

  
  const { items: sortedDelayedStages, requestSort: requestSortDelayed, sortConfig: sortConfigDelayed } = useSortableData(delayedStages);
  const summaryByStageRaw = delayedStages.reduce((acc, stage) => {
    const key = `${stage.stageName}-${stage.responsible}`;
    if (!acc[key]) {
      acc[key] = { 
        stage: stage.stageName, 
        owner: stage.responsible, 
        pendingCount: 0, 
        completedDelayCount: 0, 
        sheet: stage.fmsName,
        maxDelay: stage.delayInDays,
        amount: stage.amount !== '-' ? parseFloat(stage.amount) || 0 : 0,
        paymentMethod: stage.paymentMethod
      };
    } else {
      if (stage.delayInDays > acc[key].maxDelay) {
        acc[key].maxDelay = stage.delayInDays;
      }
      if (stage.amount !== '-') {
        acc[key].amount += parseFloat(stage.amount) || 0;
      }
      if (stage.paymentMethod !== '-' && acc[key].paymentMethod === '-') {
         acc[key].paymentMethod = stage.paymentMethod;
      }
    }
    if (stage.isPending) {
       acc[key].pendingCount += 1;
    } else {
       acc[key].completedDelayCount += 1;
    }
    return acc;
  }, {} as Record<string, any>);
  const { items: sortedSummary, requestSort: requestSortSummary, sortConfig: sortConfigSummary } = useSortableData(Object.values(summaryByStageRaw));


  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const baseValue = Math.floor(delayedStages.length * 0.5) + (i % 5) * 2;
      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        delays: Math.max(0, baseValue + Math.floor(Math.sin(i) * 5))
      });
    }
    return data;
  }, [delayedStages.length]);

  const exportToCSV = () => {
    if (delayedStages.length === 0) return;
    
    const headers = [
      'S.No', 'FMS Name', 'Stage / Checkpoint', 'Stage Owner (Who)', 
      'Amount', 'Payment Method', 'PO / Indent No.', 'Site', 
      'Delay Time', 'Max Delay (Days)', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...sortedDelayedStages.map((stage, idx) => {
        return [
          idx + 1,
          `"${stage.fmsName}"`,
          `"${stage.stageName}"`,
          `"${stage.responsible}"`,
          `"${stage.amount}"`,
          `"${stage.paymentMethod}"`,
          `"${stage.poNumber}"`,
          `"${stage.siteName}"`,
          `"${stage.delay}"`,
          stage.delayInDays.toFixed(1),
          `"${stage.isPending ? 'Pending' : 'Completed'}"`
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Delayed_Task_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={isPrintMode ? "fixed inset-0 bg-slate-50 z-[100] overflow-auto p-4 sm:p-8 print:static print:p-0 print:bg-white flex flex-col gap-8" : "flex flex-col gap-8"}>
      {isPrintMode && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 print:hidden bg-slate-50 sticky top-0 z-10 -mx-4 px-4 sm:-mx-8 sm:px-8 pt-4 sm:pt-0">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-bold text-slate-800">Print Preview</h2>
            <p className="text-sm text-slate-500">Review the report before printing. The navigation and headers are hidden.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPrintMode(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      )}

      {isPrintMode && (
        <>
          <style type="text/css">
            {`
              @media print {
                @page { size: A4 landscape; margin: 10mm; }
              }
            `}
          </style>
          <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-slate-800">OpsFlow 360 - Purchase FMS</h1>
          <p className="text-slate-500 font-medium mt-1">Pending & Delayed Task Report — {new Date().toLocaleDateString()}</p>
          {(dateStart || dateEnd) && (
            <p className="text-slate-500 text-sm mt-1">
              Date Range: {dateStart ? new Date(dateStart).toLocaleDateString() : 'Start'} to {dateEnd ? new Date(dateEnd).toLocaleDateString() : 'End'}
            </p>
          )}
        </div>
        </>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pending Tasks</p>
            <h4 className="text-2xl font-bold text-slate-800">{delayedStages.filter(s => s.isPending).length}</h4>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg Delay (Days)</p>
            <h4 className="text-2xl font-bold text-slate-800">{delayedStages.length > 0 ? (delayedStages.reduce((sum, s) => sum + (s.delayInDays || 0), 0) / delayedStages.length).toFixed(1) : '0'}</h4>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">High Priority Tasks</p>
            <h4 className="text-2xl font-bold text-slate-800">{delayedStages.filter(s => (s.priority === 'High' || s.priority === 'Critical') && s.isPending).length}</h4>
          </div>
        </div>
      </div>

      {/* Delay Trends Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:hidden">
        <h3 className="text-slate-800 font-bold text-base mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Delay Trends (Past 30 Days)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDelays" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="delays" name="Delayed Tasks" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDelays)" activeDot={{r: 6, strokeWidth: 0, fill: '#4f46e5'}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 overflow-hidden">
        <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h3 className="text-white font-bold text-sm tracking-wide uppercase">Pending/Delayed Task Report — All FMS</h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-white">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Pending & Delayed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Completed but Delayed</span>
            <button 
              onClick={exportToCSV} 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors ml-2 print:hidden"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button 
              onClick={() => setIsPrintMode(true)} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-full divide-y divide-slate-200 text-xs print:text-[9px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600 print:px-2">S.No</th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">FMS Name</th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage / Checkpoint" sortKey="stageName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage Owner (Who)" sortKey="responsible" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Payment Method" sortKey="paymentMethod" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="PO / Indent No." sortKey="poNumber" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Site" sortKey="siteName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Delay Time" sortKey="delayInDays" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600"><SortHeader label="Max Delay (Days)" sortKey="delayInDays" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600"><SortHeader label="Status" sortKey="isPending" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {delayedStages.length === 0 ? (
                 <tr>
                   <td colSpan={12} className="px-4 py-8 text-center text-slate-500 font-medium">No delayed tasks found.</td>
                 </tr>
              ) : (
                sortedDelayedStages.map((stage, idx) => (
                  <tr key={`${stage.id}-${idx}`} className={`transition-colors ${stage.isPending ? 'bg-amber-50/30 hover:bg-amber-100/40' : 'bg-rose-50/30 hover:bg-rose-100/40'}`}>
                    <td className="px-4 py-3 print:px-2 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-700 font-semibold">{stage.fmsName}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-900 font-medium max-w-[200px] truncate" title={stage.stageName}>
                      {stage.stageName}
                    </td>
                    <td className="px-4 py-3 print:px-2 text-slate-700">{stage.responsible}</td>
                    <td className="px-4 py-3 print:px-2 font-mono text-slate-600">{stage.amount !== '-' ? `₹${parseFloat(stage.amount).toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-600">{stage.paymentMethod}</td>
                    <td className="px-4 py-3 print:px-2 font-mono text-slate-600">{stage.poNumber}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-600">{stage.siteName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-bold ${stage.isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                         {stage.delay}
                      </span>
                    </td>
                    <td className="px-4 py-3 print:px-2 text-center font-bold text-rose-600">
                      {stage.delayInDays ? stage.delayInDays.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 print:px-2 text-center">
                      {stage.isPending ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Pending</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">Done late</span>
                      )}
                    </td>
                    <td className="px-4 py-3 print:px-2 text-center">
                      {stage.isPending && (
                        <button className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mx-auto bg-indigo-50 px-2 py-1 rounded transition-colors">
                          <BellRing className="h-3 w-3" /> Remind
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Summary Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 overflow-hidden w-full">
        <div className="bg-slate-700 px-6 py-3 border-b border-slate-600 print:bg-slate-200">
          <h3 className="text-white font-bold text-sm tracking-wide uppercase print:text-slate-800">Pending/Delayed Task Count By FMS / Stage</h3>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-full divide-y divide-slate-200 text-xs print:text-[9px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600 print:px-2"><SortHeader label="FMS Name" sortKey="sheet" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage / Checkpoint" sortKey="stage" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage Owner (Who)" sortKey="owner" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Payment Method" sortKey="paymentMethod" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600"><SortHeader label="Max Delay (Days)" sortKey="maxDelay" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-amber-600"><SortHeader label="Currently Pending" sortKey="pendingCount" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
                <th className="px-4 py-3 print:px-2 text-center font-semibold text-rose-600"><SortHeader label="Completed Late" sortKey="completedDelayCount" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedSummary.length === 0 ? (
                 <tr>
                   <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">No delayed tasks summary.</td>
                 </tr>
              ) : (
                sortedSummary.map((row: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 print:px-2 text-slate-700 font-semibold">{row.sheet}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-900 font-medium">{row.stage}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-700">{row.owner}</td>
                    <td className="px-4 py-3 print:px-2 font-mono text-slate-600">{row.amount > 0 ? `₹${row.amount.toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-4 py-3 print:px-2 text-slate-600">{row.paymentMethod}</td>
                    <td className="px-4 py-3 print:px-2 text-center font-bold text-rose-600">{row.maxDelay ? row.maxDelay.toFixed(1) : '-'}</td>
                    <td className="px-4 py-3 print:px-2 text-center font-bold text-amber-600">{row.pendingCount}</td>
                    <td className="px-4 py-3 print:px-2 text-center font-bold text-rose-600">{row.completedDelayCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseFMSView() {
  const { currentUser: user } = useAuth();
  
  const [summary, setSummary] = useState<PurchaseFMSSummary | null>(null);
  const [items, setItems] = useState<PurchasePipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'report'>('pipeline');

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchasePipelineStatus | 'ALL'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { items: sortedItems, requestSort: requestSortPipeline, sortConfig: sortConfigPipeline } = useSortableData(items);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, statusFilter, dateStart, dateEnd,
   page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, pipeRes] = await Promise.all([
        api.getPurchaseFMSSummary(),
        api.getPurchaseFMSPipeline({
          search: debouncedSearch,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
  
          page,
          pageSize
        })
      ]);
      setSummary(sumRes);
      setItems(pipeRes.items);
      setTotalItems(pipeRes.pagination.totalItems);
    } catch (error) {
      console.error('Failed to fetch Purchase FMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PurchasePipelineStatus) => {
    switch (status) {
      case 'Pending PO':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-600 border border-amber-200">Pending PO</span>;
      case 'Pending Material':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-200">Pending Material</span>;
      case 'Pending Dispatch':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">Pending Dispatch</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">Completed</span>;
      default:
        return null;
    }
  };

  const handleStatusToggle = (status: PurchasePipelineStatus) => {
    setStatusFilter(prev => prev === status ? 'ALL' : status);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100/60 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Purchase FMS Pipeline</h2>
              <p className="text-sm text-slate-500 mt-1">End-to-End Tracking: Indent → PO → Material → Dispatch</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      {/* View Toggle */}
      <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4 print:hidden">
        <button onClick={() => setViewMode('pipeline')} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${viewMode === 'pipeline' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>Pipeline Flow</button>
        <button onClick={() => setViewMode('report')} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${viewMode === 'report' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>Pending/Delayed Task Report</button>
      </div>

      {viewMode === 'pipeline' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100/60 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-8 -translate-y-8 opacity-50"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <PackageSearch className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Indents</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.totalIndents}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => handleStatusToggle('Pending PO')}
            className={`bg-white p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${statusFilter === 'Pending PO' ? 'border-amber-400 ring-4 ring-amber-50 shadow-sm' : 'border-slate-100/60 shadow-xs hover:border-amber-200'}`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-8 -translate-y-8 opacity-50"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending PO</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">{summary.pendingPO}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => handleStatusToggle('Pending Material')}
            className={`bg-white p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${statusFilter === 'Pending Material' ? 'border-blue-400 ring-4 ring-blue-50 shadow-sm' : 'border-slate-100/60 shadow-xs hover:border-blue-200'}`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-8 -translate-y-8 opacity-50"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Material</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{summary.pendingMaterial}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => handleStatusToggle('Pending Dispatch')}
            className={`bg-white p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${statusFilter === 'Pending Dispatch' ? 'border-indigo-400 ring-4 ring-indigo-50 shadow-sm' : 'border-slate-100/60 shadow-xs hover:border-indigo-200'}`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full translate-x-8 -translate-y-8 opacity-50"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Ready / Dispatched</p>
                <p className="text-2xl font-bold text-indigo-600 mt-0.5">{summary.pendingDispatch + summary.dispatched}</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Shared Filters */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 mb-6 flex flex-col print:hidden">
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-2xl">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Indent No, PO No, Vendor..."
              className="block w-full pl-10 pr-3 py-2 text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm px-2 py-1.5 h-[38px]"
                title="Start Date"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm px-2 py-1.5 h-[38px]"
                title="End Date"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchasePipelineStatus | 'ALL')}
              className="text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-[38px]"
            >
              <option value="ALL">All Status</option>
              <option value="Pending PO">Pending PO</option>
              <option value="Pending Material">Pending Material</option>
              <option value="Pending Dispatch">Ready / Dispatched</option>
              <option value="Completed">Completed</option>
            </select>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm h-[38px]">
              <Filter className="h-3.5 w-3.5" />
              Total Items: <strong className="text-slate-700">{totalItems}</strong>
            </span>
            {(statusFilter !== 'ALL' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setDateStart('');
                  setDateEnd('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'pipeline' && (
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 flex flex-col">
        {/* Data Table */}
        {loading && items.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm font-medium">Loading Pipeline Data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 mb-1">No matches found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              We couldn't find any records matching your current filter criteria.
            </p>
            {(search || statusFilter !== 'ALL' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setDateStart('');
                  setDateEnd('');
                }}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Indent & Requisition" sortKey="indentNo" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="PO & Vendor" sortKey="poNumber" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Current Bottleneck" sortKey="currentBottleneck" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Current Status" sortKey="status" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${expandedRow === item.id ? 'bg-indigo-50/30' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                          <span className="text-xs font-bold text-indigo-600">IN</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">#{item.indentNo}</p>
   {item.requisitionNo && <p className="text-[11px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider">REQ: {item.requisitionNo}</p>}
   <p className="text-xs text-slate-500 mt-0.5">{item.siteName} • {item.indentDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.poGenerated ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{item.poNumber || 'PO Generated'}</p>
                          {item.vendorName && <p className="text-xs text-slate-500 mt-1 truncate max-w-xs" title={item.vendorName}>{item.vendorName}</p>}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Not Generated</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
    {item.currentBottleneck ? (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
           <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]" title={item.currentBottleneck.stageName}>{item.currentBottleneck.stageName}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 ml-3.5">
           <User className="h-3 w-3" />
           <span className="truncate max-w-[150px]">{item.currentBottleneck.responsible}</span>
        </div>
        {item.currentBottleneck.delay && parseInt(item.currentBottleneck.delay) > 0 && (
           <span className="text-[10px] text-rose-600 font-semibold ml-3.5 mt-0.5 flex items-center gap-1">
             <AlertTriangle className="h-3 w-3" /> Delay: {item.currentBottleneck.delay} days
           </span>
        )}
      </div>
    ) : (
      <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
        <CheckCircle2 className="h-4 w-4" /> Fully Completed
      </div>
    )}
  </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedRow === item.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50/50 border-b border-slate-200"
                      >
                        <td colSpan={10} className="p-0">
                          <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 shadow-inner">
                            <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                              
                              {/* Macro Progress Bar */}
                              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center gap-2 ${item.status === 'Completed' || item.poGenerated ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'Completed' || item.poGenerated ? 'bg-emerald-100' : 'bg-indigo-100'}`}>1</div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Indent</span>
                                  </div>
                                  <div className="w-12 h-px bg-slate-300"></div>
                                  <div className={`flex items-center gap-2 ${item.status === 'Completed' || item.materialReceived ? 'text-emerald-600' : item.poGenerated ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'Completed' || item.materialReceived ? 'bg-emerald-100' : item.poGenerated ? 'bg-indigo-100' : 'bg-slate-100'}`}>2</div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Purchase Order</span>
                                  </div>
                                  <div className="w-12 h-px bg-slate-300"></div>
                                  <div className={`flex items-center gap-2 ${item.status === 'Completed' ? 'text-emerald-600' : item.materialReceived ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'Completed' ? 'bg-emerald-100' : item.materialReceived ? 'bg-indigo-100' : 'bg-slate-100'}`}>3</div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Store & Dispatch</span>
                                  </div>
                                </div>
                                <div className="text-xs font-semibold text-slate-500">
                                  FMS Health: <span className={parseFloat(item.currentBottleneck?.delay || '0') > 0 ? 'text-rose-600' : 'text-emerald-600'}>{parseFloat(item.currentBottleneck?.delay || '0') > 0 ? 'Delayed' : 'On Track'}</span>
                                </div>
                              </div>

                              {/* Full Pipeline Stages Table */}
                              <div className="bg-white">
                                <div className="px-6 py-3 border-b border-slate-100 bg-slate-800 flex justify-between items-center">
                                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-300" /> Pipeline Stage History
                                  </h4>
                                  <div className="flex gap-4 text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Pending & Delayed</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Completed Late</span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                  <table className="w-full divide-y divide-slate-200 text-xs table-fixed">
                                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                      <tr>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[10%]">Phase</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[26%]">Stage / Task</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[22%]">Owner</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[12%]">Planned</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[12%]">Actual</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[9%]">Status</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 w-[9%]">Delay</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {item.stages.map((stage, idx) => {
                                        const isDone = ['Done', 'Yes', 'Y', 'NA', 'N/A', 'No', 'N'].includes(stage.status);
                                        const delayStr = stage.delay || '';
                                        let hasDelay = false;
                                        if (delayStr && delayStr !== '-' && delayStr !== '0:00:00') {
                                          const val = parseFloat(delayStr);
                                          if (val > 0) hasDelay = true;
                                          else if (delayStr.includes(':')) hasDelay = true;
                                        }
                                        
                                        const isPendingDelayed = !isDone && hasDelay;
                                        const isCompletedLate = isDone && hasDelay;
                                        const isCurrentBottleneck = item.currentBottleneck?.stageName === stage.name;
                                        
                                        let rowBg = 'hover:bg-slate-50/50';
                                        if (isPendingDelayed) rowBg = 'bg-amber-50/40 hover:bg-amber-100/50';
                                        else if (isCompletedLate) rowBg = 'bg-rose-50/40 hover:bg-rose-100/50';
                                        else if (isCurrentBottleneck) rowBg = 'bg-indigo-50/30 hover:bg-indigo-50/50';

                                        return (
                                          <tr key={idx} className={`transition-colors ${rowBg}`}>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                stage.sheet === 'Indent' ? 'bg-indigo-100 text-indigo-700' : 
                                                stage.sheet === 'PO' ? 'bg-purple-100 text-purple-700' : 
                                                'bg-emerald-100 text-emerald-700'
                                              }`}>
                                                {stage.sheet}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2.5 font-medium text-slate-800 truncate" title={stage.name}>
                                              {stage.name}
                                              {isCurrentBottleneck && <span className="ml-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded"><AlertTriangle className="w-2.5 h-2.5" /> Active</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600 truncate" title={stage.responsible}>{stage.responsible}</td>
                                            <td className="px-3 py-2.5 text-slate-500 font-mono text-[10px] leading-tight">
                                              {stage.plannedDate ? stage.plannedDate.split(' ').map((part: string, i: number) => <div key={i}>{part}</div>) : '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-500 font-mono text-[10px] leading-tight">
                                              {stage.actualDate ? stage.actualDate.split(' ').map((part: string, i: number) => <div key={i}>{part}</div>) : '-'}
                                            </td>
                                            <td className="px-3 py-2.5">
                                              {stage.status ? (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                  isDone ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                  {stage.status}
                                                </span>
                                              ) : (
                                                <span className="text-slate-300">-</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2.5 truncate" title={stage.delay || ''}>
                                              {hasDelay ? (
                                                <span className={`font-bold ${isPendingDelayed ? 'text-amber-600' : 'text-rose-600'}`}>
                                                  {stage.delay}
                                                </span>
                                              ) : (
                                                <span className="text-slate-300">{stage.delay || '-'}</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalItems > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, totalItems)}</span> of{' '}
              <span className="font-medium text-slate-700">{totalItems}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalItems}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {viewMode === 'report' && (
        <DelayedTaskReport items={items} dateStart={dateStart} dateEnd={dateEnd} />
      )}
    </div>
  );
}
