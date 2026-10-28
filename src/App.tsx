import React, { useState } from 'react';
import { useChamaStore } from './services/store';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MyStatementView } from './components/MyStatementView';
import { LedgerView } from './components/LedgerView';
import { MembersView } from './components/MembersView';
import { ExpensesView } from './components/ExpensesView';
import { MmfReconciliationView } from './components/MmfReconciliationView';
import { LearnReportView } from './components/LearnReportView';
import { HelpView } from './components/HelpView';
import { InviteModal } from './components/InviteModal';
import { ClaimProfileModal } from './components/ClaimProfileModal';
import {
  LayoutDashboard, FileText, BookOpen, Users,
  Receipt, Scale, Library, HelpCircle, UserPlus,
} from 'lucide-react';

type TabKey = 'dashboard' | 'statement' | 'ledger' | 'members' | 'expenses' | 'mmf' | 'documents' | 'help';

interface NavItem {
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  officialOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',  label: 'Dashboard',       shortLabel: 'Home',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'statement',  label: 'My Statement',     shortLabel: 'Statement', icon: <FileText className="w-4 h-4" /> },
  { key: 'ledger',     label: 'Payments Ledger',  shortLabel: 'Payments',  icon: <BookOpen className="w-4 h-4" /> },
  { key: 'members',    label: 'Members & Roles',  shortLabel: 'Members',   icon: <Users className="w-4 h-4" /> },
  { key: 'expenses',   label: 'Expenses',         shortLabel: 'Expenses',  icon: <Receipt className="w-4 h-4" />, officialOnly: true },
  { key: 'mmf',        label: 'Audit & MMF',      shortLabel: 'Audit',     icon: <Scale className="w-4 h-4" />, officialOnly: true },
  { key: 'documents',  label: 'Documents',        shortLabel: 'Docs',      icon: <Library className="w-4 h-4" /> },
  { key: 'help',       label: 'Help',             shortLabel: 'Help',      icon: <HelpCircle className="w-4 h-4" /> },
];

export const App: React.FC = () => {
  const store = useChamaStore();
  const membership = store.getCurrentMembership();

  const isOfficial = !!(membership?.role && [
    'President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer',
    'Secretary', 'Organizing Secretary', 'Chief Whip 1', 'Chief Whip 2',
    'Auditor', 'Auditor 1', 'Auditor 2',
  ].includes(membership.role));

  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);

  // Visible nav items depend on role
  const visibleNav = NAV_ITEMS.filter(item => !item.officialOnly || isOfficial);

  // Mobile bottom bar shows at most 5 items (pick most important)
  const mobileNav = visibleNav.slice(0, isOfficial ? 6 : 5);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
      {/* Top Application Header */}
      <Header onOpenInvite={() => setShowInviteModal(true)} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-4">
        {/* Unclaimed Profile / Onboarding Callout */}
        {(!membership || membership.status === 'pending_approval') && (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700/60 px-2 py-0.5 rounded text-emerald-200">
                New Joiner Workflow
              </span>
              <h2 className="text-base sm:text-lg font-bold">Have you claimed your Ndhuhulu profile yet?</h2>
              <p className="text-xs text-emerald-200 max-w-xl">
                The member roster starts without phone numbers. Claim your name from the roster or request new membership.
                An official will verify your claim to unlock your financial statements.
              </p>
            </div>
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2.5 bg-white text-emerald-900 font-bold rounded-xl text-xs hover:bg-emerald-50 transition shadow-md whitespace-nowrap flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Claim Profile / Join</span>
            </button>
          </div>
        )}

        {/* Desktop Tab Navigation — scrollable */}
        <div className="hidden sm:flex items-center space-x-1 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-hide">
          {visibleNav.map(item => (
            <button
              key={item.key}
              onClick={() => setCurrentTab(item.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                currentTab === item.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Views */}
        {currentTab === 'dashboard'  && <DashboardView />}
        {currentTab === 'statement'  && <MyStatementView />}
        {currentTab === 'ledger'     && <LedgerView />}
        {currentTab === 'members'    && <MembersView />}
        {currentTab === 'expenses'   && isOfficial && <ExpensesView />}
        {currentTab === 'mmf'        && isOfficial && <MmfReconciliationView />}
        {currentTab === 'documents'  && <LearnReportView />}
        {currentTab === 'help'       && <HelpView />}

        {/* Access-denied guard for officials-only tabs */}
        {(currentTab === 'expenses' || currentTab === 'mmf') && !isOfficial && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <Scale className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-amber-800">Officials Only</p>
            <p className="text-xs text-amber-600 mt-1">This section is restricted to group officials.</p>
          </div>
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around z-40 shadow-lg">
        {mobileNav.map(item => (
          <button
            key={item.key}
            onClick={() => setCurrentTab(item.key)}
            className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition min-w-0 flex-1 ${
              currentTab === item.key ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            {React.cloneElement(item.icon as React.ReactElement, { className: 'w-5 h-5 mb-0.5' })}
            <span className="truncate w-full text-center">{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      <ClaimProfileModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />
    </div>
  );
};
