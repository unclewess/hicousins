import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { calculateDashboardTotals } from '../lib/calculations';
import { Users, Coins, AlertTriangle, CheckCircle, Search, ShieldAlert } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const store = useChamaStore();
  const group = store.getCurrentGroup();
  const members = store.getMembers();
  const payments = store.getLedgerEntries();
  const asOfDateStr = store.getAsOfDate();
  const asOfDate = new Date(`${asOfDateStr}T12:00:00Z`);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLight, setFilterLight] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'special'>('active');

  if (!group) return null;

  const { totals, statements } = calculateDashboardTotals(
    members,
    payments,
    asOfDate,
    group.settings
  );

  const activeStatements = statements.filter(s => s.member.status === 'Active');
  const specialStatements = statements.filter(s => s.member.status !== 'Active');

  const filteredActive = activeStatements.filter(s => {
    const matchesSearch = s.member.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterLight === 'all') return true;
    return s.trafficLight === filterLight;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Members */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Members</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totals.activeMembersCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totals.leftCount} Left · {totals.deceasedCount} Deceased · {totals.neverActiveCount} Never Active
          </p>
        </div>

        {/* Total Shares */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shares</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {totals.totalShares.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Value: KES {(totals.totalShares * group.settings.share_value).toLocaleString()}
          </p>
        </div>

        {/* Total Money In */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Money In</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            KES {totals.moneyIn.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Contrib: {totals.totalContributions.toLocaleString()} · Reg: {totals.totalAdminIncome.toLocaleString()} · Fine: {totals.totalPenaltiesCollected}
          </p>
        </div>

        {/* Total Active Arrears */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Arrears</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            KES {totals.totalActiveArrears.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong>{totals.membersInArrearsCount}</strong> active members behind
          </p>
        </div>
      </div>

      {/* Tabs: Active vs Special (Left/Deceased/Never Active) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Active Roster ({activeStatements.length})
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'special'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Frozen / Inactive ({specialStatements.length})
          </button>
        </div>

        {/* Traffic Light Quick Filter for Active */}
        {activeTab === 'active' && (
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setFilterLight('all')}
              className={`px-2 py-1 rounded text-[11px] font-medium ${
                filterLight === 'all' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({activeStatements.length})
            </button>
            <button
              onClick={() => setFilterLight('green')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 ${
                filterLight === 'green' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>🟢 Current</span>
            </button>
            <button
              onClick={() => setFilterLight('yellow')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 ${
                filterLight === 'yellow' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>🟡 1-2 mo</span>
            </button>
            <button
              onClick={() => setFilterLight('red')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 ${
                filterLight === 'red' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>🔴 3+ mo</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'active' ? (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search active member by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Active Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">No.</th>
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Standing</th>
                    <th className="py-2.5 px-3">Paid Up To</th>
                    <th className="py-2.5 px-3 text-right">Months Behind</th>
                    <th className="py-2.5 px-3 text-right">Arrears</th>
                    <th className="py-2.5 px-3 text-right">Penalty</th>
                    <th className="py-2.5 px-3 text-right">Shares</th>
                    <th className="py-2.5 px-3 text-right">Ownership</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredActive.map((s) => (
                    <tr key={s.member.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{s.member.memberNo}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{s.member.fullName}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.trafficLight === 'green'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.trafficLight === 'yellow'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.statusText}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{s.paidUpTo}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {s.monthsBehind && s.monthsBehind > 0 ? (
                          <span className={s.monthsBehind >= 3 ? 'text-rose-600 font-bold' : 'text-amber-600 font-semibold'}>
                            {s.monthsBehind} mo
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {s.arrears && s.arrears > 0 ? (
                          <span className="text-rose-600 font-bold">{s.arrears.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {s.penaltyOwed > 0 ? s.penaltyOwed.toFixed(2) : '0'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{s.shares}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {(s.ownershipPercentage * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {filteredActive.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No active members matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Special Members Category */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Special Membership Categories (Frozen & Inactive)</span>
            </div>
            <p>
              Per constitution rules: Left and Deceased members have their shares frozen at their last contribution date.
              They receive their proportional payout upon final disbursement. Never Active members have zero shares and no claim on the fund.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">No.</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Shares</th>
                  <th className="py-2.5 px-3">Paid Up To</th>
                  <th className="py-2.5 px-3">Beneficiary / Constitution Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {specialStatements.map((s) => (
                  <tr key={s.member.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{s.member.memberNo}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{s.member.fullName}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.member.status === 'Deceased' ? '🕊 Deceased' : s.member.status === 'Left' ? '🔒 Left' : '⬜ Never Active'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">{s.shares}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{s.paidUpTo}</td>
                    <td className="py-2 px-3 text-slate-600 italic">
                      {s.member.beneficiaryNotes || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
