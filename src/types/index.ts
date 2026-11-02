export type MemberStatus = 'Active' | 'Left' | 'Deceased' | 'Never Active';

export type RoleType = 
  | 'President'
  | 'Vice President'
  | 'Secretary'
  | 'Organizing Secretary'
  | 'Treasurer 1'
  | 'Treasurer 2'
  | 'Treasurer'
  | 'Auditor'
  | 'Auditor 2'
  | 'Chief Whip 1'
  | 'Chief Whip 2'
  | 'Member';

export type PaymentType = 
  | 'Contribution'
  | 'Penalty Payment'
  | 'Admin Income'
  | 'Debt Repayment'
  | 'Penalty Charged'; // Historical only

export type LedgerStatus = 'Pending Confirmation' | 'Confirmed' | 'Rejected';

export interface GroupSettings {
  share_value: number; // 100 KES
  penalty_rate: number; // 0.01 (1% per month)
  penalty_start: string; // '2025-10-01'
  penalty_grace_months: number; // 1
  financial_year_start_month: number; // 10 (October)
  stand_for_office_max_months_behind: number; // 2
  document_approvals_required: number; // 1
  registration_fee_default: number; // 200 or 500
  meeting_quorum: number | null; // null = none
  absence_fines_enabled: boolean;
  term_length_months: number; // e.g. 12 or 24
  pilot_mode: 'A' | 'B'; // 'A' = Sheet is source of truth (mirror), 'B' = App ledger
  last_sheet_import_date?: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  inviteLinkActive: boolean;
  settings: GroupSettings;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  memberNo: number;
  fullName: string;
  phone?: string;
  joinDate: string; // 'YYYY-MM' format
  regFee: number;
  status: MemberStatus;
  beneficiaryNotes?: string;
  createdAt: string;
}

export interface RoleTerm {
  id: string;
  groupId: string;
  memberId: string;
  role: RoleType;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface Membership {
  id: string;
  groupId: string;
  userId: string;
  memberId?: string; // linked member ID once claimed & approved
  role: RoleType;
  status: 'pending_approval' | 'approved' | 'rejected';
  claimedName?: string;
  claimedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface LedgerEntry {
  id: string;
  groupId: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: PaymentType;
  dateReceived: string; // 'YYYY-MM-DD'
  periodNotes?: string;
  status: LedgerStatus;
  recordedBy?: string; // userId of treasurer 1
  confirmedBy?: string; // userId of treasurer 2 (must be different)
  confirmedAt?: string;
  financialYear: string; // e.g. 'FY 2025-2026'
  mpesaCode?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  avatarUrl?: string;
  authProvider?: 'google' | 'phone';
}

export interface AuditLogEntry {
  id: string;
  groupId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface MemberCalculatedStatement {
  member: Member;
  shares: number;
  paidUpTo: string;
  monthsDue: number;
  monthsBehind: number | null;
  arrears: number | null;
  penaltyOwed: number;
  ownershipPercentage: number;
  estimatedPayout: number;
  trafficLight: 'green' | 'yellow' | 'red' | 'gray';
  statusText: string;
  payments: LedgerEntry[];
}

// ============================================================================
// Phase 2 Types: Expenses, MMF Reconciliation, Documents & Learn
// ============================================================================

export type ExpenseCategory =
  | 'Transaction Cost'
  | 'Group Registration Fees'
  | 'Meeting Expenses'
  | 'Communication'
  | 'Other Group Expenses';

export interface Expense {
  id: string;
  groupId: string;
  expenseNo: string; // e.g. 'E001'
  date: string; // 'YYYY-MM-DD'
  category: ExpenseCategory;
  description: string;
  amount: number;
  authorizedBy?: string;
  notesReceipt?: string;
  receiptPhotoUrl?: string;
  status: LedgerStatus; // 'Pending Confirmation' | 'Confirmed' | 'Rejected'
  recordedBy?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

export type MmfDepositSource = 'Member Funds' | 'Penalty Fines' | 'Treasurer Debt Repayment';

export interface MmfDepositEntry {
  id: string;
  groupId: string;
  date: string;
  amount: number;
  source: MmfDepositSource;
  notes?: string;
  recordedBy?: string;
  confirmedBy?: string;
}

export interface MmfReconciliationSnapshot {
  groupId: string;
  asOfDate: string;
  totalDeposited: number;
  mmfBalance: number;
  interestEarned: number;
  expectedBalance: number;
  discrepancy: number;
  status: 'Balanced' | 'Discrepancy';
  cashOnHand: number;
  netFundValue: number;
  negativeCashFlag: boolean;
  notes?: string;
}

export interface TreasurerDebtRecord {
  agreedLiability: number; // 8,184
  repaidToDate: number; // 2,000
  outstandingBalance: number; // 6,184
  debtorName: string; // Antoinette Ochieng
}

export type DocumentCategory =
  | 'Constitution'
  | 'Minutes'
  | 'Audit Reports'
  | 'MMF Statements'
  | 'Other';

export type DocumentVisibility = 'All members' | 'Officials only';

export type DocumentStatus = 'Draft' | 'Pending approval' | 'Released' | 'Rejected';

export interface DocumentApproval {
  id: string;
  versionNumber: number;
  officialUserId: string;
  officialName: string;
  action: 'Approved' | 'Rejected';
  reason?: string;
  timestamp: string;
}

export interface DocumentVersion {
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  changeSummary?: string;
  status: DocumentStatus;
  approvals: DocumentApproval[];
}

export interface DocumentRecord {
  id: string;
  groupId: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  currentVersionNumber: number;
  releasedVersionNumber?: number; // Latest approved version visible to members
  status: DocumentStatus;
  uploadedBy: string;
  uploadedByName: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTotals {
  activeMembersCount: number;
  totalShares: number;
  totalContributions: number;
  totalAdminIncome: number;
  totalDebtRepaid: number;
  totalPenaltiesCharged: number;
  totalPenaltiesCollected: number;
  moneyIn: number;
  membersInArrearsCount: number;
  totalActiveArrears: number;
  leftCount: number;
  deceasedCount: number;
  neverActiveCount: number;
}

// ============================================================================
// Phase 3 Types: Meetings, Attendance, Voting & Elections, Welfare, Notices
// ============================================================================

export type MeetingType = 'Regular' | 'AGM' | 'Special' | 'Committee';
export type MeetingStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Meeting {
  id: string;
  groupId: string;
  title: string;
  meetingDate: string; // ISO string
  agenda: string;
  meetingType: MeetingType;
  minutesDocId?: string;
  status: MeetingStatus;
  createdBy: string;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Apology' | 'Late';

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  checkedInBy?: string;
  notes?: string;
}

export interface MemberAttendanceSummary {
  memberId: string;
  memberName: string;
  totalMeetings: number;
  attendedMeetings: number;
  attendanceRate: number; // 0 to 100 percentage
}

export type MotionType = 'General' | 'Disbursement' | 'Election' | 'ConstitutionAmendment';
export type BallotType = 'Secret' | 'Open';
export type MotionStatus = 'Draft' | 'Open' | 'Closed' | 'Cancelled';

export interface ElectionCandidate {
  memberId: string;
  memberName: string;
  nominatedBy?: string;
  statement?: string;
}

export interface Motion {
  id: string;
  groupId: string;
  title: string;
  description: string;
  motionType: MotionType;
  ballotType: BallotType;
  targetRole?: RoleType;
  options: string[]; // Options like ['Yes', 'No', 'Abstain'] or Candidate IDs
  candidates?: ElectionCandidate[];
  returningOfficerId: string; // Chief Whip or Auditor administering
  status: MotionStatus;
  openUntil: string;
  closedAt?: string;
  disbursementAmount?: number;
  disbursementBeneficiary?: string;
  createdBy: string;
  createdAt: string;
}

// Records WHO voted (turnout) - Never contains the voter's choice
export interface TurnoutRecord {
  id: string;
  motionId: string;
  memberId: string;
  votedAt: string;
}

// Records the vote choice. In a Secret ballot, voterMemberId is omitted / strictly undefined.
export interface BallotVote {
  id: string;
  motionId: string;
  choice: string;
  voterMemberId?: string; // ONLY populated if ballotType === 'Open'. In 'Secret', voterMemberId is strictly omitted
  votedAt: string;
}

export interface MotionResult {
  motionId: string;
  totalVotes: number;
  resultsByOption: Record<string, number>;
  winnerOption?: string;
  quorumMet: boolean;
  isClosed: boolean;
}

export interface HandoverLogEntry {
  id: string;
  groupId: string;
  role: RoleType;
  previousMemberId: string;
  newMemberId: string;
  electionMotionId: string;
  handoverDate: string;
  notes?: string;
}

// Welfare & Disputes (restricted visibility)
export type WelfareCaseStatus = 'Open' | 'Under Review' | 'Resolved' | 'Closed';
export type WelfareCasePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type WelfareCategory = 'Bereavement' | 'Illness' | 'Dispute' | 'Financial Emergency' | 'Other';

export interface WelfareCase {
  id: string;
  groupId: string;
  caseNumber: string;
  title: string;
  reportedByMemberId: string;
  subjectMemberId?: string;
  category: WelfareCategory;
  privateNotes: string; // Only visible to Chief Whips and President
  status: WelfareCaseStatus;
  priority: WelfareCasePriority;
  assistanceAmount?: number;
  deletionRequested?: boolean;
  deletionRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CaseViewLog {
  id: string;
  caseId: string;
  viewedByUserId: string;
  viewedByName: string;
  viewedRole: string;
  timestamp: string;
}

// Notices & Reminders
export type NoticePriority = 'Normal' | 'Important' | 'Urgent';
export type NoticeChannel = 'In-App' | 'SMS' | 'Push' | 'WhatsApp';
export type NoticeCategory = 'Meeting' | 'Arrears' | 'Announcement' | 'Election' | 'General';

export interface Notice {
  id: string;
  groupId: string;
  title: string;
  content: string;
  category: NoticeCategory;
  priority: NoticePriority;
  channels: NoticeChannel[];
  targetAudience: 'All' | 'Arrears Only' | 'Officials Only';
  authorId: string;
  authorName: string;
  publishedAt: string;
  expiresAt?: string;
}

