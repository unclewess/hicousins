import React, { useState } from 'react';
import { useChamaStore } from './services/store';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MyStatementView } from './components/MyStatementView';
import { LedgerView } from './components/LedgerView';
import { MembersView } from './components/MembersView';
import { InviteModal } from './components/InviteModal';
import { ClaimProfileModal } from './components/ClaimProfileModal';
import { LayoutDashboard, FileText, BookOpen, Users, UserPlus } from 'lucide-react';

export const App: React.FC = () => {
  const store = useChamaStore();
  const membership = store.getCurrentMembership();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'statement' | 'ledger' | 'members'>('dashboard');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
      {/* Top Application Header */}
      <Header onOpenInvite={() => setShowInviteModal(true)} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1 space-y-4">
        {/* Unclaimed Profile / Onboarding Callout for guest or new user */}
        {(!membership || membership.status === 'pending_approval') && (
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-700/60 px-2 py-0.5 rounded text-emerald-200">
                New Joiner Workflow
              </span>
              <h2 className="text-base sm:text-lg font-bold">Have you claimed your Ndhuhulu profile yet?</h2>
              <p className="text-xs text-emerald-200 max-w-xl">
                The member roster starts without phone numbers. Claim your name from the roster or request new membership. An official will verify your claim to unlock your financial statements.
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

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:flex items-center space-x-1 border-b border-slate-200 pb-2">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentTab('statement')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'statement'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Statement</span>
          </button>

          <button
            onClick={() => setCurrentTab('ledger')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Payments Ledger</span>
          </button>

          <button
            onClick={() => setCurrentTab('members')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'members'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members & Roles</span>
          </button>
        </div>

        {/* Tab Views */}
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'statement' && <MyStatementView />}
        {currentTab === 'ledger' && <LedgerView />}
        {currentTab === 'members' && <MembersView />}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentTab('statement')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'statement' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Statement</span>
        </button>

        <button
          onClick={() => setCurrentTab('ledger')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'ledger' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => setCurrentTab('members')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'members' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Members</span>
        </button>
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
