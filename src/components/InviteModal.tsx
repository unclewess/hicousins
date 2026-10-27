import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import { Share2, Copy, Check, RefreshCw, QrCode, ShieldAlert } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const store = useChamaStore();
  const group = store.getCurrentGroup();
  const membership = store.getCurrentMembership();
  const isOfficial = membership?.role === 'President' || membership?.role === 'Vice President';

  const [copied, setCopied] = useState(false);

  if (!isOpen || !group) return null;

  const origin = window.location.origin;
  const inviteLink = `${origin}/join/${group.inviteCode}`;
  const whatsappMessage = encodeURIComponent(
    `Hello! Join ${group.name} on hiCousins to track member statements, contributions, and meetings:\n${inviteLink}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the invite link? Previous invite links will stop working immediately.')) {
      store.resetInviteCode();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Invite Members</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Share this secure invite link with members via WhatsApp. When they click, they can claim their profile or request new membership.
          </p>

          {/* WhatsApp Action Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Share to WhatsApp</span>
          </a>

          {/* Copy Link Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[11px] text-slate-700 select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Simulated QR Code Canvas/Display */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2">
            <div className="w-36 h-36 bg-white p-2 border border-slate-300 rounded-lg flex items-center justify-center shadow-inner">
              <QrCode className="w-28 h-28 text-slate-800" />
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Scan QR to join {group.name}</span>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Knowledge Joining:</strong> New users cannot view balances or financial statements until their profile claim is approved by an official.
            </span>
          </div>

          {/* Admin Reset Link */}
          {isOfficial && (
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-slate-500">Need to revoke current link?</span>
              <button
                onClick={handleReset}
                className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Invite Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
