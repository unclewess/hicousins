import { useState, useEffect } from 'react';
import { Group, Member, LedgerEntry, RoleTerm, Membership, User, AuditLogEntry, RoleType } from '../types';
import { importNdhuhuluData } from '../lib/migration';
import { getFinancialYear } from '../lib/calculations';

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
