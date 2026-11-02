import React, { useState } from 'react';
import { useChamaStore } from '../services/store';
import {
  Motion, ElectionCandidate,
  AttendanceStatus, WelfareCategory, NoticePriority,
  NoticeCategory, RoleType
} from '../types';
import {
  Calendar, CheckCircle, Vote, HeartHandshake, Bell,
  PlusCircle, ShieldAlert, Lock, Eye, AlertCircle,
  Users, Check, Clock, UserCheck
} from 'lucide-react';

type GovernanceSubTab = 'meetings' | 'voting' | 'welfare' | 'notices';

export const GovernanceView: React.FC = () => {
  const store = useChamaStore();
  const membership = store.getCurrentMembership();
  const members = store.getMembers();

  const isPresident = membership?.role === 'President';
  const isChiefWhip = membership?.role === 'Chief Whip 1' || membership?.role === 'Chief Whip 2';
  const isAuditor = membership?.role === 'Auditor' || membership?.role === 'Auditor 2';
  const isOfficial = !!(membership?.role && [
    'President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer',
    'Secretary', 'Organizing Secretary', 'Chief Whip 1', 'Chief Whip 2',
    'Auditor', 'Auditor 2'
  ].includes(membership.role));

  const [activeTab, setActiveTab] = useState<GovernanceSubTab>('voting');

  // Modals state
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showNewMotionModal, setShowNewMotionModal] = useState(false);
  const [showNewWelfareModal, setShowNewWelfareModal] = useState(false);
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false);
  const [viewingCaseNotesId, setViewingCaseNotesId] = useState<string | null>(null);
  const [unlockedNotes, setUnlockedNotes] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Meetings state
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const meetings = store.getMeetings();
  const activeMeeting = meetings.find(m => m.id === selectedMeetingId) || meetings[0];

  // Voting state
  const motions = store.getMotions();
  const [votingChoice, setVotingChoice] = useState<string>('');

  // Notices state
  const notices = store.getNotices();
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);

  // Welfare state
  const welfareCases = store.getWelfareCases();

  // Handlers
  const handleCastVote = (motion: Motion) => {
    if (!membership?.memberId) {
      alert('You must have an approved member profile to vote.');
      return;
    }
    if (!votingChoice) {
      alert('Please select an option or candidate to cast your vote.');
      return;
    }
    const res = store.castVote(motion.id, membership.memberId, votingChoice);
    if (!res.success) {
      alert(`Cannot vote: ${res.error}`);
    } else {
      setVotingChoice('');
    }
  };

  const handleCloseMotion = (motionId: string) => {
    if (confirm('Are you sure you want to close this ballot? Once closed, votes are immutable and election winners take office.')) {
      const res = store.closeMotion(motionId);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleViewWelfareNotes = (caseId: string) => {
    setViewingCaseNotesId(caseId);
    setNotesError(null);
    setUnlockedNotes(null);
    const res = store.viewWelfareCaseNotes(caseId);
    if (res.success && res.notes) {
      setUnlockedNotes(res.notes);
    } else {
      setNotesError(res.error || 'Access denied');
    }
  };

  const handleSendArrearsReminders = () => {
    const res = store.sendArrearsReminders(['In-App', 'SMS']);
    setReminderStatus(`Dispatched arrears reminders to ${res.count} members.`);
    setTimeout(() => setReminderStatus(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Governance &amp; Community</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 3 Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            One member = one vote · Secret ballots · Welfare privacy · Attendance check-in
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveTab('voting')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'voting' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Voting &amp; Elections</span>
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'meetings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Meetings</span>
          </button>
          <button
            onClick={() => setActiveTab('welfare')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'welfare' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Welfare &amp; Disputes</span>
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'notices' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notices</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: VOTING & ELECTIONS */}
      {activeTab === 'voting' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Vote className="w-4 h-4 text-emerald-600" />
              <span>Active Ballots &amp; Motions ({motions.length})</span>
            </h2>
            {isChiefWhip && (
              <button
                onClick={() => setShowNewMotionModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Motion / Election</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {motions.map(motion => {
              const turnout = store.getTurnout(motion.id);
              const results = store.getMotionResults(motion.id);
              const hasVoted = membership?.memberId ? turnout.some(t => t.memberId === membership.memberId) : false;
              const canVoteCheck = membership?.memberId ? store.canVote(membership.memberId, motion.id) : { eligible: false, reason: 'Login required' };
              const isClosed = motion.status === 'Closed';

              return (
                <div key={motion.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isClosed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {motion.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {motion.motionType}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{motion.ballotType} Ballot</span>
                        </span>
                        {motion.targetRole && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                            Role: {motion.targetRole}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{motion.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{motion.description}</p>
                    </div>

                    {(isChiefWhip || isPresident) && !isClosed && (
                      <button
                        onClick={() => handleCloseMotion(motion.id)}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition shrink-0"
                      >
                        Close Ballot
                      </button>
                    )}
                  </div>

                  {/* Voter Status & Participation */}
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>
                        <strong>{turnout.length}</strong> votes cast · Turnout: {turnout.length} members
                      </span>
                    </div>
                    {hasVoted ? (
                      <span className="text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>You have voted (choice encrypted &amp; private)</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        {canVoteCheck.eligible ? 'You have not cast your ballot yet' : canVoteCheck.reason}
                      </span>
                    )}
                  </div>

                  {/* Active Voting Form */}
                  {!isClosed && !hasVoted && canVoteCheck.eligible && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-emerald-900">Cast Your Vote (One Member = One Vote):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {motion.motionType === 'Election' && motion.candidates ? (
                          motion.candidates.map(candidate => (
                            <label
                              key={candidate.memberId}
                              className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                votingChoice === candidate.memberId ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white hover:bg-slate-50 border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`vote-${motion.id}`}
                                value={candidate.memberId}
                                checked={votingChoice === candidate.memberId}
                                onChange={() => setVotingChoice(candidate.memberId)}
                                className="hidden"
                              />
                              <div>
                                <p className="font-bold">{candidate.memberName}</p>
                                {candidate.statement && <p className="text-[11px] opacity-80">{candidate.statement}</p>}
                              </div>
                            </label>
                          ))
                        ) : (
                          motion.options.map(option => (
                            <label
                              key={option}
                              className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                                votingChoice === option ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`vote-${motion.id}`}
                                value={option}
                                checked={votingChoice === option}
                                onChange={() => setVotingChoice(option)}
                                className="hidden"
                              />
                              <span>{option}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <button
                        onClick={() => handleCastVote(motion)}
                        className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Submit Secret Ballot
                      </button>
                    </div>
                  )}

                  {/* Results Display (Live or Closed) */}
                  {(isClosed || isAuditor || isOfficial) && (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{isClosed ? 'Final Official Results' : 'Live Vote Tally (Auditor View)'}</span>
                        {results.winnerOption && (
                          <span className="text-emerald-700 font-bold">
                            Winner: {motion.candidates?.find(c => c.memberId === results.winnerOption)?.memberName || results.winnerOption}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(results.resultsByOption).map(([opt, count]) => {
                          const percent = results.totalVotes > 0 ? Math.round((count / results.totalVotes) * 100) : 0;
                          const optLabel = motion.candidates?.find(c => c.memberId === opt)?.memberName || opt;
                          return (
                            <div key={opt} className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-600">
                                <span>{optLabel}</span>
                                <span className="font-bold">{count} votes ({percent}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: MEETINGS & ATTENDANCE */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Chama Meetings ({meetings.length})</span>
            </h2>
            {isOfficial && (
              <button
                onClick={() => setShowNewMeetingModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Schedule Meeting</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meetings list */}
            <div className="space-y-2 md:col-span-1">
              {meetings.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    activeMeeting?.id === m.id ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1 opacity-80">
                    <span>{new Date(m.meetingDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="uppercase font-bold text-[9px]">{m.status}</span>
                  </div>
                  <h4 className="text-xs font-bold">{m.title}</h4>
                </div>
              ))}
            </div>

            {/* Meeting Detail & Attendance check-in */}
            {activeMeeting && (
              <div className="md:col-span-2 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                    {activeMeeting.meetingType} Meeting
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{activeMeeting.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(activeMeeting.meetingDate).toLocaleString('en-KE')}</span>
                  </p>
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                    <strong>Agenda:</strong> {activeMeeting.agenda}
                  </div>
                </div>

                {/* Attendance table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Attendance Register</span>
                    </h4>
                    {isChiefWhip && (
                      <span className="text-[10px] text-emerald-700 font-bold">Chief Whip Check-In Active</span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                    {members.filter(m => m.status === 'Active').map(member => {
                      const attRecords = store.getMeetingAttendance(activeMeeting.id);
                      const currentStatus = attRecords.find(a => a.memberId === member.id)?.status || 'Absent';

                      return (
                        <div key={member.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <p className="font-bold text-slate-900">{member.fullName}</p>
                            <p className="text-[10px] text-slate-400">No. {member.memberNo}</p>
                          </div>
                          {isChiefWhip ? (
                            <div className="flex items-center space-x-1">
                              {(['Present', 'Absent', 'Apology', 'Late'] as AttendanceStatus[]).map(st => (
                                <button
                                  key={st}
                                  onClick={() => store.recordAttendance(activeMeeting.id, member.id, st)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                    currentStatus === st ? 'bg-emerald-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              currentStatus === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {currentStatus}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: WELFARE & DISPUTES */}
      {activeTab === 'welfare' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-rose-600" />
                <span>Welfare &amp; Case Support ({welfareCases.length})</span>
              </h2>
              <p className="text-xs text-slate-500">Confidential emergency kitty assistance and dispute resolution</p>
            </div>
            {isOfficial && (
              <button
                onClick={() => setShowNewWelfareModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Case</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {welfareCases.map(c => {
              const isNotesUnlocked = viewingCaseNotesId === c.id && unlockedNotes;
              const hasDeletionRequested = c.deletionRequested;

              return (
                <div key={c.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-400">{c.caseNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {c.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{c.title}</h3>
                      {c.assistanceAmount && (
                        <p className="text-xs text-rose-700 font-bold mt-0.5">
                          Assistance Grant: KES {c.assistanceAmount.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewWelfareNotes(c.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Private Notes</span>
                    </button>
                  </div>

                  {/* Private Notes Section */}
                  {viewingCaseNotesId === c.id && (
                    <div className="mt-2 p-3.5 rounded-xl border text-xs space-y-2 transition">
                      {notesError ? (
                        <div className="bg-red-50 text-red-700 p-2.5 rounded-lg flex items-center space-x-2 font-medium">
                          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                          <span>{notesError}</span>
                        </div>
                      ) : isNotesUnlocked ? (
                        <div className="bg-slate-50 text-slate-800 p-3 rounded-lg border border-slate-200">
                          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                            Confidential Case Notes (Access Logged)
                          </p>
                          <p className="leading-relaxed whitespace-pre-wrap">{unlockedNotes}</p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Member privacy rights: deletion request */}
                  <div className="border-t border-slate-50 pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Kenya Data Protection Act 2019: Member data privacy strictly enforced.</span>
                    {hasDeletionRequested ? (
                      <span className="text-amber-700 font-bold">Deletion Requested by Member</span>
                    ) : (
                      <button
                        onClick={() => store.requestWelfareCaseDeletion(c.id)}
                        className="text-slate-400 hover:text-red-600 transition text-[11px]"
                      >
                        Request Case Deletion
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: NOTICES & REMINDERS */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>Notice Board &amp; Reminders</span>
              </h2>
              <p className="text-xs text-slate-500">Announcements, SMS alerts and payment reminders</p>
            </div>
            <div className="flex items-center space-x-2">
              {isChiefWhip && (
                <button
                  onClick={handleSendArrearsReminders}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Dispatch Arrears SMS</span>
                </button>
              )}
              {isOfficial && (
                <button
                  onClick={() => setShowNewNoticeModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Notice</span>
                </button>
              )}
            </div>
          </div>

          {reminderStatus && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center space-x-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{reminderStatus}</span>
            </div>
          )}

          <div className="space-y-3">
            {notices.map(notice => (
              <div key={notice.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      notice.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                      notice.priority === 'Important' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {notice.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      {notice.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Via: {notice.channels.join(', ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(notice.publishedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-400 flex justify-between">
                  <span>Author: {notice.authorName}</span>
                  <span>Target: {notice.targetAudience}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NEW MOTION / ELECTION */}
      {showNewMotionModal && (
        <CreateMotionModal
          onClose={() => setShowNewMotionModal(false)}
          members={members}
        />
      )}

      {/* MODAL: NEW MEETING */}
      {showNewMeetingModal && (
        <CreateMeetingModal onClose={() => setShowNewMeetingModal(false)} />
      )}

      {/* MODAL: NEW WELFARE */}
      {showNewWelfareModal && (
        <CreateWelfareModal onClose={() => setShowNewWelfareModal(false)} />
      )}

      {/* MODAL: NEW NOTICE */}
      {showNewNoticeModal && (
        <CreateNoticeModal onClose={() => setShowNewNoticeModal(false)} />
      )}
    </div>
  );
};

/* Modal: Create Motion / Election */
const CreateMotionModal: React.FC<{
  onClose: () => void;
  members: import('../types').Member[];
}> = ({ onClose, members }) => {
  const store = useChamaStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [motionType, setMotionType] = useState<import('../types').MotionType>('General');
  const [targetRole, setTargetRole] = useState<RoleType>('Treasurer 2');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [returningOfficerId, setReturningOfficerId] = useState<string>('mem-ndh-040'); // Eugene Nyasio
  const [error, setError] = useState<string | null>(null);

  const activeMembers = members.filter(m => m.status === 'Active');

  const handleSubmit = () => {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }

    const candidates: ElectionCandidate[] = selectedCandidateIds.map(id => {
      const m = members.find(mem => mem.id === id);
      return { memberId: id, memberName: m?.fullName || 'Candidate' };
    });

    const options = motionType === 'Election'
      ? selectedCandidateIds
      : ['Yes', 'No', 'Abstain'];

    const res = store.createMotion({
      title,
      description,
      motionType,
      ballotType: 'Secret',
      targetRole: motionType === 'Election' ? targetRole : undefined,
      options,
      candidates: motionType === 'Election' ? candidates : undefined,
      returningOfficerId,
      openUntil: new Date(Date.now() + 14 * 86400000).toISOString()
    });

    if (!res.success) {
      setError(res.error || 'Failed to create motion');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-slate-900 text-sm">Create New Ballot / Election</h3>
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. By-Election for Assistant Treasurer"
              className="w-full border rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Type</label>
            <select
              value={motionType}
              onChange={e => setMotionType(e.target.value as import('../types').MotionType)}
              className="w-full border rounded-xl p-2.5 bg-white"
            >
              <option value="General">General Motion</option>
              <option value="Disbursement">Disbursement Vote</option>
              <option value="Election">Officer Election</option>
            </select>
          </div>

          {motionType === 'Election' && (
            <>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Official Role</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value as RoleType)}
                  className="w-full border rounded-xl p-2.5 bg-white"
                >
                  <option value="Treasurer 2">Treasurer 2</option>
                  <option value="Vice President">Vice President</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Auditor 2">Auditor 2</option>
                  <option value="Chief Whip 2">Chief Whip 2</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Candidates (Must be eligible &le; 2 mo behind)</label>
                <div className="max-h-36 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {activeMembers.map(m => {
                    const check = store.canNominateCandidate(m.id);
                    return (
                      <label key={m.id} className={`flex items-center justify-between p-1.5 rounded text-[11px] ${
                        check.eligible ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            disabled={!check.eligible}
                            checked={selectedCandidateIds.includes(m.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedCandidateIds([...selectedCandidateIds, m.id]);
                              else setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== m.id));
                            }}
                          />
                          <span>{m.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{check.eligible ? 'Eligible' : check.reason}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Returning Officer (Administering Election)</label>
            <select
              value={returningOfficerId}
              onChange={e => setReturningOfficerId(e.target.value)}
              className="w-full border rounded-xl p-2.5 bg-white"
            >
              {activeMembers.filter(m => m.fullName.includes('Eugene') || m.fullName.includes('Noel')).map(m => (
                <option key={m.id} value={m.id}>{m.fullName} (Official)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border rounded-xl p-2.5"
            />
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl text-xs font-bold text-slate-600">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Create Motion</button>
        </div>
      </div>
    </div>
  );
};

/* Modal: Create Meeting */
const CreateMeetingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useChamaStore();
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('2026-11-20T14:00');
  const [agenda, setAgenda] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    store.createMeeting({
      title,
      meetingDate: new Date(meetingDate).toISOString(),
      agenda,
      meetingType: 'Regular'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Schedule Meeting</h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Meeting Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Date &amp; Time</label>
            <input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Agenda</label>
            <textarea rows={3} value={agenda} onChange={e => setAgenda(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
        </div>
        <div className="flex space-x-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl text-xs font-bold text-slate-600">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Schedule</button>
        </div>
      </div>
    </div>
  );
};

/* Modal: Create Welfare Case */
const CreateWelfareModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useChamaStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WelfareCategory>('Illness');
  const [privateNotes, setPrivateNotes] = useState('');
  const [assistanceAmount, setAssistanceAmount] = useState('5000');

  const handleSubmit = () => {
    if (!title.trim()) return;
    store.createWelfareCase({
      title,
      category,
      privateNotes,
      priority: 'High',
      assistanceAmount: Number(assistanceAmount) || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Open Welfare / Dispute Case</h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Case Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as WelfareCategory)} className="w-full border rounded-xl p-2.5 bg-white">
              <option value="Illness">Illness / Hospitalization</option>
              <option value="Bereavement">Bereavement</option>
              <option value="Financial Emergency">Financial Emergency</option>
              <option value="Dispute">Dispute</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Emergency Grant (KES)</label>
            <input type="number" value={assistanceAmount} onChange={e => setAssistanceAmount(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Confidential Case Notes (Restricted to Chief Whips &amp; President)</label>
            <textarea rows={3} value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
        </div>
        <div className="flex space-x-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl text-xs font-bold text-slate-600">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Create Case</button>
        </div>
      </div>
    </div>
  );
};

/* Modal: Create Notice */
const CreateNoticeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useChamaStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('General');
  const [priority, setPriority] = useState<NoticePriority>('Normal');

  const handleSubmit = () => {
    if (!title.trim()) return;
    store.postNotice({
      title,
      content,
      category,
      priority,
      channels: ['In-App', 'WhatsApp'],
      targetAudience: 'All'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Post Official Notice</h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as NoticeCategory)} className="w-full border rounded-xl p-2.5 bg-white">
              <option value="General">General Announcement</option>
              <option value="Meeting">Meeting Notice</option>
              <option value="Arrears">Arrears Reminder</option>
              <option value="Election">Election Notice</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as NoticePriority)} className="w-full border rounded-xl p-2.5 bg-white">
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Message Content</label>
            <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded-xl p-2.5" />
          </div>
        </div>
        <div className="flex space-x-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded-xl text-xs font-bold text-slate-600">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Post Notice</button>
        </div>
      </div>
    </div>
  );
};
