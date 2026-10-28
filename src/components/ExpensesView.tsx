import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { ExpenseCategory } from '../types';
import { calculateExpensesBreakdown } from '../lib/calculations';
import { PlusCircle, CheckCircle, XCircle, Search, Camera, AlertCircle, Check } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const store = useChamaStore();
  const expenses = store.getExpenses();
  const membership = store.getCurrentMembership();

  const isTreasurer = membership?.role && [
    'Treasurer 1', 'Treasurer 2', 'Treasurer', 'President'
  ].includes(membership.role);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Expense form state
  const [category, setCategory] = useState<ExpenseCategory>('Transaction Cost');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(50);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [authorizedBy, setAuthorizedBy] = useState('Wesley');
  const [notesReceipt, setNotesReceipt] = useState('');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState('');

  const { totalExpenses, byCategory } = calculateExpensesBreakdown(expenses);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notesReceipt && e.notesReceipt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.authorizedBy && e.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (categoryFilter === 'All') return true;
    if (categoryFilter === 'Pending') return e.status === 'Pending Confirmation';
    return e.category === categoryFilter;
  });

  const handleConfirm = (expId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = store.confirmExpense(expId);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to confirm expense');
    } else {
      setSuccessMessage('Expense confirmed successfully by second treasurer.');
    }
  };

  const handleReject = (expId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    store.rejectExpense(expId, reason);
    setSuccessMessage('Expense marked as rejected.');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.recordExpense({
      category,
      description,
      amount,
      date,
      authorizedBy,
      notesReceipt,
      receiptPhotoUrl
    });

    if (res.success) {
      setShowAddModal(false);
      setDescription('');
      setNotesReceipt('');
      setSuccessMessage('Expense recorded! A different treasurer must confirm this entry.');
    } else {
      setErrorMessage(res.error || 'Failed to record expense');
    }
  };

  const pendingCount = expenses.filter(e => e.status === 'Pending Confirmation').length;

  return (
    <div className="space-y-4">
      {/* Alert Notifications */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Expenses</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            KES {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} recorded payments OUT</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Transaction Costs</span>
          <div className="text-xl font-bold text-slate-800 mt-1 font-mono">
            KES {byCategory['Transaction Cost'].toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">MMF deposit & transfer fees</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Other Group Expenses</span>
          <div className="text-xl font-bold text-slate-800 mt-1 font-mono">
            KES {byCategory['Other Group Expenses'].toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Withholding tax & deductions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Audit Effect</span>
          <div className="text-sm font-semibold text-emerald-700 mt-1">
            Reduces Net Fund Value
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Shared proportionally at payout</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">Group Expenses Log</h2>
          <p className="text-xs text-slate-500">Record all money paid out · Two-treasurer dual confirmation</p>
        </div>

        {isTreasurer && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by description, notes, or authorizer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
          {['All', 'Transaction Cost', 'Other Group Expenses', 'Group Registration Fees', 'Meeting Expenses', 'Communication'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                categoryFilter === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setCategoryFilter('Pending')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-1 ${
              categoryFilter === 'Pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>Pending ({pendingCount})</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount (KES)</th>
                <th className="py-2.5 px-3">Authorized By</th>
                <th className="py-2.5 px-3">Notes / Receipt</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isTreasurer && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{e.expenseNo}</td>
                  <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">{e.date}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{e.description}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                    {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{e.authorizedBy || '—'}</td>
                  <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-xs">{e.notesReceipt || '—'}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      e.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : e.status === 'Pending Confirmation'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  {isTreasurer && (
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {e.status === 'Pending Confirmation' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleConfirm(e.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Confirm expense (Must be different treasurer)"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(e.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Reject expense"
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
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={isTreasurer ? 9 : 8} className="py-8 text-center text-slate-400">
                    No expense records matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Group Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Transaction Cost">Transaction Cost (MMF deposit / transfer fees)</option>
                  <option value="Group Registration Fees">Group Registration Fees</option>
                  <option value="Meeting Expenses">Meeting Expenses</option>
                  <option value="Communication">Communication (SMS / Airtime)</option>
                  <option value="Other Group Expenses">Other Group Expenses (Tax / Bank charges)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit to MMF fee or Withholding tax"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 56.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value.replace(/,/g, '')))}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Authorized By</label>
                <input
                  type="text"
                  placeholder="e.g. Wesley"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Notes / Receipt Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Receipt #12345 or M-Pesa fee statement"
                  value={notesReceipt}
                  onChange={(e) => setNotesReceipt(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              {/* Photo Upload Simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-slate-600 font-medium flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Attach Receipt Photo</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptPhotoUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-[11px] text-slate-500"
                />
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ Dual control: A different treasurer must confirm this expense before it is officially recorded in the audit.
              </p>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
