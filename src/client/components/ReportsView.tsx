import { useSortableData, SortConfig } from '../hooks/useSortableData';
import { SortHeader } from './common/SortHeader';
// OpsFlow 360 – Financial Reports, Reconciliation & Export Center

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building,
  Printer,
  Table,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();

  const [dateRange, setDateRange] = useState({
    startDate: '2026-08-01',
    endDate: '2026-09-30',
  });
  const [siteFilter, setSiteFilter] = useState('');
  const [reportType, setReportType] = useState<'VENDOR' | 'INTERBANK' | 'BENEFICIARY'>('VENDOR');
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { items: sortedReports, requestSort, sortConfig } = useSortableData(reportData);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        if (reportType === 'VENDOR') {
          const res = await api.getPaymentReport({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            site: siteFilter || undefined,
          });
          setReportData(res.items || []);
          setSummary(res.summary);
        } else if (reportType === 'INTERBANK') {
          const res = await api.listInterbankTransfers({
            site: siteFilter || undefined,
            pageSize: 500,
          });
          setReportData(res.items || []);
          const totalAmt = (res.items || []).reduce((acc: number, item: any) => acc + item.amount, 0);
          setSummary({ totalAmount: totalAmt, count: res.pagination?.totalItems || res.items.length });
        } else if (reportType === 'BENEFICIARY') {
          const res = await api.listBeneficiaries({ pageSize: 500 });
          setReportData(res.items || []);
          setSummary({ count: res.pagination?.totalItems || res.items.length });
        }
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportType, dateRange, siteFilter]);

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csv = await api.exportPaymentsCsv({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        site: siteFilter || undefined,
      });

      // Trigger browser download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `OpsFlow_360_Export_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            Financial Reports & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export Google Sheets compliant ledgers, audit statements, and UTR settlement records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{exporting ? 'Generating CSV...' : 'Download CSV Sheet'}</span>
        </button>
      </div>

      {/* Control Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Report Selector Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
          <button
            onClick={() => setReportType('VENDOR')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              reportType === 'VENDOR' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendor Payments
          </button>
          <button
            onClick={() => setReportType('INTERBANK')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              reportType === 'INTERBANK' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interbank Transfers
          </button>
          <button
            onClick={() => setReportType('BENEFICIARY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              reportType === 'BENEFICIARY' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Beneficiary Register
          </button>
        </div>

        {/* Date & Site Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>From:</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="py-1 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>To:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="py-1 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
            />
          </div>

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="text-xs py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Sites</option>
            <option value="Raipur Office">Raipur Office</option>
            <option value="Siladehi Site">Siladehi Site</option>
            <option value="Bilaspur Depot">Bilaspur Depot</option>
          </select>
        </div>
      </div>

      {/* Summary Highlights */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Total Filtered Records</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.count || reportData.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Matching current date & site parameters</p>
          </div>

          {reportType === 'VENDOR' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Total Commitment Value</span>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {formatCurrency(summary.totalAmount)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Cumulative payable bills</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Disbursed & Settled</span>
                <div className="text-2xl font-bold text-teal-600 mt-1">
                  {formatCurrency(summary.paidAmount)}
                </div>
                <p className="text-[11px] text-teal-600 mt-0.5">Verified bank disbursements</p>
              </div>
            </>
          )}

          {reportType === 'INTERBANK' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Interbank Transferred</span>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                {formatCurrency(summary.totalAmount)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all internal company accounts</p>
            </div>
          )}
        </div>
      )}

      {/* Report Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Reconciliation Ledger — {reportType.replace(/_/g, ' ')}
          </h3>
          <span className="text-xs text-slate-500">Showing {reportData.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-white border-b border-slate-200 font-semibold text-slate-700">
              {reportType === 'VENDOR' ? (
                <tr>
                  <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Vendor" sortKey="vendorName" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Bill / PO" sortKey="billNoPO" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Mode" sortKey="modeOfPayment" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amountToBePaid" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Site" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Settlement" sortKey="paymentStatus" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Bank UTR" sortKey="paymentReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>
                </tr>
              ) : reportType === 'INTERBANK' ? (
                <tr>
                  <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Transfer From" sortKey="transferFrom" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Transfer To" sortKey="transferTo" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Site" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Bank UTR" sortKey="paymentReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="nameOfBeneficiary" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Account No" sortKey="accountNo" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="IFSC" sortKey="ifscCode" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Bank" sortKey="bankName" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Approval" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Bank Addition" sortKey="additionStatus" currentSort={sortConfig} requestSort={requestSort} /></th>
                  <th className="px-4 py-3"><SortHeader label="Ref ID" sortKey="entryReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Generating report data...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No records found for current parameters.
                  </td>
                </tr>
) : (
                sortedReports.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {row.sheetNo}
                      <p className="text-[10px] text-slate-400 mt-0.5">{row.timestamp}</p>
                    </td>
                    {reportType === 'VENDOR' ? (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 max-w-[150px] truncate">
                          {row.vendorName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.billNoPO}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.modeOfPayment}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(row.amountToBePaid)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.site}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.status}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              row.paymentStatus === 'PAID' ? 'text-teal-600' : 'text-slate-500'
                            }`}
                          >
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.paymentReferenceNumber || '—'}
                        </td>
                      </>
                    ) : reportType === 'INTERBANK' ? (
                      <>
                        <td className="px-4 py-3 max-w-[150px] truncate">{row.transferFrom}</td>
                        <td className="px-4 py-3 max-w-[150px] truncate">{row.transferTo}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.site}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{row.status}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.paymentReferenceNumber || '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {row.nameOfBeneficiary}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{row.accountNo}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.ifscCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.bankName}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{row.status}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.additionStatus}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.entryReferenceNumber || '—'}
                        </td>
                      </>
                    )}
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
