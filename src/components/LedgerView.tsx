import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { PaymentType } from '../types';
import { PlusCircle, CheckCircle, XCircle, Search, Download, Smartphone, AlertCircle, Check } from 'lucide-react';

export const LedgerView: React.FC = () => {
  const store = useChamaStore();
  const payments = store.getLedgerEntries();
  const members = store.getMembers();
  const membership = store.getCurrentMembership();

  const isTreasurer = membership?.role === 'Treasurer 1' || 
                      membership?.role === 'Treasurer 2' || 
                      membership?.role === 'Treasurer';

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showIPaidModal, setShowIPaidModal] = useState<boolean>(false);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New payment form state
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [amount, setAmount] = useState<number>(1200);
  const [paymentType, setPaymentType] = useState<PaymentType>('Contribution');
  const [dateReceived, setDateReceived] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [periodNotes, setPeriodNotes] = useState<string>('');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.periodNotes && p.periodNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.mpesaCode && p.mpesaCode.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (typeFilter === 'All') return true;
    if (typeFilter === 'Pending') return p.status === 'Pending Confirmation';
    return p.type === typeFilter;
  });

  const handleConfirm = (entryId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = store.confirmPayment(entryId);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to confirm payment');
    } else {
      setSuccessMessage('Payment entry confirmed successfully by second treasurer.');
    }
  };

  const handleReject = (entryId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    store.rejectPayment(entryId, reason);
    setSuccessMessage('Payment entry marked as rejected.');
  };

  const handleIPaidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaCode) {
      alert('Please enter M-Pesa transaction reference code.');
      return;
    }
    const memId = membership?.memberId || selectedMemberId;
    const res = store.recordPayment({
      memberId: memId,
      amount,
      type: 'Contribution',
      dateReceived,
      periodNotes: `M-Pesa payment (${mpesaCode})`,
      mpesaCode,
      status: 'Pending Confirmation'
    });

    if (res.success) {
      setShowIPaidModal(false);
      setMpesaCode('');
      setSuccessMessage('Your "I Paid" submission was recorded and is now pending two-treasurer confirmation.');
    }
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.recordPayment({
      memberId: selectedMemberId,
      amount,
      type: paymentType,
      dateReceived,
      periodNotes,
      status: 'Pending Confirmation'
    });

    if (res.success) {
      setShowRecordModal(false);
      setPeriodNotes('');
      setSuccessMessage('Payment recorded! Remember: a different treasurer must confirm this entry.');
    }
  };

  const exportCSV = () => {
    const headers = ['No.', 'Date', 'Member Name', 'Amount (KES)', 'Type', 'Period/Notes', 'Financial Year', 'Status'];
    const rows = filteredPayments.map((p, idx) => [
      idx + 1,
      p.dateReceived,
      `"${p.memberName}"`,
      p.amount,
      p.type,
      `"${p.periodNotes || ''}"`,
      p.financialYear,
      p.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hicousins_payments_${store.getAsOfDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = payments.filter(p => p.status === 'Pending Confirmation').length;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">Payments Ledger ({payments.length} entries)</h2>
          <p className="text-xs text-slate-500">Append-only audit trail · Two-treasurer confirmation flow</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member "I Paid" button */}
          <button
            onClick={() => setShowIPaidModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>I Paid (M-Pesa)</span>
          </button>

          {/* Treasurer Record Payment */}
          {isTreasurer && (
            <button
              onClick={() => setShowRecordModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Export button */}
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by member name, notes, or M-Pesa code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
          {['All', 'Contribution', 'Admin Income', 'Debt Repayment', 'Penalty Payment', 'Penalty Charged'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                typeFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setTypeFilter('Pending')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-1 ${
              typeFilter === 'Pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>Pending ({pendingCount})</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Member Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                <th className="py-2.5 px-3">Period / Notes</th>
                <th className="py-2.5 px-3">FY</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isTreasurer && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">{p.dateReceived}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{p.memberName}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.type === 'Contribution'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : p.type === 'Penalty Payment'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : p.type === 'Admin Income'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        : p.type === 'Debt Repayment'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {p.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                    {p.periodNotes || '—'}
                    {p.mpesaCode && <span className="ml-1 text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded">Ref: {p.mpesaCode}</span>}
                    {p.status === 'Pending Confirmation' && store.getCurrentGroup()?.settings.pilot_mode === 'A' && (
                      <span className="ml-1 text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded">
                        Not yet in official sheet
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{p.financialYear}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'Pending Confirmation'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  {isTreasurer && (
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {p.status === 'Pending Confirmation' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleConfirm(p.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Confirm payment (Must be different treasurer)"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Reject payment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Locked</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={isTreasurer ? 8 : 7} className="py-8 text-center text-slate-400">
                    No transactions matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member "I Paid" Modal */}
      {showIPaidModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Submit "I Paid" Notification</h3>
              <button onClick={() => setShowIPaidModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleIPaidSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Paying Member</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.memberNo}. {m.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Amount (KES)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 1200"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value.replace(/,/g, '')))}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">M-Pesa Confirmation Code</label>
                <input
                  type="text"
                  placeholder="e.g. QK8912KL90"
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Date Sent</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowIPaidModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500"
                >
                  Submit Payment Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Treasurer Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Payment Entry</h3>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Member Name</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.memberNo}. {m.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 1200"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value.replace(/,/g, '')))}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="Contribution">Contribution</option>
                    <option value="Admin Income">Admin Income</option>
                    <option value="Debt Repayment">Debt Repayment</option>
                    <option value="Penalty Payment">Penalty Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Date Received</label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Period / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Jan-2027 or Treasurer Debt Instalment"
                  value={periodNotes}
                  onChange={(e) => setPeriodNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ Dual-control rule: Another treasurer will be required to confirm this entry before it affects shares.
              </p>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
