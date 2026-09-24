// OpsFlow 360 – Status Badge Component

import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'approval' | 'addition' | 'payment' | 'priority' | 'role';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'approval', size = 'sm' }) => {
  const normalized = (status || '').toUpperCase().replace(/[\s-]/g, '_');

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = status;

  if (type === 'approval') {
    switch (normalized) {
      case 'DRAFT':
        bg = 'bg-slate-100 text-slate-700 border-slate-200';
        dot = 'bg-slate-400';
        label = 'Draft';
        break;
      case 'SUBMITTED':
        bg = 'bg-blue-50 text-blue-700 border-blue-200';
        dot = 'bg-blue-500';
        label = 'Submitted';
        break;
      case 'UNDER_REVIEW':
        bg = 'bg-amber-50 text-amber-800 border-amber-200';
        dot = 'bg-amber-500';
        label = 'Under Review';
        break;
      case 'APPROVED':
        bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dot = 'bg-emerald-500';
        label = 'Approved';
        break;
      case 'PROCESSING':
        bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        dot = 'bg-indigo-500';
        label = 'Processing';
        break;
      case 'COMPLETED':
        bg = 'bg-teal-50 text-teal-800 border-teal-200';
        dot = 'bg-teal-500';
        label = 'Completed';
        break;
      case 'REJECTED':
        bg = 'bg-rose-50 text-rose-800 border-rose-200';
        dot = 'bg-rose-500';
        label = 'Rejected';
        break;
      case 'NOT_APPROVED':
        bg = 'bg-rose-50 text-rose-800 border-rose-200';
        dot = 'bg-rose-500';
        label = 'Not Approved';
        break;
      case 'HOLD':
        bg = 'bg-purple-50 text-purple-800 border-purple-200';
        dot = 'bg-purple-500';
        label = 'On Hold';
        break;
      case 'CANCELLED':
        bg = 'bg-zinc-100 text-zinc-600 border-zinc-200';
        dot = 'bg-zinc-400';
        label = 'Cancelled';
        break;
    }
  } else if (type === 'addition') {
    switch (normalized) {
      case 'NOT_STARTED':
        bg = 'bg-slate-100 text-slate-700 border-slate-200';
        dot = 'bg-slate-400';
        label = 'Not Started';
        break;
      case 'IN_PROGRESS':
        bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        dot = 'bg-indigo-500';
        label = 'In Progress';
        break;
      case 'DONE':
        bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dot = 'bg-emerald-500';
        label = 'Done';
        break;
      case 'FAILED':
        bg = 'bg-rose-50 text-rose-800 border-rose-200';
        dot = 'bg-rose-500';
        label = 'Failed';
        break;
      case 'CANCELLED':
        bg = 'bg-zinc-100 text-zinc-600 border-zinc-200';
        dot = 'bg-zinc-400';
        label = 'Cancelled';
        break;
      case 'HOLD':
        bg = 'bg-purple-50 text-purple-800 border-purple-200';
        dot = 'bg-purple-500';
        label = 'On Hold';
        break;
    }
  } else if (type === 'payment') {
    switch (normalized) {
      case 'NOT_PAID':
        bg = 'bg-amber-50 text-amber-800 border-amber-200';
        dot = 'bg-amber-500';
        label = 'Not Paid';
        break;
      case 'PROCESSING':
        bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        dot = 'bg-indigo-500';
        label = 'Processing';
        break;
      case 'PAID':
        bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        dot = 'bg-emerald-500';
        label = 'Paid';
        break;
      case 'FAILED':
        bg = 'bg-rose-50 text-rose-800 border-rose-200';
        dot = 'bg-rose-500';
        label = 'Failed';
        break;
      case 'REVERSED':
        bg = 'bg-orange-50 text-orange-800 border-orange-200';
        dot = 'bg-orange-500';
        label = 'Reversed';
        break;
    }
  } else if (type === 'priority') {
    switch (normalized) {
      case 'URGENT':
        bg = 'bg-rose-100 text-rose-900 border-rose-300 font-semibold';
        dot = 'bg-rose-600';
        label = 'Urgent';
        break;
      case 'HIGH':
        bg = 'bg-amber-100 text-amber-900 border-amber-300';
        dot = 'bg-amber-600';
        label = 'High';
        break;
      case 'NORMAL':
      default:
        bg = 'bg-slate-100 text-slate-700 border-slate-200';
        dot = 'bg-slate-400';
        label = 'Normal';
        break;
    }
  } else if (type === 'role') {
    switch (normalized) {
      case 'SUPER_ADMIN':
        bg = 'bg-purple-50 text-purple-800 border-purple-200 font-semibold';
        dot = 'bg-purple-600';
        label = 'Super Admin';
        break;
      case 'FINANCE_APPROVER':
        bg = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
        dot = 'bg-emerald-600';
        label = 'Finance Approver';
        break;
      case 'BANK_OPERATOR':
        bg = 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
        dot = 'bg-blue-600';
        label = 'Bank Operator';
        break;
      case 'DEPARTMENT_MANAGER':
        bg = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
        dot = 'bg-amber-600';
        label = 'Dept Manager';
        break;
      case 'AUDITOR':
        bg = 'bg-slate-100 text-slate-800 border-slate-300 font-semibold';
        dot = 'bg-slate-600';
        label = 'Auditor';
        break;
      case 'EMPLOYEE_REQUESTER':
      default:
        bg = 'bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold';
        dot = 'bg-cyan-600';
        label = 'Requester';
        break;
    }
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap ${sizeClasses} ${bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
