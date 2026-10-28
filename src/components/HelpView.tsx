import React, { useState } from 'react';
import { NDHUHULU_GUIDE_SECTIONS } from '../data/ndhuhuluRawData';
import { HelpCircle, ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';

export const HelpView: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start space-x-3">
          <HelpCircle className="w-8 h-8 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold">Help & Guide</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How to use hiCousins — recording payments, understanding your statement, and Ndhuhulu rules.
            </p>
          </div>
        </div>
      </div>

      {/* Quick contacts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quick Contacts</p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:+254700000000"
            className="flex items-center space-x-2 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold">Call Treasurer</span>
          </a>
          <a
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-3 py-2.5 bg-green-50 hover:bg-green-100 text-green-800 rounded-xl transition"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold">WhatsApp Group</span>
          </a>
        </div>
      </div>

      {/* FAQ / Guide Accordion */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">How It Works</p>
        {NDHUHULU_GUIDE_SECTIONS.map((section, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === idx ? null : idx)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <span className="text-sm font-bold text-slate-800">{section.title}</span>
              {openSection === idx
                ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {openSection === idx && (
              <div className="px-4 pb-4 space-y-3.5 border-t border-slate-50 pt-3">
                {section.items.map((item, i) => (
                  <div key={i} className="flex space-x-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[9px] font-bold text-emerald-700 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-0.5">{item.subtitle}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* App info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center">
        <p className="text-[11px] text-slate-400">hiCousins v1.0 · Built for Ndhuhulu Self-Help Group</p>
        <p className="text-[10px] text-slate-300 mt-0.5">Kenya Data Protection Act 2019 compliant</p>
      </div>
    </div>
  );
};
