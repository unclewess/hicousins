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
