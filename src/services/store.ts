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
  TreasurerDebtRecord
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
  private auditInputs = { ...NDHUHULU_AUDIT_INPUTS };
  private currentUser: User = { id: MOCK_USERS[0].id, email: MOCK_USERS[0].email, fullName: MOCK_USERS[0].name, authProvider: 'google' };
  private currentGroupId: string = 'group-ndhuhulu-001';
  private asOfDate: string = '2026-10-25'; // Benchmark audit date by default
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initData();
  }

  private initData() {
    const storedGroups = localStorage.getItem(GROUPS_KEY);
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

      this.saveToStorage();
    } else {
      try {
        this.groups = JSON.parse(storedGroups);
        this.members = JSON.parse(localStorage.getItem(MEMBERS_KEY) || '[]');
        this.payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]');
        this.roleTerms = JSON.parse(localStorage.getItem(ROLE_TERMS_KEY) || '[]');
        this.memberships = JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) || '[]');
        this.auditLog = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
        this.expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
        this.mmfDeposits = JSON.parse(localStorage.getItem(MMF_DEPOSITS_KEY) || '[]');
        this.documents = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]');
        this.auditInputs = JSON.parse(localStorage.getItem(AUDIT_INPUTS_KEY) || JSON.stringify(NDHUHULU_AUDIT_INPUTS));
        this.currentGroupId = localStorage.getItem(CURRENT_GROUP_KEY) || 'group-ndhuhulu-001';
        this.asOfDate = localStorage.getItem(AS_OF_DATE_KEY) || '2026-10-25';
        
        const storedUser = localStorage.getItem(CURRENT_USER_KEY);
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
      } catch (e) {
        console.error('Error reading storage, resetting', e);
        localStorage.clear();
        this.initData();
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(this.groups));
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(this.members));
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(this.payments));
    localStorage.setItem(ROLE_TERMS_KEY, JSON.stringify(this.roleTerms));
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(this.memberships));
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(this.auditLog));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(this.expenses));
    localStorage.setItem(MMF_DEPOSITS_KEY, JSON.stringify(this.mmfDeposits));
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(this.documents));
    localStorage.setItem(AUDIT_INPUTS_KEY, JSON.stringify(this.auditInputs));
    localStorage.setItem(CURRENT_GROUP_KEY, this.currentGroupId);
    localStorage.setItem(AS_OF_DATE_KEY, this.asOfDate);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
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

  public resetAllToMigrationBenchmark() {
    localStorage.clear();
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
