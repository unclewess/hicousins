import React from 'react';
import { useChamaStore, MOCK_USERS } from '../services/store';
import { Calendar, Share2, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenInvite: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenInvite }) => {
  const store = useChamaStore();
  const group = store.getCurrentGroup();
  const currentUser = store.getCurrentUser();
  const membership = store.getCurrentMembership();
  const asOfDate = store.getAsOfDate();

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      {/* Top Banner: As-of Date & Group Switcher */}
      <div className="bg-emerald-950 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-emerald-900/60 text-emerald-300">
        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Audit As-of Date:</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => store.setAsOfDate(e.target.value)}
            className="bg-emerald-900/90 text-white border border-emerald-700 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {asOfDate === '2026-10-25' && (
            <span className="bg-emerald-800 text-emerald-200 px-1.5 py-0.2 text-[10px] rounded font-semibold">
              Benchmark
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
          <button
            onClick={() => {
              if (confirm('Reset store back to fresh migration benchmark (Oct 25, 2026)?')) {
                store.resetAllToMigrationBenchmark();
              }
            }}
            title="Reset to fresh migration benchmark"
            className="text-[11px] text-emerald-400 hover:text-emerald-200 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-3 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <span className="text-xl font-black tracking-tight text-white">hC</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">hiCousins</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
              {group?.name || 'Ndhuhulu Self-Help Group'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Invite WhatsApp Button */}
          <button
            onClick={onOpenInvite}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* Quick Role / User Switcher */}
          <div className="relative flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <div className="flex items-center space-x-1 px-2 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline font-medium">Logged as:</span>
            </div>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = MOCK_USERS.find(user => user.id === e.target.value);
                if (u) store.switchUser(u);
              }}
              className="bg-slate-900 text-white text-xs rounded border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px] sm:max-w-none"
            >
              {MOCK_USERS.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unapproved Joiner Warning Banner */}
      {membership?.status === 'pending_approval' && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Pending Official Approval:</strong> Your request to join or claim{' '}
              <em>{membership.claimedName || 'profile'}</em> is awaiting verification by an official. Financial records remain private until approved.
            </span>
          </div>
        </div>
      )}

      {/* Pilot Mode A Banner (Default: Google Sheet is official record) */}
      {group?.settings.pilot_mode === 'A' && (
        <div className="bg-slate-800/90 border-t border-slate-700/80 px-4 py-1.5 text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              <strong>Pilot Mode A:</strong> Mirror of the group's Google Sheet, as of <strong>{group.settings.last_sheet_import_date || asOfDate}</strong>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Official Source: Google Sheet (Read-Only Mirror)
          </span>
        </div>
      )}
    </header>
  );
};
