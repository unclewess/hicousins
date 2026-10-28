import React, { useState, useRef } from 'react';
import { useChamaStore } from '../services/store';
import { DocumentCategory, DocumentRecord, DocumentVisibility } from '../types';
import {
  FileText, Upload, CheckCircle, XCircle, Search, ChevronDown,
  ChevronUp, Eye, Clock, Lock, BookOpen, Plus, AlertCircle, Trash2, History,
} from 'lucide-react';
import { NDHUHULU_GUIDE_SECTIONS } from '../data/ndhuhuluRawData';

const DOC_CATEGORIES: DocumentCategory[] = [
  'Constitution',
  'Minutes',
  'Audit Reports',
  'MMF Statements',
  'Other',
];

const categoryIcon = (cat: string): React.ReactNode => {
  switch (cat) {
    case 'Constitution':   return <BookOpen className="w-4 h-4" />;
    case 'Audit Reports':  return <Eye className="w-4 h-4" />;
    case 'MMF Statements': return <Clock className="w-4 h-4" />;
    default:               return <FileText className="w-4 h-4" />;
  }
};

const statusBadge = (status: string) => {
  if (status === 'Released')         return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Released</span>;
  if (status === 'Pending approval') return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Pending</span>;
  if (status === 'Rejected')         return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">Rejected</span>;
  return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Draft</span>;
};

/* ─── Upload Modal ──────────────────────────────────────────────────────── */
const UploadModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useChamaStore();
  const [title, setTitle]         = useState('');
  const [category, setCategory]   = useState<DocumentCategory>('Minutes');
  const [visibility, setVisibility] = useState<DocumentVisibility>('All members');
  const [notes, setNotes]         = useState('');
  const [fileName, setFileName]   = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!title.trim())   { setError('Document title is required.'); return; }
    if (!fileName)       { setError('Please select a file.'); return; }
    setError('');
    setSubmitting(true);
    const result = store.uploadDocument({
      title: title.trim(),
      category,
      visibility,
      fileName,
      changeSummary: notes.trim() || 'Initial upload',
    });
    setSubmitting(false);
    if (!result.success) { setError('Upload failed — please try again.'); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-slate-900 flex items-center space-x-2">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload Document</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center space-x-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Document Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Minutes — October 2026 Meeting"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocumentCategory)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as DocumentVisibility)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All members">All Members</option>
                <option value="Officials only">Officials Only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-emerald-400 transition"
            >
              {fileName
                ? <p className="text-xs text-emerald-700 font-medium">{fileName}</p>
                : <>
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">Click to select PDF, DOCX, or image</p>
                  </>
              }
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any context for the approving official…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex space-x-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'Uploading…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── New Version Modal ─────────────────────────────────────────────────── */
const NewVersionModal: React.FC<{ docId: string; docTitle: string; onClose: () => void }> = ({ docId, docTitle, onClose }) => {
  const store = useChamaStore();
  const [fileName, setFileName] = useState('');
  const [notes, setNotes]       = useState('');
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!fileName) { setError('Please select a file.'); return; }
    const result = store.uploadDocumentVersion(docId, { fileName, changeSummary: notes.trim() || undefined });
    if (!result.success) { setError(result.error || 'Failed to upload version.'); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">New Version — {docTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl px-4 py-5 text-center cursor-pointer hover:border-emerald-400 transition"
          >
            {fileName
              ? <p className="text-xs text-emerald-700 font-medium">{fileName}</p>
              : <p className="text-xs text-slate-500">Click to select replacement file</p>
            }
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="What changed in this version?"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="px-5 pb-5 flex space-x-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">Upload Version</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Reject Modal ──────────────────────────────────────────────────────── */
const RejectModal: React.FC<{ docId: string; versionNumber: number; onClose: () => void }> = ({ docId, versionNumber, onClose }) => {
  const store = useChamaStore();
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) { setError('Please provide a rejection reason.'); return; }
    const result = store.rejectDocument(docId, versionNumber, reason.trim());
    if (!result.success) { setError(result.error || 'Failed.'); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold text-slate-900 text-sm">Reject Document</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="px-5 pb-5 flex space-x-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">Reject</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Document Card ─────────────────────────────────────────────────────── */
const DocumentCard: React.FC<{ doc: DocumentRecord; isOfficial: boolean; currentMemberId?: string }> = ({
  doc, isOfficial, currentMemberId,
}) => {
  const store = useChamaStore();
  const [expanded, setExpanded]         = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showReject, setShowReject]     = useState<number | null>(null);

  const latestVersion  = doc.versions[doc.versions.length - 1];
  const pendingVersion = doc.versions.find(v => v.status === 'Pending approval');
  const canApprove     = isOfficial && pendingVersion && pendingVersion.uploadedBy !== currentMemberId;
  const isUploader     = doc.uploadedBy === currentMemberId;

  const handleApprove = () => {
    if (!pendingVersion) return;
    store.approveDocument(doc.id, pendingVersion.versionNumber);
  };
  const handleDelete = () => {
    if (window.confirm('Delete this document permanently?')) store.deleteDocument(doc.id);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
            {categoryIcon(doc.category)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {statusBadge(latestVersion?.status || 'Draft')}
              {doc.visibility === 'Officials only' && (
                <span className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full font-medium">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Officials</span>
                </span>
              )}
              <span className="text-[10px] text-slate-400">
                v{doc.versions.length} · {new Date(latestVersion?.uploadedAt || doc.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-700 p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-3">
          {/* Pending approval banner */}
          {pendingVersion && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-amber-800 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Version {pendingVersion.versionNumber} awaiting approval</span>
              </p>
              {pendingVersion.changeSummary && (
                <p className="text-xs text-amber-700">{pendingVersion.changeSummary}</p>
              )}
              {canApprove && (
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={handleApprove}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => setShowReject(pendingVersion.versionNumber)}
                    className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
              {pendingVersion.uploadedBy === currentMemberId && (
                <p className="text-[10px] text-amber-600 italic">You uploaded this — a different official must approve it.</p>
              )}
            </div>
          )}

          {/* Version history */}
          {doc.versions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center space-x-1">
                <History className="w-3 h-3" />
                <span>Version History</span>
              </p>
              <div className="space-y-1.5">
                {[...doc.versions].reverse().map(v => (
                  <div key={v.versionNumber} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">v{v.versionNumber}</span>
                    {statusBadge(v.status)}
                    <span className="text-slate-400 text-[10px]">
                      {new Date(v.uploadedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official action buttons */}
          {isOfficial && (
            <div className="flex flex-wrap gap-2 pt-1">
              {isUploader && (
                <button
                  onClick={() => setShowNewVersion(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Version</span>
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

      {showNewVersion && (
        <NewVersionModal docId={doc.id} docTitle={doc.title} onClose={() => setShowNewVersion(false)} />
      )}
      {showReject !== null && (
        <RejectModal docId={doc.id} versionNumber={showReject} onClose={() => setShowReject(null)} />
      )}
    </div>
  );
};

/* ─── Learn Tab ─────────────────────────────────────────────────────────── */
const LearnTab: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-base mb-0.5">Financial Education</h3>
        <p className="text-xs text-emerald-200">How Ndhuhulu's finances work — the formulas, rules and why.</p>
      </div>
      {NDHUHULU_GUIDE_SECTIONS.map((section, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === idx ? null : idx)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <span className="text-sm font-bold text-slate-800">{section.title}</span>
            {openSection === idx
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {openSection === idx && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
              {section.items.map((item, i) => (
                <div key={i}>
                  <p className="text-xs font-bold text-emerald-700 mb-0.5">{item.subtitle}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── Main View ─────────────────────────────────────────────────────────── */
export const LearnReportView: React.FC = () => {
  const store      = useChamaStore();
  const membership = store.getCurrentMembership();
  const isOfficial = !!(membership?.role && [
    'President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer',
    'Secretary', 'Organizing Secretary', 'Chief Whip 1', 'Chief Whip 2',
    'Auditor', 'Auditor 1', 'Auditor 2',
  ].includes(membership.role));

  const [activeTab, setActiveTab]   = useState<DocumentCategory | 'Learn'>('Minutes');
  const [search, setSearch]         = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const allDocs     = store.getDocuments();

  // Visibility rules: non-officials only see "All members" docs with a released version
  const visibleDocs = allDocs.filter(doc => {
    if (!isOfficial) {
      if (doc.visibility !== 'All members') return false;
      return doc.versions.some(v => v.status === 'Released');
    }
    return true;
  });

  const tabs: (DocumentCategory | 'Learn')[] = [...DOC_CATEGORIES, 'Learn'];

  const filteredDocs = visibleDocs.filter(doc => {
    if (activeTab === 'Learn') return false;
    if (doc.category !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Documents &amp; Learn</h2>
          <p className="text-xs text-slate-500">Group documents, reports and financial education</p>
        </div>
        {isOfficial && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Search — only for document tabs */}
      {activeTab !== 'Learn' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Tab Bar — scrollable on mobile */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === 'Learn' ? <BookOpen className="w-3.5 h-3.5" /> : categoryIcon(tab)}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* Learn Tab */}
      {activeTab === 'Learn' && <LearnTab />}

      {/* Document tabs */}
      {activeTab !== 'Learn' && (
        filteredDocs.length === 0
          ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No {activeTab} documents yet</p>
              {isOfficial && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                >
                  Upload the first one
                </button>
              )}
            </div>
          )
          : (
            <div className="space-y-3">
              {filteredDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  isOfficial={isOfficial}
                  currentMemberId={membership?.memberId}
                />
              ))}
            </div>
          )
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
};
