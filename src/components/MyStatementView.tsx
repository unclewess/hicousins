import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { calculateDashboardTotals } from '../lib/calculations';
import { CreditCard, Calendar, AlertCircle, Coins, Award, Printer, Shield, CheckCircle2 } from 'lucide-react';

export const MyStatementView: React.FC = () => {
  const store = useChamaStore();
  const group = store.getCurrentGroup();
  const members = store.getMembers();
  const payments = store.getLedgerEntries();
  const asOfDateStr = store.getAsOfDate();
  const asOfDate = new Date(`${asOfDateStr}T12:00:00Z`);

  const membership = store.getCurrentMembership();

  // Check if current user is official
  const isOfficial = membership?.role && [
    'President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer',
    'Auditor', 'Auditor 2', 'Secretary', 'Organizing Secretary', 'Chief Whip 1', 'Chief Whip 2'
  ].includes(membership.role);

  // Default target member:
  // If official: could be themselves, or defaults to Noel Oduor / Winnie Mbidhi or anyone they select
  // If ordinary member: strictly locked to their own memberId!
  const myMemberId = membership?.memberId || 'mem-ndh-001';
  const [selectedMemberId, setSelectedMemberId] = useState<string>(myMemberId);

  // If regular member, enforce strict lock to own memberId
  const effectiveMemberId = isOfficial ? (selectedMemberId || myMemberId) : myMemberId;

  if (!group) return null;

  // If user is pending approval, block financial access
  if (membership?.status === 'pending_approval') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-amber-900 mb-1">Approval Required</h3>
        <p className="text-xs text-amber-700 leading-relaxed mb-4">
          In accordance with group privacy rules and the Kenya Data Protection Act 2019, your financial statement is locked until an official approves your membership claim.
        </p>
        <span className="inline-block px-3 py-1 bg-amber-200/80 text-amber-800 rounded-full text-xs font-semibold">
          Status: Pending Official Verification
        </span>
      </div>
    );
  }

  const { statements } = calculateDashboardTotals(
    members,
    payments,
    asOfDate,
    group.settings,
    283545.25 // Net fund value from Phase 2 / Audit for estimated payout calculation
  );

  const statement = statements.find(s => s.member.id === effectiveMemberId);

  if (!statement) {
    return <div className="p-4 text-center text-slate-500">Member profile not found.</div>;
  }

  const memberPayments = statement.payments;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Official Member Selector Bar */}
      {isOfficial ? (
        <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm text-xs">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">Official View Mode:</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Inspecting statement for:</span>
            <select
              value={effectiveMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-slate-800 text-white rounded border border-slate-700 px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.memberNo}. {m.fullName} ({m.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Personal Statement:</strong> Showing confidential member statement for {statement.member.fullName}.
            </span>
          </div>
        </div>
      )}

      {/* Main Statement Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Member #{statement.member.memberNo} · {statement.member.status}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">{statement.member.fullName}</h2>
            <p className="text-xs text-slate-500">
              Joined {statement.member.joinDate} · Registration Fee: KES {statement.member.regFee}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Standing</span>
              <span className="text-sm font-bold text-slate-800">{statement.statusText}</span>
            </div>
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Print statement"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Key Financial Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
          {/* Paid up to */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paid Up To</span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">{statement.paidUpTo}</div>
            <p className="text-[11px] text-slate-400">FIFO allocation</p>
          </div>

          {/* Months Behind */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Months Behind</span>
            </div>
            <div className="text-lg font-bold font-mono">
              {statement.monthsBehind !== null ? (
                <span className={statement.monthsBehind >= 3 ? 'text-rose-600' : statement.monthsBehind > 0 ? 'text-amber-600' : 'text-emerald-700'}>
                  {statement.monthsBehind} mo
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Due vs shares</p>
          </div>

          {/* Arrears */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              <span>Arrears</span>
            </div>
            <div className="text-lg font-bold font-mono">
              {statement.arrears !== null ? (
                <span className={statement.arrears > 0 ? 'text-rose-600' : 'text-slate-700'}>
                  KES {statement.arrears.toLocaleString()}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">@ KES 100/mo</p>
          </div>

          {/* Penalty Owed */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Penalty Owed</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              KES {statement.penaltyOwed > 0 ? statement.penaltyOwed.toFixed(2) : '0.00'}
            </div>
            <p className="text-[11px] text-slate-400">1% compound / mo</p>
          </div>

          {/* Shares Owned */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shares Owned</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-800">
              {statement.shares} shares
            </div>
            <p className="text-[11px] text-slate-400">
              Ownership: {(statement.ownershipPercentage * 100).toFixed(4)}%
            </p>
          </div>

          {/* Estimated Payout */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Estimated Payout*</span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-900">
              KES {statement.estimatedPayout.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              *Decided at group vote
            </p>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Payment History Ledger ({memberPayments.length} entries)</h3>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Period / Notes</th>
                  <th className="py-2.5 px-3">Financial Year</th>
                  <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {memberPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-600">{p.dateReceived}</td>
                    <td className="py-2 px-3 font-medium">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.type === 'Contribution'
                          ? 'bg-emerald-50 text-emerald-800'
                          : p.type === 'Penalty Payment'
                          ? 'bg-amber-50 text-amber-800'
                          : p.type === 'Debt Repayment'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{p.periodNotes || '—'}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{p.financialYear}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {memberPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
