// OpsFlow 360 – Executive Header & Persona Switcher

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './common/StatusBadge';
import {
  Building2,
  Bell,
  CheckCheck,
  ShieldCheck,
  Database,
  ChevronDown,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab }) => {
  const {
    currentUser,
    allUsers,
    switchUser,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    sheetsStatus,
  } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Group demo personas by role for fast switching
  const personas = [
    { id: 'usr-1', label: 'Rajesh Sharma', role: 'SUPER_ADMIN', desc: 'Full System & Policy Access' },
    { id: 'usr-2', label: 'Vikram Mehta', role: 'FINANCE_APPROVER', desc: 'Authorizes Payments & Reviews' },
    { id: 'usr-4', label: 'Amit Patel', role: 'BANK_OPERATOR', desc: 'Executes Transfers & Adds Beneficiaries' },
    { id: 'usr-6', label: 'Sunil Verma', role: 'DEPARTMENT_MANAGER', desc: 'Maintenance Dept Manager' },
    { id: 'usr-8', label: 'Deepak Kumar', role: 'EMPLOYEE_REQUESTER', desc: 'Submits Payment Requests' },
    { id: 'usr-10', label: 'Anand Kulkarni', role: 'AUDITOR', desc: 'Read-only Audit & Governance' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'interbank', label: 'Interbank Transfers' },
    { id: 'beneficiaries', label: 'Beneficiaries' },
    { id: 'vendor_payments', label: 'Vendor Payments' },
    { id: 'it_checklist', label: 'IT Checklist' },
    { id: 'purchase_fms', label: 'Purchase FMS' },
    { id: 'reports', label: 'Reports & Export' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'admin', label: 'Sheets & Governance' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
      {/* Top Banner: Enterprise Branding & Persona Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Corporate Identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Building2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">OpsFlow 360</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Payment Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Interbank & Vendor Workflow Automation System
              </p>
            </div>
          </div>

          {/* Right Controls: Database status, Notification Drawer & Persona Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Google Sheets Status Pill */}
            <div
              onClick={() => onSelectTab('admin')}
              className="cursor-pointer hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              title="Google Sheets Database connection active"
            >
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sheets Operational (15 Tabs)</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowUserMenu(false);
                }}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">Operational Alerts</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-500">
                        No recent notifications.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.readStatus) markNotificationRead(n.id);
                            if (n.referenceType === 'INTERBANK') onSelectTab('interbank');
                            else if (n.referenceType === 'BENEFICIARY') onSelectTab('beneficiaries');
                            else if (n.referenceType === 'VENDOR_PAYMENT') onSelectTab('vendor_payments');
                            setShowNotifMenu(false);
                          }}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            n.readStatus ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                          {n.sheetNo && (
                            <span className="inline-block mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {n.sheetNo}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active User Pill & Fast Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.name.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-none">
                    {currentUser?.name || 'Loading...'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <StatusBadge status={currentUser?.role || ''} type="role" size="sm" />
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Role & Persona
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instantly test role-based permissions and viewing boundaries.
                    </p>
                  </div>

                  <div className="p-1 space-y-1 max-h-80 overflow-y-auto">
                    {personas.map((p) => {
                      const isActive = currentUser?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            switchUser(p.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                            isActive
                              ? 'bg-indigo-50/80 border border-indigo-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {p.label.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {p.label}
                              </span>
                              {isActive && <UserCheck className="h-4 w-4 text-indigo-600" />}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{p.desc}</div>
                            <div className="mt-1">
                              <StatusBadge status={p.role} type="role" size="sm" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Location: {currentUser?.location || 'Central'}</span>
                      <span>Dept: {currentUser?.department || 'Operations'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
