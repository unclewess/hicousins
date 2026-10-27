import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface ClaimProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimProfileModal: React.FC<ClaimProfileModalProps> = ({ isOpen, onClose }) => {
  const store = useChamaStore();
  const members = store.getMembers();
  const group = store.getCurrentGroup();

  const [mode, setMode] = useState<'claim' | 'new'>('claim');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [newFullName, setNewFullName] = useState<string>('');
  const [googleEmail, setGoogleEmail] = useState<string>('my.name@gmail.com');
  const [phone, setPhone] = useState<string>('+254700000000');
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !group) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      alert('Please accept the Kenya Data Protection Act 2019 consent before submitting.');
      return;
    }

    if (mode === 'claim') {
      const targetMember = members.find(m => m.id === selectedMemberId);
      if (!targetMember) return;
      store.loginWithGoogle(googleEmail, targetMember.fullName);
      store.claimProfile(targetMember.id, targetMember.fullName);
    } else {
      if (!newFullName) return;
      store.loginWithGoogle(googleEmail, newFullName);
      store.claimProfile('new-request', newFullName);
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Join {group.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Request Submitted</h4>
            <p className="text-xs text-slate-600 leading-relaxed px-4">
              Your request has been queued for official verification. Once approved by the President or Secretary, your phone will link to your profile and you will gain full statement access.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              Continue to App
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Toggle Mode */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('claim')}
                className={`flex-1 py-1.5 text-center rounded-md font-semibold transition ${
                  mode === 'claim' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Claim Existing Profile
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`flex-1 py-1.5 text-center rounded-md font-semibold transition ${
                  mode === 'new' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Request to Join as New
              </button>
            </div>

            {mode === 'claim' ? (
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Select Your Name from Roster:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.memberNo}. {m.fullName} ({m.status})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  The initial group roster starts without phone numbers; this approved claim links your phone to your account.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-slate-600 font-medium mb-1">Your Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Otieno"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Google Account Email (Free Pilot Login):
              </label>
              <input
                type="email"
                placeholder="name@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Phone Number (Optional for SMS/WhatsApp notices):
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono"
              />
            </div>

            {/* Kenya Data Protection Act 2019 Consent */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  required
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I consent to {group.name} processing my name, phone number, and financial statements in compliance with the <strong>Kenya Data Protection Act 2019</strong>.
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm"
              >
                Submit for Approval
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
