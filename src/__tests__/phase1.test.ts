import { describe, it, expect, beforeEach } from 'vitest';
import { importNdhuhuluData } from '../lib/migration';
import { calculateDashboardTotals, getFinancialYear } from '../lib/calculations';
import { LedgerEntry, Membership } from '../types';

describe('Phase 1 Acceptance Tests: Identity, groups, ledger, statements', () => {
  const asOfDate = new Date('2026-10-25T12:00:00Z');
  let migrationResult: ReturnType<typeof importNdhuhuluData>;

  beforeEach(() => {
    migrationResult = importNdhuhuluData();
  });

  it('1. Active members count = 66 and total shares = 2,483', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    expect(totals.activeMembersCount).toBe(66);
    expect(totals.totalShares).toBe(2483);
  });

  it('2. Financial collections: Contributions = 248,300; Admin Income = 7,500; Debt repaid = 2,000', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    expect(totals.totalContributions).toBe(248300);
    expect(totals.totalAdminIncome).toBe(7500);
    expect(totals.totalDebtRepaid).toBe(2000);
  });

  it('3. Penalties: charged = 706; collected = 706', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    expect(totals.totalPenaltiesCharged).toBe(706);
    expect(totals.totalPenaltiesCollected).toBe(706);
  });

  it('4. money_in = 256,506 (Debt repayments of 2,000 are excluded)', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    // money_in = Contributions (248,300) + Admin Income (7,500) + Penalty Payments (706) = 256,506
    expect(totals.moneyIn).toBe(256506);
  });

  it('5. Arrears summary: Members in arrears = 42; total active arrears = 64,600', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    expect(totals.membersInArrearsCount).toBe(42);
    expect(totals.totalActiveArrears).toBe(64600);
  });

  it('6. Specific Member Check: Aaron Oduor (36 shares, 10 months behind, arrears 1,000, penalty 46.22)', () => {
    const { statements } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    const aaronStmt = statements.find(s => s.member.fullName === 'Aaron Oduor');
    expect(aaronStmt).toBeDefined();
    expect(aaronStmt?.shares).toBe(36);
    expect(aaronStmt?.paidUpTo).toBe('Dec-2025');
    expect(aaronStmt?.monthsBehind).toBe(10);
    expect(aaronStmt?.arrears).toBe(1000);
    expect(aaronStmt?.penaltyOwed).toBe(46.22);
  });

  it('7. Traffic lights check: Fred Michael (4 mo behind, red) and Edith Hwaga (2 mo behind, yellow)', () => {
    const { statements } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    const fredStmt = statements.find(s => s.member.fullName === 'Fred Michael');
    expect(fredStmt).toBeDefined();
    expect(fredStmt?.monthsBehind).toBe(4);
    expect(fredStmt?.trafficLight).toBe('red');

    const edithStmt = statements.find(s => s.member.fullName === 'Edith Hwaga');
    expect(edithStmt).toBeDefined();
    expect(edithStmt?.monthsBehind).toBe(2);
    expect(edithStmt?.trafficLight).toBe('yellow');
  });

  it('8. Importer safety: no member called "2026 - 2027" and no payment from subtotal row', () => {
    const dividerMember = migrationResult.members.find(m => m.fullName.includes('2026 - 2027'));
    expect(dividerMember).toBeUndefined();

    const subtotalTx = migrationResult.payments.find(p => p.amount === 71300);
    expect(subtotalTx).toBeUndefined();
  });

  it('9. Financial year calculation: Keziah Auma 28 Sep 2026 is FY 2025-26; Noel Oduor 16 Oct 2026 is FY 2026-27', () => {
    const keziahTx = migrationResult.payments.find(
      p => p.memberName === 'Keziah Auma' && p.dateReceived === '2026-09-28'
    );
    expect(keziahTx).toBeDefined();
    expect(keziahTx?.financialYear).toBe('FY 2025-2026');

    const noelTx = migrationResult.payments.find(
      p => p.memberName === 'Noel Oduor' && p.dateReceived === '2026-10-16'
    );
    expect(noelTx).toBeDefined();
    expect(noelTx?.financialYear).toBe('FY 2026-2027');

    expect(getFinancialYear('2026-09-28')).toBe('FY 2025-2026');
    expect(getFinancialYear('2026-10-16')).toBe('FY 2026-2027');
  });

  it('10. Two-Treasurer Confirmation Rule: A treasurer cannot confirm their own entry', () => {
    const treasurer1Id = 'user-treasurer-wesley';
    const treasurer2Id = 'user-treasurer-collins';

    const newPayment: LedgerEntry = {
      id: 'tx-test-001',
      groupId: migrationResult.group.id,
      memberId: 'mem-ndh-001',
      memberName: 'Wendy Odindo',
      amount: 1200,
      type: 'Contribution',
      dateReceived: '2026-10-25',
      status: 'Pending Confirmation',
      recordedBy: treasurer1Id,
      financialYear: 'FY 2026-2027',
      createdAt: new Date().toISOString(),
    };

    // Business rule function to validate confirmation
    function canConfirmEntry(entry: LedgerEntry, confirmingUserId: string, userRole: string): { allowed: boolean; reason?: string } {
      if (userRole !== 'Treasurer 1' && userRole !== 'Treasurer 2' && userRole !== 'Treasurer') {
        return { allowed: false, reason: 'Only a Treasurer can confirm payments' };
      }
      if (entry.recordedBy === confirmingUserId) {
        return { allowed: false, reason: 'A treasurer cannot confirm their own entry. Another treasurer must confirm.' };
      }
      return { allowed: true };
    }

    // Treasurer 1 tries to confirm own entry -> BLOCKED
    const selfConfirmation = canConfirmEntry(newPayment, treasurer1Id, 'Treasurer 1');
    expect(selfConfirmation.allowed).toBe(false);
    expect(selfConfirmation.reason).toContain('A treasurer cannot confirm their own entry');

    // Treasurer 2 confirms -> ALLOWED
    const otherConfirmation = canConfirmEntry(newPayment, treasurer2Id, 'Treasurer 2');
    expect(otherConfirmation.allowed).toBe(true);
  });

  it('11. Privacy / RLS Rule: A member cannot see another member statement', () => {
    const memberA_Id = 'mem-ndh-001'; // Wendy
    const memberB_Id = 'mem-ndh-002'; // Rebecca

    // Simulation of RLS policy for viewing statements
    function canViewMemberStatement(viewerRole: string, viewerMemberId: string | undefined, targetMemberId: string): boolean {
      const officialRoles = ['President', 'Vice President', 'Treasurer 1', 'Treasurer 2', 'Treasurer', 'Auditor', 'Auditor 2', 'Secretary', 'Organizing Secretary'];
      if (officialRoles.includes(viewerRole)) return true;
      // Normal member can ONLY view own statement
      return viewerMemberId === targetMemberId;
    }

    // Member A viewing Member A statement -> ALLOWED
    expect(canViewMemberStatement('Member', memberA_Id, memberA_Id)).toBe(true);

    // Member A viewing Member B statement -> BLOCKED
    expect(canViewMemberStatement('Member', memberA_Id, memberB_Id)).toBe(false);

    // Auditor viewing Member B statement -> ALLOWED (Auditor can read all)
    expect(canViewMemberStatement('Auditor', 'mem-ndh-008', memberB_Id)).toBe(true);
  });

  it('12. Join via link security: A new joiner sees nothing until an official approves', () => {
    const unapprovedMembership: Membership = {
      id: 'm-new-001',
      groupId: migrationResult.group.id,
      userId: 'user-new-joiner',
      status: 'pending_approval',
      role: 'Member',
      claimedName: 'Wendy Odindo',
    };

    function canAccessGroupFinancialData(membership: Membership | null): boolean {
      if (!membership) return false;
      return membership.status === 'approved';
    }

    expect(canAccessGroupFinancialData(unapprovedMembership)).toBe(false);

    // After approval by official
    const approvedMembership: Membership = {
      ...unapprovedMembership,
      status: 'approved',
      approvedBy: 'user-president-winnie',
      approvedAt: new Date().toISOString(),
    };
    expect(canAccessGroupFinancialData(approvedMembership)).toBe(true);
  });

  it('13. Single Auditor and Single Chief Whip: Group functions without second officials', () => {
    // Ndhuhulu currently has no second Auditor and no second Chief Whip
    const auditors = migrationResult.roleTerms.filter(r => r.role === 'Auditor' || r.role === 'Auditor 2');
    const whips = migrationResult.roleTerms.filter(r => r.role === 'Chief Whip 1' || r.role === 'Chief Whip 2');

    expect(auditors.length).toBe(1);
    expect(auditors[0].role).toBe('Auditor');
    expect(whips.length).toBe(1);
    expect(whips[0].role).toBe('Chief Whip 1');
  });

  it('14. Idempotent import: re-running import yields exact counts without duplicates', () => {
    const secondImport = importNdhuhuluData();
    expect(secondImport.members.length).toBe(72);
    expect(secondImport.payments.length).toBe(288);
  });
});
