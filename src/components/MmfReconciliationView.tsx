import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { MmfDepositSource } from '../types';
import { AlertTriangle, CheckCircle, Scale, ShieldAlert, PlusCircle, History } from 'lucide-react';

export const MmfReconciliationView: React.FC = () => {
  const store = useChamaStore();
  const membership = store.getCurrentMembership();
  const isOfficial = membership?.role && [
    'President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer', 'Auditor'
  ].includes(membership.role);

  const snapshot = store.getMmfSnapshot();
  const debt = store.getTreasurerDebt();
  const deposits = store.getMmfDeposits();
  const auditInputs = store.getAuditInputs();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Form states
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0]);
  const [depAmount, setDepAmount] = useState<number>(1000);
  const [depSource, setDepSource] = useState<MmfDepositSource>('Member Funds');
  const [depNotes, setDepNotes] = useState('');

  // Update MMF inputs form
  const [tempDeposited, setTempDeposited] = useState<number>(auditInputs.totalDeposited);
  const [tempBalance, setTempBalance] = useState<number>(auditInputs.mmfBalance);
  const [tempInterest, setTempInterest] = useState<number>(auditInputs.cumulativeInterest);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.recordMmfDeposit({
      date: depDate,
      amount: depAmount,
      source: depSource,
      notes: depNotes,
    });
    setShowDepositModal(false);
    setDepNotes('');
  };

  const handleUpdateInputsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateAuditInputs({
      totalDeposited: tempDeposited,
      mmfBalance: tempBalance,
      cumulativeInterest: tempInterest,
    });
    setShowUpdateModal(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Red Flag Alert: Negative Cash on Hand */}
      {snapshot.negativeCashFlag && (
        <div className="bg-rose-500 text-white rounded-2xl p-5 shadow-lg border-2 border-rose-600 space-y-2">
          <div className="flex items-center space-x-2.5 font-bold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 text-white animate-bounce shrink-0" />
            <span>⚠️ CRITICAL RECONCILIATION FLAG: Negative Cash on Hand (-KES {Math.abs(snapshot.cashOnHand).toFixed(2)})</span>
          </div>
          <p className="text-xs text-rose-100 leading-relaxed">
            <strong>Operational Cause:</strong> The treasurer deposited more money into the CIC MMF account than was collected in net member contributions minus expenses (using their personal money to round up deposits or cover transaction fees).
            The app preserves the exact negative balance to ensure group accounts reconcile. Reconcile treasurer reimbursement.
          </p>
        </div>
      )}

      {/* Main Reconciliation Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly CIC Reconciliation</span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">MMF & Fund Value Status</h2>
            <p className="text-xs text-slate-500">Audit Period: October – September · Source: CIC Asset Management Statement</p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                snapshot.status === 'Balanced'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {snapshot.status === 'Balanced' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>✅ BALANCED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>⚠️ DISCREPANCY: KES {snapshot.discrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </>
              )}
            </span>

            {isOfficial && (
              <button
                onClick={() => setShowUpdateModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Update CIC Statement
              </button>
            )}
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Deposited to MMF</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              KES {snapshot.totalDeposited.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Total ever sent to CIC</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Current MMF Balance</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              KES {snapshot.mmfBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">From CIC Statement</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Cumulative Interest</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              KES {snapshot.interestEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Compound yield earned</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Expected MMF Balance</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              KES {snapshot.expectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Deposited + Interest</p>
          </div>
        </div>

        {/* Net Fund Value & Cash on Hand Section */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-5 rounded-xl shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Total Group Worth</span>
            <h3 className="text-2xl sm:text-3xl font-black">
              KES {snapshot.netFundValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-200">
              Net Fund Value = MMF Balance (KES {snapshot.mmfBalance.toLocaleString()}) + Cash on Hand (KES {snapshot.cashOnHand.toFixed(2)})
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/20 text-xs space-y-1">
            <div className="flex justify-between space-x-4">
              <span className="text-emerald-200">Cash on Hand:</span>
              <span className={`font-mono font-bold ${snapshot.cashOnHand < 0 ? 'text-rose-300' : 'text-white'}`}>
                KES {snapshot.cashOnHand.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-emerald-200">Discrepancy:</span>
              <span className="font-mono font-bold text-amber-300">
                KES {snapshot.discrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Discrepancy Note from Workbook */}
        {snapshot.status === 'Discrepancy' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Audit Discrepancy Analysis (KES 6,175.96)</span>
            </div>
            <p className="leading-relaxed">
              The KES 6,175.96 discrepancy between expected MMF and current statement balance is traceable to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>
                <strong>Former Treasurer Debt:</strong> Antoinette Ochieng's agreed discrepancy liability of KES 8,184 has KES 6,184 outstanding that is not yet deposited into the MMF.
              </li>
              <li>
                <strong>MMF Interest Accrual Timing:</strong> Yield accrued at CIC but not yet credited to the principal account.
              </li>
              <li>
                <strong>Pending Cash on Hand:</strong> Unbanked collections pending deposit to the fund.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Treasurer Debt Tracker Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2.5">
            <Scale className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Treasurer Discrepancy Debt Tracker</h3>
              <p className="text-xs text-slate-500">Antoinette Ochieng · Agreed liability tracking</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
            Excluded from shares & money in
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Agreed Liability</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              KES {debt.agreedLiability.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Agreed discrepancy at formal audit</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Repaid to Date</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              KES {debt.repaidToDate.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">2 instalments paid</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Outstanding Balance</span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              KES {debt.outstandingBalance.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Pending recovery</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          📌 <strong>Accounting Principle:</strong> Discrepancy debt repayments are recorded as type <code>Debt Repayment</code>.
          They reduce Antoinette's outstanding liability, do <em>NOT</em> award shares, and are <em>NOT</em> added to <code>money_in</code> because the underlying member contributions were already counted.
        </p>
      </div>

      {/* MMF Deposits Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">MMF Deposits Log (Tracing History)</h3>
              <p className="text-xs text-slate-500">Every deposit entry recorded by source to reconcile differences</p>
            </div>
          </div>

          {isOfficial && (
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record MMF Deposit</span>
            </button>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                <th className="py-2.5 px-3">Notes / Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-600">{d.date}</td>
                  <td className="py-2.5 px-3 font-medium">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      d.source === 'Penalty Fines'
                        ? 'bg-amber-100 text-amber-800'
                        : d.source === 'Treasurer Debt Repayment'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {d.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {d.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{d.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Deposit to CIC MMF</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Deposit Date</label>
                <input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Amount (KES)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={depAmount || ''}
                  onChange={(e) => setDepAmount(Number(e.target.value.replace(/,/g, '')))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Fund Source</label>
                <select
                  value={depSource}
                  onChange={(e) => setDepSource(e.target.value as MmfDepositSource)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Member Funds">Member Funds (Monthly Contributions)</option>
                  <option value="Penalty Fines">Penalty Fines (Collected penalties)</option>
                  <option value="Treasurer Debt Repayment">Treasurer Debt Repayment (Discrepancy recovery)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Notes / CIC Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip # or CIC ref"
                  value={depNotes}
                  onChange={(e) => setDepNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500"
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update CIC Statement Inputs Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Update Monthly CIC Figures</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateInputsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Total Deposited Ever (KES)</label>
                <input
                  type="number"
                  step="any"
                  value={tempDeposited}
                  onChange={(e) => setTempDeposited(Number(e.target.value.replace(/,/g, '')))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Current MMF Balance (KES)</label>
                <input
                  type="number"
                  step="any"
                  value={tempBalance}
                  onChange={(e) => setTempBalance(Number(e.target.value.replace(/,/g, '')))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Cumulative Interest (KES)</label>
                <input
                  type="number"
                  step="any"
                  value={tempInterest}
                  onChange={(e) => setTempInterest(Number(e.target.value.replace(/,/g, '')))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Save Figures
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
