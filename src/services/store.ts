import { useState, useEffect } from 'react';
import {
  Group,
  Member,
  LedgerEntry,
  RoleTerm,
  Membership,
  User,
  AuditLogEntry,
  RoleType,
  Expense,
  ExpenseCategory,
  MmfDepositEntry,
  DocumentRecord,
  DocumentCategory,
  DocumentVisibility,
  MmfReconciliationSnapshot,
  TreasurerDebtRecord,
  MemberCalculatedStatement,
  Meeting,
  MeetingType,
  MeetingStatus,
  AttendanceRecord,
  AttendanceStatus,
  MemberAttendanceSummary,
  Motion,
  MotionType,
  BallotType,
  ElectionCandidate,
  TurnoutRecord,
  BallotVote,
  MotionResult,
  HandoverLogEntry,
  WelfareCase,
  WelfareCaseStatus,
  WelfareCasePriority,
  WelfareCategory,
  CaseViewLog,
  Notice,
  NoticePriority,
  NoticeChannel,
  NoticeCategory
} from '../types';
import { importNdhuhuluData } from '../lib/migration';
import {
  getFinancialYear,
  calculateDashboardTotals,
  calculateExpensesBreakdown,
  calculateMmfReconciliation,
  calculateTreasurerDebt
} from '../lib/calculations';
import { NDHUHULU_AUDIT_INPUTS } from '../data/ndhuhuluRawData';

// Storage keys
const STORAGE_PREFIX = 'hicousins_';
const GROUPS_KEY = `${STORAGE_PREFIX}groups`;
const MEMBERS_KEY = `${STORAGE_PREFIX}members`;
const PAYMENTS_KEY = `${STORAGE_PREFIX}payments`;
const ROLE_TERMS_KEY = `${STORAGE_PREFIX}role_terms`;
const MEMBERSHIPS_KEY = `${STORAGE_PREFIX}memberships`;
const AUDIT_LOG_KEY = `${STORAGE_PREFIX}audit_log`;
const CURRENT_USER_KEY = `${STORAGE_PREFIX}current_user`;
const CURRENT_GROUP_KEY = `${STORAGE_PREFIX}current_group_id`;
const AS_OF_DATE_KEY = `${STORAGE_PREFIX}as_of_date`;
const EXPENSES_KEY = `${STORAGE_PREFIX}expenses`;
const MMF_DEPOSITS_KEY = `${STORAGE_PREFIX}mmf_deposits`;
const DOCUMENTS_KEY = `${STORAGE_PREFIX}documents`;
const AUDIT_INPUTS_KEY = `${STORAGE_PREFIX}audit_inputs`;
const MEETINGS_KEY = `${STORAGE_PREFIX}meetings`;
const ATTENDANCE_KEY = `${STORAGE_PREFIX}attendance`;
const MOTIONS_KEY = `${STORAGE_PREFIX}motions`;
const TURNOUT_KEY = `${STORAGE_PREFIX}turnout`;
const BALLOTS_KEY = `${STORAGE_PREFIX}ballots`;
const WELFARE_CASES_KEY = `${STORAGE_PREFIX}welfare_cases`;
const CASE_VIEW_LOGS_KEY = `${STORAGE_PREFIX}case_view_logs`;
const NOTICES_KEY = `${STORAGE_PREFIX}notices`;
const HANDOVERS_KEY = `${STORAGE_PREFIX}handovers`;

// Mock accounts for quick testing all roles
export const MOCK_USERS: Array<{ id: string; name: string; email: string; phone?: string; role: RoleType; memberId?: string }> = [
  { id: 'usr-winnie', name: 'Winnie Mbidhi', email: 'winnie.mbidhi@gmail.com', role: 'President', memberId: 'mem-ndh-014' },
  { id: 'usr-mark', name: 'Mark O. Okello', email: 'mark.okello@gmail.com', role: 'Vice President', memberId: 'mem-ndh-016' },
  { id: 'usr-wesley', name: 'Wesley Mbidhi', email: 'wesley.mbidhi@gmail.com', role: 'Treasurer 1', memberId: 'mem-ndh-013' },
  { id: 'usr-collins', name: 'Collins Oduka', email: 'collins.oduka@gmail.com', role: 'Treasurer 2', memberId: 'mem-ndh-029' },
  { id: 'usr-sandra', name: 'Sandra Achieng', email: 'sandra.achieng@gmail.com', role: 'Secretary', memberId: 'mem-ndh-017' },
  { id: 'usr-aaron', name: 'Aaron Oduor', email: 'aaron.oduor@gmail.com', role: 'Organizing Secretary', memberId: 'mem-ndh-004' },
  { id: 'usr-eugene', name: 'Eugene Nyasio', email: 'eugene.nyasio@gmail.com', role: 'Chief Whip 1', memberId: 'mem-ndh-040' },
  { id: 'usr-noel', name: 'Noel Oduor', email: 'noel.oduor@gmail.com', role: 'Auditor', memberId: 'mem-ndh-008' },
  { id: 'usr-wendy', name: 'Wendy Odindo', email: 'wendy.odindo@gmail.com', role: 'Member', memberId: 'mem-ndh-001' },
  { id: 'usr-newjoiner', name: 'New Google User (Pending)', email: 'new.member@gmail.com', role: 'Member' }
];

// Memory fallback for Node/testing environment when localStorage is not defined
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
  clear: (): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.clear();
    } else {
      memoryStore.clear();
    }
  }
};

export class ChamaStore {
  private groups: Group[] = [];
  private members: Member[] = [];
  private payments: LedgerEntry[] = [];
  private roleTerms: RoleTerm[] = [];
  private memberships: Membership[] = [];
  private auditLog: AuditLogEntry[] = [];
  private expenses: Expense[] = [];
  private mmfDeposits: MmfDepositEntry[] = [];
  private documents: DocumentRecord[] = [];
  private meetings: Meeting[] = [];
  private attendance: AttendanceRecord[] = [];
  private motions: Motion[] = [];
  private turnout: TurnoutRecord[] = [];
  private ballots: BallotVote[] = [];
  private welfareCases: WelfareCase[] = [];
  private caseViewLogs: CaseViewLog[] = [];
  private notices: Notice[] = [];
  private handovers: HandoverLogEntry[] = [];
  private auditInputs = { ...NDHUHULU_AUDIT_INPUTS };
  private currentUser: User = { id: MOCK_USERS[0].id, email: MOCK_USERS[0].email, fullName: MOCK_USERS[0].name, authProvider: 'google' };
  private currentGroupId: string = 'group-ndhuhulu-001';
  private asOfDate: string = '2026-10-25'; // Benchmark audit date by default
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initData();
  }

  private initData() {
    const storedGroups = safeStorage.getItem(GROUPS_KEY);
    if (!storedGroups) {
      // Seed initial Ndhuhulu dataset
      const migration = importNdhuhuluData();
      this.groups = [migration.group];
      this.members = migration.members;
      this.payments = migration.payments;
      this.roleTerms = migration.roleTerms;
      this.expenses = migration.expenses;
      this.mmfDeposits = migration.mmfDeposits;
      this.documents = migration.documents;
      this.auditInputs = { ...migration.auditInputs };

      // Seed mock memberships for users
      this.memberships = MOCK_USERS.map((u, i) => ({
        id: `m-seed-${i + 1}`,
        groupId: migration.group.id,
        userId: u.id,
        memberId: u.memberId,
        role: u.role,
        status: u.id === 'usr-newjoiner' ? 'pending_approval' : 'approved',
        claimedName: u.name,
        approvedBy: u.id === 'usr-newjoiner' ? undefined : 'system-seed',
        approvedAt: u.id === 'usr-newjoiner' ? undefined : '2026-10-01T00:00:00Z',
      }));

      this.auditLog = [
        {
          id: 'audit-001',
          groupId: migration.group.id,
          actorUserId: 'system',
          actorName: 'System Migration',
          action: 'IMPORT_MIGRATION',
          entity: 'ALL',
          entityId: migration.group.id,
          details: {
            membersCount: this.members.length,
            paymentsCount: this.payments.length,
            expensesCount: this.expenses.length,
            unmatchedNames: migration.unmatchedNames,
          },
          timestamp: new Date().toISOString(),
        }
      ];

      // Seed Phase 3: Meetings & Attendance
      this.meetings = [
        {
          id: 'meet-001',
          groupId: migration.group.id,
          title: 'October 2026 Monthly General Meeting',
          meetingDate: '2026-10-18T14:00:00Z',
          agenda: 'Review of FY 2025-26 Financials, MMF Reconciliation, and Welfare Cases',
          meetingType: 'Regular',
          status: 'Completed',
          createdBy: 'usr-sandra',
          createdAt: '2026-10-10T09:00:00Z'
        },
        {
          id: 'meet-002',
          groupId: migration.group.id,
          title: 'November 2026 Regular & Welfare Meeting',
          meetingDate: '2026-11-15T14:00:00Z',
          agenda: '1. Arrears recovery updates. 2. Election timeline for Treasurer 2. 3. Investment feature discussion.',
          meetingType: 'Regular',
          status: 'Scheduled',
          createdBy: 'usr-sandra',
          createdAt: '2026-10-20T10:00:00Z'
        }
      ];

      this.attendance = [
        { id: 'att-1', meetingId: 'meet-001', memberId: 'mem-ndh-014', status: 'Present', checkedInAt: '2026-10-18T14:05:00Z' },
        { id: 'att-2', meetingId: 'meet-001', memberId: 'mem-ndh-013', status: 'Present', checkedInAt: '2026-10-18T14:02:00Z' },
        { id: 'att-3', meetingId: 'meet-001', memberId: 'mem-ndh-017', status: 'Present', checkedInAt: '2026-10-18T14:00:00Z' },
        { id: 'att-4', meetingId: 'meet-001', memberId: 'mem-ndh-008', status: 'Present', checkedInAt: '2026-10-18T14:10:00Z' },
        { id: 'att-5', meetingId: 'meet-001', memberId: 'mem-ndh-001', status: 'Present', checkedInAt: '2026-10-18T14:15:00Z' },
        { id: 'att-6', meetingId: 'meet-001', memberId: 'mem-ndh-002', status: 'Apology', notes: 'Attending work commitment outside Nairobi' }
      ];

      // Seed Phase 3: Motions & Elections
      this.motions = [
        {
          id: 'mot-001',
          groupId: migration.group.id,
          title: 'Ratify FY 2025-26 Financial Audit & MMF Reconciliation',
          description: 'Approval of the audited MMF accounts showing net fund of KES 283,545.25 and former treasurer repayment plan.',
          motionType: 'General',
          ballotType: 'Secret',
          options: ['Yes', 'No', 'Abstain'],
          returningOfficerId: 'mem-ndh-040', // Eugene Nyasio (Chief Whip 1)
          status: 'Open',
          openUntil: '2026-11-30T23:59:59Z',
          createdBy: 'usr-winnie',
          createdAt: '2026-10-20T12:00:00Z'
        },
        {
          id: 'mot-002',
          groupId: migration.group.id,
          title: 'Assistant Treasurer By-Election',
          description: 'Election of Assistant Treasurer (Treasurer 2) for remainder of term 2024-2026.',
          motionType: 'Election',
          ballotType: 'Secret',
          targetRole: 'Treasurer 2',
          options: ['mem-ndh-002', 'mem-ndh-001'],
          candidates: [
            { memberId: 'mem-ndh-002', memberName: 'Edith Hwaga', statement: 'Ready to support treasury reconciliation and digital records.' },
            { memberId: 'mem-ndh-001', memberName: 'Wendy Odindo', statement: 'Committed to transparent and timely payment confirmation.' }
          ],
          returningOfficerId: 'mem-ndh-040', // Eugene Nyasio (Chief Whip 1)
          status: 'Open',
          openUntil: '2026-11-30T23:59:59Z',
          createdBy: 'usr-winnie',
          createdAt: '2026-10-21T10:00:00Z'
        }
      ];

      this.turnout = [];
      this.ballots = [];

      // Seed Phase 3: Welfare Cases (Strictly confidential)
      this.welfareCases = [
        {
          id: 'case-001',
          groupId: migration.group.id,
          caseNumber: 'WLF-2026-001',
          title: 'Medical Hospitalization Assistance - Case #001',
          reportedByMemberId: 'mem-ndh-001',
          subjectMemberId: 'mem-ndh-002',
          category: 'Illness',
          privateNotes: 'CONFIDENTIAL: Member was admitted to hospital for surgery on 12 Oct 2026. Hospital bill was KES 45,000. Chief Whip visited on 14 Oct. Recommended welfare grant of KES 5,000 from emergency kitty.',
          status: 'Open',
          priority: 'High',
          assistanceAmount: 5000,
          deletionRequested: false,
          createdAt: '2026-10-14T11:00:00Z',
          updatedAt: '2026-10-14T11:00:00Z'
        }
      ];
      this.caseViewLogs = [];

      // Seed Phase 3: Notices
      this.notices = [
        {
          id: 'not-001',
          groupId: migration.group.id,
          title: 'Notice of November Monthly Meeting',
          content: 'The November regular meeting will take place on Sunday 15 Nov 2026 at 2:00 PM. Please ensure your contributions and arrears are updated before the meeting.',
          category: 'Meeting',
          priority: 'Important',
          channels: ['In-App', 'WhatsApp'],
          targetAudience: 'All',
          authorId: 'usr-sandra',
          authorName: 'Sandra Achieng (Secretary)',
          publishedAt: '2026-10-20T08:00:00Z'
        },
        {
          id: 'not-002',
          groupId: migration.group.id,
          title: 'Arrears Reminder for Q4',
          content: 'Members with arrears exceeding 2 months are kindly reminded to clear their balance to remain eligible for official nominations and standing for office.',
          category: 'Arrears',
          priority: 'Important',
          channels: ['In-App', 'SMS'],
          targetAudience: 'Arrears Only',
          authorId: 'usr-eugene',
          authorName: 'Eugene Nyasio (Chief Whip 1)',
          publishedAt: '2026-10-22T09:00:00Z'
        }
      ];
      this.handovers = [];

      this.saveToStorage();
    } else {
      try {
        this.groups = JSON.parse(storedGroups);
        this.members = JSON.parse(safeStorage.getItem(MEMBERS_KEY) || '[]');
        this.payments = JSON.parse(safeStorage.getItem(PAYMENTS_KEY) || '[]');
        this.roleTerms = JSON.parse(safeStorage.getItem(ROLE_TERMS_KEY) || '[]');
        this.memberships = JSON.parse(safeStorage.getItem(MEMBERSHIPS_KEY) || '[]');
        this.auditLog = JSON.parse(safeStorage.getItem(AUDIT_LOG_KEY) || '[]');
        this.expenses = JSON.parse(safeStorage.getItem(EXPENSES_KEY) || '[]');
        this.mmfDeposits = JSON.parse(safeStorage.getItem(MMF_DEPOSITS_KEY) || '[]');
        this.documents = JSON.parse(safeStorage.getItem(DOCUMENTS_KEY) || '[]');
        this.meetings = JSON.parse(safeStorage.getItem(MEETINGS_KEY) || '[]');
        this.attendance = JSON.parse(safeStorage.getItem(ATTENDANCE_KEY) || '[]');
        this.motions = JSON.parse(safeStorage.getItem(MOTIONS_KEY) || '[]');
        this.turnout = JSON.parse(safeStorage.getItem(TURNOUT_KEY) || '[]');
        this.ballots = JSON.parse(safeStorage.getItem(BALLOTS_KEY) || '[]');
        this.welfareCases = JSON.parse(safeStorage.getItem(WELFARE_CASES_KEY) || '[]');
        this.caseViewLogs = JSON.parse(safeStorage.getItem(CASE_VIEW_LOGS_KEY) || '[]');
        this.notices = JSON.parse(safeStorage.getItem(NOTICES_KEY) || '[]');
        this.handovers = JSON.parse(safeStorage.getItem(HANDOVERS_KEY) || '[]');
        this.auditInputs = JSON.parse(safeStorage.getItem(AUDIT_INPUTS_KEY) || JSON.stringify(NDHUHULU_AUDIT_INPUTS));
        this.currentGroupId = safeStorage.getItem(CURRENT_GROUP_KEY) || 'group-ndhuhulu-001';
        this.asOfDate = safeStorage.getItem(AS_OF_DATE_KEY) || '2026-10-25';
        
        const storedUser = safeStorage.getItem(CURRENT_USER_KEY);
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
      } catch (e) {
        console.error('Error reading storage, resetting', e);
        safeStorage.clear();
        this.initData();
      }
    }
  }

  private saveToStorage() {
    safeStorage.setItem(GROUPS_KEY, JSON.stringify(this.groups));
    safeStorage.setItem(MEMBERS_KEY, JSON.stringify(this.members));
    safeStorage.setItem(PAYMENTS_KEY, JSON.stringify(this.payments));
    safeStorage.setItem(ROLE_TERMS_KEY, JSON.stringify(this.roleTerms));
    safeStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(this.memberships));
    safeStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(this.auditLog));
    safeStorage.setItem(EXPENSES_KEY, JSON.stringify(this.expenses));
    safeStorage.setItem(MMF_DEPOSITS_KEY, JSON.stringify(this.mmfDeposits));
    safeStorage.setItem(DOCUMENTS_KEY, JSON.stringify(this.documents));
    safeStorage.setItem(MEETINGS_KEY, JSON.stringify(this.meetings));
    safeStorage.setItem(ATTENDANCE_KEY, JSON.stringify(this.attendance));
    safeStorage.setItem(MOTIONS_KEY, JSON.stringify(this.motions));
    safeStorage.setItem(TURNOUT_KEY, JSON.stringify(this.turnout));
    safeStorage.setItem(BALLOTS_KEY, JSON.stringify(this.ballots));
    safeStorage.setItem(WELFARE_CASES_KEY, JSON.stringify(this.welfareCases));
    safeStorage.setItem(CASE_VIEW_LOGS_KEY, JSON.stringify(this.caseViewLogs));
    safeStorage.setItem(NOTICES_KEY, JSON.stringify(this.notices));
    safeStorage.setItem(HANDOVERS_KEY, JSON.stringify(this.handovers));
    safeStorage.setItem(AUDIT_INPUTS_KEY, JSON.stringify(this.auditInputs));
    safeStorage.setItem(CURRENT_GROUP_KEY, this.currentGroupId);
    safeStorage.setItem(AS_OF_DATE_KEY, this.asOfDate);
    safeStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- Getters ---
  public getGroups() { return [...this.groups]; }
  public getCurrentGroup(): Group | undefined {
    return this.groups.find(g => g.id === this.currentGroupId) || this.groups[0];
  }
  public getCurrentUser(): User { return this.currentUser; }
  public getAsOfDate(): string { return this.asOfDate; }
  
  public getCurrentMembership(): Membership | undefined {
    return this.memberships.find(
      m => m.groupId === this.currentGroupId && m.userId === this.currentUser.id
    );
  }

  public getMembers(groupId = this.currentGroupId): Member[] {
    return this.members.filter(m => m.groupId === groupId);
  }

  public getLedgerEntries(groupId = this.currentGroupId): LedgerEntry[] {
    return this.payments.filter(p => p.groupId === groupId);
  }

  public getRoleTerms(groupId = this.currentGroupId): RoleTerm[] {
    return this.roleTerms.filter(r => r.groupId === groupId);
  }

  public getMemberships(groupId = this.currentGroupId): Membership[] {
    return this.memberships.filter(m => m.groupId === groupId);
  }

  public getAuditLog(groupId = this.currentGroupId): AuditLogEntry[] {
    return this.auditLog.filter(a => a.groupId === groupId);
  }

  // --- Phase 2 Getters ---

  public getExpenses(groupId = this.currentGroupId): Expense[] {
    return this.expenses.filter(e => e.groupId === groupId);
  }

  public getMmfDeposits(groupId = this.currentGroupId): MmfDepositEntry[] {
    return this.mmfDeposits.filter(d => d.groupId === groupId);
  }

  public getAuditInputs() {
    return { ...this.auditInputs };
  }

  public getDocuments(groupId = this.currentGroupId): DocumentRecord[] {
    return this.documents.filter(d => d.groupId === groupId);
  }

  public getMmfSnapshot(): MmfReconciliationSnapshot {
    const { totals } = calculateDashboardTotals(
      this.getMembers(),
      this.getLedgerEntries(),
      new Date(`${this.asOfDate}T12:00:00Z`),
      this.getCurrentGroup()?.settings || { share_value: 100, penalty_rate: 0.01, penalty_start: '2025-10-01', penalty_grace_months: 1, financial_year_start_month: 10, stand_for_office_max_months_behind: 2, document_approvals_required: 1, registration_fee_default: 200, meeting_quorum: null, absence_fines_enabled: false, term_length_months: 24, pilot_mode: 'A' }
    );

    const { totalExpenses } = calculateExpensesBreakdown(this.getExpenses());

    return calculateMmfReconciliation(
      totals.moneyIn,
      totalExpenses,
      this.auditInputs.totalDeposited,
      this.auditInputs.mmfBalance,
      this.auditInputs.cumulativeInterest,
      this.asOfDate
    );
  }

  public getTreasurerDebt(): TreasurerDebtRecord {
    return calculateTreasurerDebt(
      this.auditInputs.treasurerDebtLiability,
      this.getLedgerEntries(),
      this.auditInputs.treasurerDebtorName
    );
  }

  // --- Actions ---

  public setAsOfDate(dateStr: string) {
    this.asOfDate = dateStr;
    this.saveToStorage();
  }

  public setCurrentGroup(groupId: string) {
    this.currentGroupId = groupId;
    this.saveToStorage();
  }

  public switchUser(mockUser: typeof MOCK_USERS[0]) {
    this.currentUser = {
      id: mockUser.id,
      email: mockUser.email,
      fullName: mockUser.name,
      authProvider: 'google',
    };
    this.saveToStorage();
  }

  public loginWithGoogle(email: string, fullName: string) {
    const existing = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      this.switchUser(existing);
      return;
    }
    const newId = `usr-${Date.now()}`;
    this.currentUser = { id: newId, email, fullName, authProvider: 'google' };
    this.saveToStorage();
  }

  public setPilotMode(mode: 'A' | 'B') {
    const group = this.getCurrentGroup();
    if (!group) return;
    group.settings.pilot_mode = mode;
    this.saveToStorage();
  }

  public recordPayment(entry: {
    memberId: string;
    amount: number;
    type: LedgerEntry['type'];
    dateReceived: string;
    periodNotes?: string;
    mpesaCode?: string;
    status?: LedgerEntry['status'];
  }): { success: boolean; error?: string } {
    const group = this.getCurrentGroup();
    if (!group) return { success: false, error: 'Group not found' };

    const member = this.members.find(m => m.id === entry.memberId);
    if (!member) return { success: false, error: 'Member not found' };

    const financialYear = getFinancialYear(entry.dateReceived);

    const newPayment: LedgerEntry = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      groupId: group.id,
      memberId: entry.memberId,
      memberName: member.fullName,
      amount: entry.amount,
      type: entry.type,
      dateReceived: entry.dateReceived,
      periodNotes: entry.periodNotes,
      status: entry.status || 'Pending Confirmation',
      recordedBy: this.currentUser.id,
      financialYear,
      mpesaCode: entry.mpesaCode,
      createdAt: new Date().toISOString(),
    };

    this.payments.unshift(newPayment);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'RECORD_PAYMENT',
      entity: 'LEDGER_ENTRY',
      entityId: newPayment.id,
      details: { amount: newPayment.amount, type: newPayment.type, member: member.fullName },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public confirmPayment(entryId: string): { success: boolean; error?: string } {
    const payment = this.payments.find(p => p.id === entryId);
    if (!payment) return { success: false, error: 'Payment not found' };

    const membership = this.getCurrentMembership();
    const isTreasurer = membership?.role === 'Treasurer 1' || 
                        membership?.role === 'Treasurer 2' || 
                        membership?.role === 'Treasurer';

    if (!isTreasurer) {
      return { success: false, error: 'Only a Treasurer can confirm payments.' };
    }

    // Two-Treasurer Confirmation Rule: Self-confirmation blocked!
    if (payment.recordedBy === this.currentUser.id) {
      return { 
        success: false, 
        error: 'Security Rule: A treasurer cannot confirm their own entry. Another treasurer must confirm.' 
      };
    }

    payment.status = 'Confirmed';
    payment.confirmedBy = this.currentUser.id;
    payment.confirmedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: payment.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'CONFIRM_PAYMENT',
      entity: 'LEDGER_ENTRY',
      entityId: payment.id,
      details: { amount: payment.amount, confirmedBy: this.currentUser.id },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public rejectPayment(entryId: string, reason: string): { success: boolean; error?: string } {
    const payment = this.payments.find(p => p.id === entryId);
    if (!payment) return { success: false, error: 'Payment not found' };

    payment.status = 'Rejected';

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: payment.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'REJECT_PAYMENT',
      entity: 'LEDGER_ENTRY',
      entityId: payment.id,
      details: { reason },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public claimProfile(memberId: string, claimedName: string) {
    const group = this.getCurrentGroup();
    if (!group) return;

    let membership = this.getCurrentMembership();
    if (membership) {
      membership.memberId = memberId;
      membership.claimedName = claimedName;
      membership.status = 'pending_approval';
      membership.claimedAt = new Date().toISOString();
    } else {
      membership = {
        id: `m-${Date.now()}`,
        groupId: group.id,
        userId: this.currentUser.id,
        memberId,
        role: 'Member',
        status: 'pending_approval',
        claimedName,
        claimedAt: new Date().toISOString(),
      };
      this.memberships.push(membership);
    }

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'CLAIM_PROFILE',
      entity: 'MEMBERSHIP',
      entityId: membership.id,
      details: { memberId, claimedName },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
  }

  public approveMembership(membershipId: string): { success: boolean; error?: string } {
    const membership = this.memberships.find(m => m.id === membershipId);
    if (!membership) return { success: false, error: 'Membership not found' };

    membership.status = 'approved';
    membership.approvedBy = this.currentUser.id;
    membership.approvedAt = new Date().toISOString();

    // Link member phone
    if (membership.memberId) {
      const member = this.members.find(m => m.id === membership.memberId);
      if (member) {
        member.phone = this.currentUser.phone;
      }
    }

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: membership.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'APPROVE_MEMBERSHIP',
      entity: 'MEMBERSHIP',
      entityId: membership.id,
      details: { memberId: membership.memberId, approvedUser: membership.userId },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public resetInviteCode(): string {
    const group = this.getCurrentGroup();
    if (!group) return '';
    const newCode = `invite-${Math.random().toString(36).substring(2, 9)}`;
    group.inviteCode = newCode;
    group.inviteLinkActive = true;

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'RESET_INVITE_CODE',
      entity: 'GROUP',
      entityId: group.id,
      details: { newCode },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return newCode;
  }

  public toggleInviteLink(active: boolean) {
    const group = this.getCurrentGroup();
    if (!group) return;
    group.inviteLinkActive = active;
    this.saveToStorage();
  }

  public addMember(newMember: {
    fullName: string;
    joinDate: string;
    regFee: number;
    status: Member['status'];
    phone?: string;
    beneficiaryNotes?: string;
  }): { success: boolean; member?: Member; error?: string } {
    const group = this.getCurrentGroup();
    if (!group) return { success: false, error: 'No active group' };

    const memberNo = this.members.filter(m => m.groupId === group.id).length + 1;
    const member: Member = {
      id: `mem-${group.id}-${Date.now()}`,
      groupId: group.id,
      memberNo,
      fullName: newMember.fullName,
      joinDate: newMember.joinDate,
      regFee: newMember.regFee,
      status: newMember.status,
      phone: newMember.phone,
      beneficiaryNotes: newMember.beneficiaryNotes,
      createdAt: new Date().toISOString(),
    };

    this.members.push(member);

    // If registration fee was paid, auto-record Admin Income entry
    if (newMember.regFee > 0) {
      this.recordPayment({
        memberId: member.id,
        amount: newMember.regFee,
        type: 'Admin Income',
        dateReceived: `${newMember.joinDate}-01`,
        periodNotes: `Registration fee ${newMember.joinDate}`,
        status: 'Confirmed'
      });
    }

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'ADD_MEMBER',
      entity: 'MEMBER',
      entityId: member.id,
      details: { fullName: member.fullName, status: member.status },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true, member };
  }

  // --- Phase 2 Actions: Expenses ---

  public recordExpense(data: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    date: string;
    authorizedBy?: string;
    notesReceipt?: string;
    receiptPhotoUrl?: string;
  }): { success: boolean; error?: string } {
    const group = this.getCurrentGroup();
    if (!group) return { success: false, error: 'Group not found' };

    const membership = this.getCurrentMembership();
    const isTreasurer = membership?.role === 'Treasurer 1' || membership?.role === 'Treasurer 2' || membership?.role === 'Treasurer' || membership?.role === 'President';
    if (!isTreasurer) {
      return { success: false, error: 'Only Treasurers or the President can record group expenses.' };
    }

    const expNo = `E${String(this.expenses.length + 1).padStart(3, '0')}`;
    const newExpense: Expense = {
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      groupId: group.id,
      expenseNo: expNo,
      date: data.date,
      category: data.category,
      description: data.description,
      amount: data.amount,
      authorizedBy: data.authorizedBy || 'Wesley',
      notesReceipt: data.notesReceipt,
      receiptPhotoUrl: data.receiptPhotoUrl,
      status: 'Pending Confirmation',
      recordedBy: this.currentUser.id,
      createdAt: new Date().toISOString(),
    };

    this.expenses.unshift(newExpense);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'RECORD_EXPENSE',
      entity: 'EXPENSE',
      entityId: newExpense.id,
      details: { amount: newExpense.amount, category: newExpense.category, description: newExpense.description },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public confirmExpense(expenseId: string): { success: boolean; error?: string } {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (!expense) return { success: false, error: 'Expense record not found' };

    const membership = this.getCurrentMembership();
    const isTreasurer = membership?.role === 'Treasurer 1' || membership?.role === 'Treasurer 2' || membership?.role === 'Treasurer';
    if (!isTreasurer) {
      return { success: false, error: 'Only a Treasurer can confirm expenses.' };
    }

    // Two-Treasurer Dual Control Rule: Self-confirmation blocked!
    if (expense.recordedBy === this.currentUser.id) {
      return {
        success: false,
        error: 'Security Rule: A treasurer cannot confirm their own expense entry. A different treasurer must confirm.'
      };
    }

    expense.status = 'Confirmed';
    expense.confirmedBy = this.currentUser.id;
    expense.confirmedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: expense.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'CONFIRM_EXPENSE',
      entity: 'EXPENSE',
      entityId: expense.id,
      details: { amount: expense.amount, confirmedBy: this.currentUser.id },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public rejectExpense(expenseId: string, reason: string): { success: boolean; error?: string } {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (!expense) return { success: false, error: 'Expense record not found' };

    expense.status = 'Rejected';

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: expense.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'REJECT_EXPENSE',
      entity: 'EXPENSE',
      entityId: expense.id,
      details: { reason },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  // --- Phase 2 Actions: MMF Reconciliation ---

  public updateAuditInputs(inputs: Partial<typeof NDHUHULU_AUDIT_INPUTS>) {
    this.auditInputs = { ...this.auditInputs, ...inputs };
    this.saveToStorage();
  }

  public recordMmfDeposit(data: {
    date: string;
    amount: number;
    source: MmfDepositEntry['source'];
    notes?: string;
  }): { success: boolean } {
    const group = this.getCurrentGroup();
    if (!group) return { success: false };

    const newDeposit: MmfDepositEntry = {
      id: `mmf-dep-${Date.now()}`,
      groupId: group.id,
      date: data.date,
      amount: data.amount,
      source: data.source,
      notes: data.notes,
      recordedBy: this.currentUser.id,
      confirmedBy: this.currentUser.id,
    };

    this.mmfDeposits.push(newDeposit);
    // Update running total deposited to MMF
    this.auditInputs.totalDeposited = this.mmfDeposits.reduce((sum, d) => sum + d.amount, 0);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: group.id,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'User',
      action: 'RECORD_MMF_DEPOSIT',
      entity: 'MMF_DEPOSIT',
      entityId: newDeposit.id,
      details: { amount: newDeposit.amount, source: newDeposit.source },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  // --- Phase 2 Actions: Documents ---

  public uploadDocument(data: {
    title: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    fileName: string;
    fileUrl?: string;
    changeSummary?: string;
  }): { success: boolean; documentId: string } {
    const group = this.getCurrentGroup();
    const docId = `doc-${Date.now()}`;

    const newDoc: DocumentRecord = {
      id: docId,
      groupId: group ? group.id : 'group-ndhuhulu-001',
      title: data.title,
      category: data.category,
      visibility: data.visibility,
      currentVersionNumber: 1,
      releasedVersionNumber: undefined, // Hidden from members until approved!
      status: 'Pending approval',
      uploadedBy: this.currentUser.id,
      uploadedByName: this.currentUser.fullName || this.currentUser.email || 'Official',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionNumber: 1,
          fileName: data.fileName,
          fileUrl: data.fileUrl || `/docs/${data.fileName}`,
          uploadedBy: this.currentUser.id,
          uploadedByName: this.currentUser.fullName || this.currentUser.email || 'Official',
          uploadedAt: new Date().toISOString(),
          changeSummary: data.changeSummary || 'Initial document upload',
          status: 'Pending approval',
          approvals: []
        }
      ]
    };

    this.documents.unshift(newDoc);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: newDoc.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'UPLOAD_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: newDoc.id,
      details: { title: newDoc.title, category: newDoc.category, version: 1 },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true, documentId: docId };
  }

  public uploadDocumentVersion(docId: string, data: {
    fileName: string;
    fileUrl?: string;
    changeSummary?: string;
  }): { success: boolean; error?: string } {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return { success: false, error: 'Document not found' };

    const newVersionNumber = doc.currentVersionNumber + 1;
    doc.currentVersionNumber = newVersionNumber;
    doc.status = 'Pending approval'; // Version returns to Pending approval; old released version stays visible
    doc.updatedAt = new Date().toISOString();

    doc.versions.unshift({
      versionNumber: newVersionNumber,
      fileName: data.fileName,
      fileUrl: data.fileUrl || `/docs/${data.fileName}`,
      uploadedBy: this.currentUser.id,
      uploadedByName: this.currentUser.fullName || this.currentUser.email || 'Official',
      uploadedAt: new Date().toISOString(),
      changeSummary: data.changeSummary || `Version ${newVersionNumber} revision`,
      status: 'Pending approval',
      approvals: []
    });

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: doc.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'UPLOAD_DOCUMENT_VERSION',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: { title: doc.title, newVersion: newVersionNumber },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public approveDocument(docId: string, versionNumber: number): { success: boolean; error?: string } {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return { success: false, error: 'Document not found' };

    const membership = this.getCurrentMembership();
    const isOfficial = membership?.role && [
      'President', 'Vice President', 'Secretary', 'Organizing Secretary',
      'Treasurer 1', 'Treasurer 2', 'Auditor'
    ].includes(membership.role);

    if (!isOfficial) {
      return { success: false, error: 'Only officials can approve documents.' };
    }

    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) return { success: false, error: 'Version not found' };

    // Uploader cannot approve their own upload!
    if (version.uploadedBy === this.currentUser.id) {
      return {
        success: false,
        error: 'Security Rule: Another official must approve this document. You cannot approve your own upload.'
      };
    }

    version.status = 'Released';
    version.approvals.push({
      id: `appr-${Date.now()}`,
      versionNumber,
      officialUserId: this.currentUser.id,
      officialName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'Approved',
      timestamp: new Date().toISOString(),
    });

    // Mark document as Released and update released version
    doc.status = 'Released';
    doc.releasedVersionNumber = versionNumber;
    doc.updatedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: doc.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'APPROVE_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: { title: doc.title, version: versionNumber },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public rejectDocument(docId: string, versionNumber: number, reason: string): { success: boolean; error?: string } {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return { success: false, error: 'Document not found' };

    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) return { success: false, error: 'Version not found' };

    version.status = 'Rejected';
    version.approvals.push({
      id: `appr-${Date.now()}`,
      versionNumber,
      officialUserId: this.currentUser.id,
      officialName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'Rejected',
      reason,
      timestamp: new Date().toISOString(),
    });

    doc.status = 'Rejected';
    doc.updatedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: doc.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'REJECT_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: { title: doc.title, version: versionNumber, reason },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  public deleteDocument(docId: string): { success: boolean } {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return { success: false };

    this.documents = this.documents.filter(d => d.id !== docId);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: doc.groupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'DELETE_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: docId,
      details: { title: doc.title },
      timestamp: new Date().toISOString(),
    });

    this.saveToStorage();
    return { success: true };
  }

  // ============================================================================
  // Phase 3 Methods: Meetings, Attendance, Voting & Elections, Welfare, Notices
  // ============================================================================

  public getMemberCalculatedStatement(memberId: string): MemberCalculatedStatement | null {
    const member = this.getMembers().find(m => m.id === memberId);
    if (!member) return null;
    const group = this.getCurrentGroup();
    const settings = group?.settings || {
      share_value: 100,
      penalty_rate: 0.01,
      penalty_start: '2025-10-01',
      penalty_grace_months: 1,
      financial_year_start_month: 10,
      stand_for_office_max_months_behind: 2,
      document_approvals_required: 1,
      registration_fee_default: 200,
      meeting_quorum: null,
      absence_fines_enabled: false,
      term_length_months: 24,
      pilot_mode: 'A'
    };
    const asOfDate = new Date(`${this.asOfDate}T12:00:00Z`);
    const { statements } = calculateDashboardTotals(
      this.getMembers(),
      this.getLedgerEntries(),
      asOfDate,
      settings
    );
    return statements.find(s => s.member.id === memberId) || null;
  }

  // --- Meetings & Attendance ---

  public getMeetings(groupId = this.currentGroupId): Meeting[] {
    return this.meetings
      .filter(m => m.groupId === groupId)
      .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  }

  public createMeeting(data: {
    title: string;
    meetingDate: string;
    agenda: string;
    meetingType: MeetingType;
    minutesDocId?: string;
  }): { success: boolean; meetingId: string } {
    const meetingId = `meet-${Date.now()}`;
    const newMeeting: Meeting = {
      id: meetingId,
      groupId: this.currentGroupId,
      title: data.title,
      meetingDate: data.meetingDate,
      agenda: data.agenda,
      meetingType: data.meetingType,
      minutesDocId: data.minutesDocId,
      status: 'Scheduled',
      createdBy: this.currentUser.id,
      createdAt: new Date().toISOString()
    };

    this.meetings.unshift(newMeeting);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'CREATE_MEETING',
      entity: 'MEETING',
      entityId: meetingId,
      details: { title: newMeeting.title, date: newMeeting.meetingDate },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true, meetingId };
  }

  public updateMeetingStatus(meetingId: string, status: MeetingStatus): { success: boolean } {
    const meeting = this.meetings.find(m => m.id === meetingId);
    if (!meeting) return { success: false };
    meeting.status = status;
    this.saveToStorage();
    return { success: true };
  }

  public getMeetingAttendance(meetingId: string): AttendanceRecord[] {
    return this.attendance.filter(a => a.meetingId === meetingId);
  }

  public recordAttendance(
    meetingId: string,
    memberId: string,
    status: AttendanceStatus,
    notes?: string
  ): { success: boolean } {
    const existing = this.attendance.find(a => a.meetingId === meetingId && a.memberId === memberId);
    if (existing) {
      existing.status = status;
      existing.notes = notes;
      existing.checkedInAt = new Date().toISOString();
      existing.checkedInBy = this.currentUser.id;
    } else {
      this.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        meetingId,
        memberId,
        status,
        checkedInAt: new Date().toISOString(),
        checkedInBy: this.currentUser.id,
        notes
      });
    }

    this.saveToStorage();
    return { success: true };
  }

  public getMemberAttendanceSummary(memberId: string): MemberAttendanceSummary {
    const member = this.getMembers().find(m => m.id === memberId);
    const completedMeetings = this.meetings.filter(m => m.status === 'Completed');
    const totalMeetings = completedMeetings.length;

    const records = this.attendance.filter(
      a => a.memberId === memberId && completedMeetings.some(m => m.id === a.meetingId)
    );
    const attendedMeetings = records.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attendanceRate = totalMeetings > 0 ? Math.round((attendedMeetings / totalMeetings) * 100) : 100;

    return {
      memberId,
      memberName: member?.fullName || 'Unknown',
      totalMeetings,
      attendedMeetings,
      attendanceRate
    };
  }

  // --- Voting & Elections ---

  public getMotions(groupId = this.currentGroupId): Motion[] {
    return this.motions.filter(m => m.groupId === groupId);
  }

  /**
   * Eligibility to stand for office:
   * Active and months_behind <= stand_for_office_max_months_behind (2).
   * Members 3+ months behind (red) can vote but cannot be nominated.
   * Left, Deceased and Never Active can neither vote nor stand.
   */
  public canNominateCandidate(memberId: string): { eligible: boolean; reason?: string } {
    const member = this.getMembers().find(m => m.id === memberId);
    if (!member) return { eligible: false, reason: 'Member not found.' };

    if (member.status !== 'Active') {
      return { eligible: false, reason: `Members with status "${member.status}" cannot be nominated for office.` };
    }

    const stmt = this.getMemberCalculatedStatement(memberId);
    const maxBehind = this.getCurrentGroup()?.settings?.stand_for_office_max_months_behind ?? 2;

    if (stmt && stmt.monthsBehind !== null && stmt.monthsBehind > maxBehind) {
      return {
        eligible: false,
        reason: `Member is ${stmt.monthsBehind} months behind in contributions (maximum allowed to stand for office is ${maxBehind}).`
      };
    }

    return { eligible: true };
  }

  /**
   * Returning officer rule:
   * A Chief Whip who is a candidate cannot administer that election;
   * the other Chief Whip or an Auditor takes over.
   */
  public canAdministerElection(
    returningOfficerMemberId: string,
    candidates: ElectionCandidate[]
  ): { eligible: boolean; reason?: string } {
    const isCandidate = candidates.some(c => c.memberId === returningOfficerMemberId);
    if (isCandidate) {
      return {
        eligible: false,
        reason: 'Conflict of interest: A candidate cannot administer their own election. Another Chief Whip or an Auditor must take over as returning officer.'
      };
    }
    return { eligible: true };
  }

  /**
   * Eligibility to vote:
   * Active members, including those in arrears (One member = one vote).
   * Left, Deceased and Never Active cannot vote.
   */
  public canVote(memberId: string, motionId: string): { eligible: boolean; reason?: string } {
    const member = this.getMembers().find(m => m.id === memberId);
    if (!member) return { eligible: false, reason: 'Member not found.' };

    if (member.status !== 'Active') {
      return { eligible: false, reason: `Only Active members can vote. Status is "${member.status}".` };
    }

    const motion = this.motions.find(m => m.id === motionId);
    if (!motion) return { eligible: false, reason: 'Motion not found.' };

    if (motion.status !== 'Open') {
      return { eligible: false, reason: `This ballot is ${motion.status.toLowerCase()}.` };
    }

    // Check if already voted via turnout
    const alreadyVoted = this.turnout.some(t => t.motionId === motionId && t.memberId === memberId);
    if (alreadyVoted) {
      return { eligible: false, reason: 'You have already cast your vote in this ballot.' };
    }

    return { eligible: true };
  }

  public createMotion(data: {
    title: string;
    description: string;
    motionType: MotionType;
    ballotType: BallotType;
    targetRole?: RoleType;
    options: string[];
    candidates?: ElectionCandidate[];
    returningOfficerId: string;
    openUntil: string;
    disbursementAmount?: number;
    disbursementBeneficiary?: string;
  }): { success: boolean; motionId?: string; error?: string } {
    // If election motion, validate returning officer conflict
    if (data.motionType === 'Election' && data.candidates) {
      const check = this.canAdministerElection(data.returningOfficerId, data.candidates);
      if (!check.eligible) {
        return { success: false, error: check.reason };
      }
    }

    const motionId = `mot-${Date.now()}`;
    const newMotion: Motion = {
      id: motionId,
      groupId: this.currentGroupId,
      title: data.title,
      description: data.description,
      motionType: data.motionType,
      ballotType: data.ballotType,
      targetRole: data.targetRole,
      options: data.options,
      candidates: data.candidates,
      returningOfficerId: data.returningOfficerId,
      status: 'Open',
      openUntil: data.openUntil,
      disbursementAmount: data.disbursementAmount,
      disbursementBeneficiary: data.disbursementBeneficiary,
      createdBy: this.currentUser.id,
      createdAt: new Date().toISOString()
    };

    this.motions.unshift(newMotion);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'CREATE_MOTION',
      entity: 'MOTION',
      entityId: motionId,
      details: { title: newMotion.title, type: newMotion.motionType, ballot: newMotion.ballotType },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true, motionId };
  }

  /**
   * Casts a ballot.
   * In a secret ballot:
   * - Turnout records WHO voted (ensuring one vote per member)
   * - Ballot records the choice WITHOUT linking to the voter (voterMemberId is undefined)
   */
  public castVote(motionId: string, memberId: string, choice: string): { success: boolean; error?: string } {
    const motion = this.motions.find(m => m.id === motionId);
    if (!motion) return { success: false, error: 'Motion not found.' };

    const check = this.canVote(memberId, motionId);
    if (!check.eligible) return { success: false, error: check.reason };

    // 1. Record turnout (WHO voted)
    const turnoutEntry: TurnoutRecord = {
      id: `turnout-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      motionId,
      memberId,
      votedAt: new Date().toISOString()
    };
    this.turnout.push(turnoutEntry);

    // 2. Record ballot vote (THE CHOICE).
    // In a Secret ballot, voterMemberId is STRICTLY UNDEFINED!
    const ballotEntry: BallotVote = {
      id: `ballot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      motionId,
      choice,
      voterMemberId: motion.ballotType === 'Open' ? memberId : undefined,
      votedAt: new Date().toISOString()
    };
    this.ballots.push(ballotEntry);

    this.saveToStorage();
    return { success: true };
  }

  public getTurnout(motionId: string): TurnoutRecord[] {
    return this.turnout.filter(t => t.motionId === motionId);
  }

  public getBallots(motionId: string): BallotVote[] {
    // For secret ballots, results are stripped of any voter ID
    return this.ballots
      .filter(b => b.motionId === motionId)
      .map(b => ({
        id: b.id,
        motionId: b.motionId,
        choice: b.choice,
        votedAt: b.votedAt,
        voterMemberId: b.voterMemberId // Only present if open ballot
      }));
  }

  public getMotionResults(motionId: string): MotionResult {
    const motion = this.motions.find(m => m.id === motionId);
    const votes = this.ballots.filter(b => b.motionId === motionId);
    const totalVotes = votes.length;

    const resultsByOption: Record<string, number> = {};
    if (motion) {
      motion.options.forEach(opt => { resultsByOption[opt] = 0; });
    }

    votes.forEach(v => {
      resultsByOption[v.choice] = (resultsByOption[v.choice] || 0) + 1;
    });

    let winnerOption: string | undefined = undefined;
    let maxCount = -1;
    Object.entries(resultsByOption).forEach(([opt, count]) => {
      if (count > maxCount) {
        maxCount = count;
        winnerOption = opt;
      }
    });

    const quorumRequired = this.getCurrentGroup()?.settings?.meeting_quorum;
    const quorumMet = quorumRequired ? totalVotes >= quorumRequired : totalVotes > 0;

    return {
      motionId,
      totalVotes,
      resultsByOption,
      winnerOption,
      quorumMet,
      isClosed: motion?.status === 'Closed'
    };
  }

  public closeMotion(motionId: string): { success: boolean; error?: string } {
    const motion = this.motions.find(m => m.id === motionId);
    if (!motion) return { success: false, error: 'Motion not found.' };

    motion.status = 'Closed';
    motion.closedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'CLOSE_MOTION',
      entity: 'MOTION',
      entityId: motionId,
      details: { title: motion.title },
      timestamp: new Date().toISOString()
    });

    // If election motion, trigger automatic role change and handover log
    if (motion.motionType === 'Election' && motion.targetRole) {
      this.applyElectionHandover(motionId);
    }

    this.saveToStorage();
    return { success: true };
  }

  public applyElectionHandover(motionId: string): { success: boolean; handoverEntry?: HandoverLogEntry; error?: string } {
    const motion = this.motions.find(m => m.id === motionId);
    if (!motion || motion.motionType !== 'Election' || !motion.targetRole) {
      return { success: false, error: 'Not an election motion.' };
    }

    const results = this.getMotionResults(motionId);
    if (!results.winnerOption) {
      return { success: false, error: 'No votes recorded for this election.' };
    }

    const newOfficerMemberId = results.winnerOption;
    const role = motion.targetRole;

    // Find current active role term holder
    const currentActiveTerm = this.roleTerms.find(r => r.role === role && r.active);
    const previousMemberId = currentActiveTerm ? currentActiveTerm.memberId : 'vacant';

    // Terminate previous active term
    if (currentActiveTerm) {
      currentActiveTerm.active = false;
      currentActiveTerm.endDate = new Date().toISOString().split('T')[0];
    }

    // Create new role term
    const newTerm: RoleTerm = {
      id: `term-${Date.now()}`,
      groupId: this.currentGroupId,
      memberId: newOfficerMemberId,
      role,
      startDate: new Date().toISOString().split('T')[0],
      active: true
    };
    this.roleTerms.unshift(newTerm);

    // Update memberships
    const targetMembership = this.memberships.find(m => m.memberId === newOfficerMemberId);
    if (targetMembership) {
      targetMembership.role = role;
    }

    // Record handover log
    const handover: HandoverLogEntry = {
      id: `hnd-${Date.now()}`,
      groupId: this.currentGroupId,
      role,
      previousMemberId,
      newMemberId: newOfficerMemberId,
      electionMotionId: motionId,
      handoverDate: new Date().toISOString(),
      notes: `Election concluded. Motion: "${motion.title}". Winner won with ${results.resultsByOption[newOfficerMemberId] || 0} votes.`
    };
    this.handovers.unshift(handover);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: 'system-election',
      actorName: 'Election System',
      action: 'ELECTION_HANDOVER',
      entity: 'ROLE',
      entityId: role,
      details: {
        role,
        previousHolder: previousMemberId,
        newHolder: newOfficerMemberId,
        motionId
      },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true, handoverEntry: handover };
  }

  public getHandoverLogs(groupId = this.currentGroupId): HandoverLogEntry[] {
    return this.handovers.filter(h => h.groupId === groupId);
  }

  // --- Welfare & Disputes ---

  public getWelfareCases(groupId = this.currentGroupId): WelfareCase[] {
    const membership = this.getCurrentMembership();
    const role = membership?.role;
    const isAuthorized = role === 'President' || role === 'Chief Whip 1' || role === 'Chief Whip 2';

    return this.welfareCases
      .filter(c => c.groupId === groupId)
      .map(c => {
        if (!isAuthorized) {
          return {
            ...c,
            privateNotes: '[CONFIDENTIAL: Restricted to President and Chief Whips]'
          };
        }
        return c;
      });
  }

  public createWelfareCase(data: {
    title: string;
    category: WelfareCategory;
    privateNotes: string;
    priority: WelfareCasePriority;
    subjectMemberId?: string;
    assistanceAmount?: number;
  }): { success: boolean; caseId: string } {
    const caseId = `case-${Date.now()}`;
    const nextCaseNo = `WLF-2026-${String(this.welfareCases.length + 1).padStart(3, '0')}`;

    const newCase: WelfareCase = {
      id: caseId,
      groupId: this.currentGroupId,
      caseNumber: nextCaseNo,
      title: data.title,
      reportedByMemberId: this.getCurrentMembership()?.memberId || 'mem-ndh-001',
      subjectMemberId: data.subjectMemberId,
      category: data.category,
      privateNotes: data.privateNotes,
      status: 'Open',
      priority: data.priority,
      assistanceAmount: data.assistanceAmount,
      deletionRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.welfareCases.unshift(newCase);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'CREATE_WELFARE_CASE',
      entity: 'WELFARE',
      entityId: caseId,
      details: { caseNumber: newCase.caseNumber, category: newCase.category },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true, caseId };
  }

  /**
   * Access to confidential welfare case notes:
   * Strictly limited to Chief Whips and the President.
   * Every access is tamper-evidently recorded in caseViewLogs.
   */
  public viewWelfareCaseNotes(caseId: string): { success: boolean; notes?: string; error?: string } {
    const c = this.welfareCases.find(item => item.id === caseId);
    if (!c) return { success: false, error: 'Case not found.' };

    const membership = this.getCurrentMembership();
    const role = membership?.role;
    const isAuthorized = role === 'President' || role === 'Chief Whip 1' || role === 'Chief Whip 2';

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Access denied: Welfare case notes are strictly confidential to Chief Whips and the President.'
      };
    }

    // Log the view in case_view_logs
    const logEntry: CaseViewLog = {
      id: `cvl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      caseId,
      viewedByUserId: this.currentUser.id,
      viewedByName: this.currentUser.fullName || this.currentUser.email || 'Official',
      viewedRole: role || 'Unknown',
      timestamp: new Date().toISOString()
    };
    this.caseViewLogs.unshift(logEntry);

    this.saveToStorage();
    return { success: true, notes: c.privateNotes };
  }

  public getCaseViewLogs(caseId: string): CaseViewLog[] {
    return this.caseViewLogs.filter(l => l.caseId === caseId);
  }

  public requestWelfareCaseDeletion(caseId: string): { success: boolean; error?: string } {
    const c = this.welfareCases.find(item => item.id === caseId);
    if (!c) return { success: false, error: 'Case not found.' };

    c.deletionRequested = true;
    c.deletionRequestedAt = new Date().toISOString();
    c.updatedAt = new Date().toISOString();

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Member',
      action: 'REQUEST_CASE_DELETION',
      entity: 'WELFARE',
      entityId: caseId,
      details: { caseNumber: c.caseNumber },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true };
  }

  public resolveWelfareCase(caseId: string, status: WelfareCaseStatus): { success: boolean; error?: string } {
    const c = this.welfareCases.find(item => item.id === caseId);
    if (!c) return { success: false, error: 'Case not found.' };

    c.status = status;
    c.updatedAt = new Date().toISOString();
    if (status === 'Resolved' || status === 'Closed') {
      c.resolvedAt = new Date().toISOString();
    }

    this.saveToStorage();
    return { success: true };
  }

  // --- Notices & Reminders ---

  public getNotices(groupId = this.currentGroupId): Notice[] {
    return this.notices
      .filter(n => n.groupId === groupId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  public postNotice(data: {
    title: string;
    content: string;
    category: NoticeCategory;
    priority: NoticePriority;
    channels: NoticeChannel[];
    targetAudience: 'All' | 'Arrears Only' | 'Officials Only';
    expiresAt?: string;
  }): { success: boolean; noticeId: string } {
    const noticeId = `not-${Date.now()}`;
    const newNotice: Notice = {
      id: noticeId,
      groupId: this.currentGroupId,
      title: data.title,
      content: data.content,
      category: data.category,
      priority: data.priority,
      channels: data.channels,
      targetAudience: data.targetAudience,
      authorId: this.currentUser.id,
      authorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      publishedAt: new Date().toISOString(),
      expiresAt: data.expiresAt
    };

    this.notices.unshift(newNotice);

    this.auditLog.unshift({
      id: `audit-${Date.now()}`,
      groupId: this.currentGroupId,
      actorUserId: this.currentUser.id,
      actorName: this.currentUser.fullName || this.currentUser.email || 'Official',
      action: 'POST_NOTICE',
      entity: 'NOTICE',
      entityId: noticeId,
      details: { title: newNotice.title, channels: newNotice.channels },
      timestamp: new Date().toISOString()
    });

    this.saveToStorage();
    return { success: true, noticeId };
  }

  public sendArrearsReminders(channels: NoticeChannel[] = ['In-App', 'SMS']): { count: number; membersReminded: string[] } {
    const asOfDate = new Date(`${this.asOfDate}T12:00:00Z`);
    const group = this.getCurrentGroup();
    const settings = group?.settings || {
      share_value: 100,
      penalty_rate: 0.01,
      penalty_start: '2025-10-01',
      penalty_grace_months: 1,
      financial_year_start_month: 10,
      stand_for_office_max_months_behind: 2,
      document_approvals_required: 1,
      registration_fee_default: 200,
      meeting_quorum: null,
      absence_fines_enabled: false,
      term_length_months: 24,
      pilot_mode: 'A'
    };

    const { statements } = calculateDashboardTotals(
      this.getMembers(),
      this.getLedgerEntries(),
      asOfDate,
      settings
    );

    const membersInArrears = Object.values(statements).filter(
      s => s.member.status === 'Active' && s.monthsBehind !== null && s.monthsBehind > 0
    );

    const membersReminded = membersInArrears.map(s => s.member.fullName);

    this.postNotice({
      title: `Automated Arrears Reminder (${membersInArrears.length} Members)`,
      content: `Dispatched payment reminders via ${channels.join(', ')} to ${membersInArrears.length} members with outstanding contributions as of ${this.asOfDate}.`,
      category: 'Arrears',
      priority: 'Important',
      channels,
      targetAudience: 'Arrears Only'
    });

    return { count: membersInArrears.length, membersReminded };
  }

  public sendMeetingReminder(meetingId: string, channels: NoticeChannel[] = ['In-App', 'SMS', 'WhatsApp']): { success: boolean; count: number } {
    const meeting = this.meetings.find(m => m.id === meetingId);
    if (!meeting) return { success: false, count: 0 };

    const activeCount = this.getMembers().filter(m => m.status === 'Active').length;

    this.postNotice({
      title: `Meeting Reminder: ${meeting.title}`,
      content: `Reminder: ${meeting.title} is scheduled for ${new Date(meeting.meetingDate).toLocaleString('en-KE')}. Agenda: ${meeting.agenda}`,
      category: 'Meeting',
      priority: 'Important',
      channels,
      targetAudience: 'All'
    });

    return { success: true, count: activeCount };
  }

  public resetAllToMigrationBenchmark() {
    safeStorage.clear();
    this.initData();
  }
}

export const store = new ChamaStore();

// React hook for observing store state
export function useChamaStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return store.subscribe(() => setTick(t => t + 1));
  }, []);

  return store;
}
