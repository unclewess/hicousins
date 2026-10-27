import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { UserCheck, ShieldCheck, Plus, CheckCircle, Search } from 'lucide-react';
import { MemberStatus } from '../types';

export const MembersView: React.FC = () => {
  const store = useChamaStore();
  const members = store.getMembers();
  const memberships = store.getMemberships();
  const roleTerms = store.getRoleTerms();
  const membership = store.getCurrentMembership();

  const isOfficial = membership?.role && [
    'President', 'Vice President', 'Secretary', 'Organizing Secretary',
    'Treasurer 1', 'Treasurer 2', 'Treasurer', 'Auditor'
  ].includes(membership.role);

  const [activeTab, setActiveTab] = useState<'roster' | 'pending' | 'roles'>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Member Form
  const [newName, setNewName] = useState('');
  const [newJoinDate, setNewJoinDate] = useState('2026-10');
  const [newRegFee, setNewRegFee] = useState(200);
  const [newStatus] = useState<MemberStatus>('Active');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const pendingMemberships = memberships.filter(m => m.status === 'pending_approval');

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.phone && m.phone.includes(searchTerm)) ||
    (m.beneficiaryNotes && m.beneficiaryNotes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApprove = (mId: string) => {
    const res = store.approveMembership(mId);
    if (!res.success) alert(res.error);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const res = store.addMember({
      fullName: newName,
      joinDate: newJoinDate,
      regFee: newRegFee,
      status: newStatus,
      phone: newPhone,
      beneficiaryNotes: newNotes
    });
    if (res.success) {
      setShowAddModal(false);
      setNewName('');
      setNewNotes('');
      setNewPhone('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'roster' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Roster ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pending Approvals ({pendingMemberships.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'roles' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Elected Officials ({roleTerms.length})
          </button>
        </div>

        {isOfficial && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Roster Tab */}
      {activeTab === 'roster' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search member roster..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">No.</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Join Date</th>
                  <th className="py-2.5 px-3 text-right">Reg Fee</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Beneficiary / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{m.memberNo}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{m.fullName}</td>
                    <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{m.phone || '— Unclaimed —'}</td>
                    <td className="py-2 px-3 text-slate-600">{m.joinDate}</td>
                    <td className="py-2 px-3 text-right font-mono">KES {m.regFee}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : m.status === 'Left'
                          ? 'bg-slate-100 text-slate-800'
                          : m.status === 'Deceased'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-xs">{m.beneficiaryNotes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Member Onboarding & Claim Approvals</h3>
              <p className="text-xs text-slate-500">
                Official authorization required before new users can view group finances or statements.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingMemberships.map(pm => {
              const claimedMember = members.find(m => m.id === pm.memberId);
              return (
                <div key={pm.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs">{pm.claimedName || 'New User'}</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                        Awaiting Verification
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Claiming profile: <strong>{claimedMember?.fullName || 'New Member'}</strong> · User ID: {pm.userId}
                    </p>
                  </div>

                  {isOfficial ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(pm.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Officials Only</span>
                  )}
                </div>
              );
            })}
            {pendingMemberships.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No membership claims or join requests awaiting approval.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roles & Terms Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Elected Group Officials</h3>
            <p className="text-xs text-slate-500">Official roles, term dates, and administrative governance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roleTerms.map(rt => {
              const officialMember = members.find(m => m.id === rt.memberId);
              return (
                <div key={rt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {rt.role}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{officialMember?.fullName}</h4>
                    <p className="text-xs text-slate-500">
                      Term: {rt.startDate} to {rt.endDate || 'Present'}
                    </p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Member to Group</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Join Date (YYYY-MM)</label>
                  <input
                    type="month"
                    value={newJoinDate}
                    onChange={(e) => setNewJoinDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Reg Fee (KES)</label>
                  <input
                    type="number"
                    value={newRegFee}
                    onChange={(e) => setNewRegFee(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+254700000000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Beneficiary / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Next of kin details"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
