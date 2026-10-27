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
