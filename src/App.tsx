// OpsFlow 360 – Main Application Component

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './client/context/AuthContext';
import { Header } from './client/components/Header';
import { DashboardView } from './client/components/DashboardView';
import { InterbankView } from './client/components/InterbankView';
import { BeneficiaryView } from './client/components/BeneficiaryView';
import { VendorPaymentView } from './client/components/VendorPaymentView';
import { ReportsView } from './client/components/ReportsView';
import { AuditView } from './client/components/AuditView';
import { AdminView } from './client/components/AdminView';
import { ITChecklistView } from './client/components/ITChecklistView';
import PurchaseFMSView from './client/components/PurchaseFMSView';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [interbankInitialOpen, setInterbankInitialOpen] = useState(false);
  const [beneficiaryInitialOpen, setBeneficiaryInitialOpen] = useState(false);
  const [vendorPaymentInitialOpen, setVendorPaymentInitialOpen] = useState(false);

  const handleNavigate = (tab: string, action?: string) => {
    setActiveTab(tab);
    if (tab === 'interbank' && action === 'new') {
      setInterbankInitialOpen(true);
    } else {
      setInterbankInitialOpen(false);
    }

    if (tab === 'beneficiaries' && action === 'new') {
      setBeneficiaryInitialOpen(true);
    } else {
      setBeneficiaryInitialOpen(false);
    }

    if (tab === 'vendor_payments' && action === 'new') {
      setVendorPaymentInitialOpen(true);
    } else {
      setVendorPaymentInitialOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Executive Header & Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setInterbankInitialOpen(false);
          setBeneficiaryInitialOpen(false);
          setVendorPaymentInitialOpen(false);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {activeTab === 'interbank' && (
          <InterbankView key={String(interbankInitialOpen)} initialCreateOpen={interbankInitialOpen} />
        )}
        {activeTab === 'beneficiaries' && (
          <BeneficiaryView key={String(beneficiaryInitialOpen)} initialCreateOpen={beneficiaryInitialOpen} />
        )}
        {activeTab === 'vendor_payments' && (
          <VendorPaymentView
            key={String(vendorPaymentInitialOpen)}
            initialCreateOpen={vendorPaymentInitialOpen}
          />
        )}
        {activeTab === 'it_checklist' && <ITChecklistView />}
        {activeTab === 'purchase_fms' && <PurchaseFMSView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'audit' && <AuditView />}
        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Corporate Operational Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">OpsFlow 360</span>
            <span>·</span>
            <span>Enterprise Payment Automation & Treasury System</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Dual-Control Governance</span>
            <span>·</span>
            <span>Atomic Concurrency Engine</span>
            <span>·</span>
            <span className="font-mono text-indigo-600 font-semibold">15-Tab Google Sheets Core</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
