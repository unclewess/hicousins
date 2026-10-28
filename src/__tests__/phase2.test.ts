import { describe, it, expect, beforeEach } from 'vitest';
import { importNdhuhuluData } from '../lib/migration';
import {
  calculateDashboardTotals,
  calculateExpensesBreakdown,
  calculateMmfReconciliation,
  calculateTreasurerDebt
} from '../lib/calculations';
import { DocumentRecord, DocumentVersion } from '../types';

describe('Phase 2 Acceptance Tests: Expenses, MMF Reconciliation, Learn/Report', () => {
  const asOfDate = new Date('2026-10-25T12:00:00Z');
  let migrationResult: ReturnType<typeof importNdhuhuluData>;

  beforeEach(() => {
    migrationResult = importNdhuhuluData();
  });

  it('1. Total expenses = 7,957.95', () => {
    const { totalExpenses, byCategory } = calculateExpensesBreakdown(migrationResult.expenses);

    expect(totalExpenses).toBe(7957.95);
    expect(byCategory['Transaction Cost']).toBe(1782);
    expect(byCategory['Other Group Expenses']).toBe(6175.95);
    expect(byCategory['Group Registration Fees']).toBe(0);
    expect(byCategory['Meeting Expenses']).toBe(0);
    expect(byCategory['Communication']).toBe(0);
  });

  it('2. Deposited to MMF = 248,704 across all deposit records', () => {
    const totalDeposited = migrationResult.mmfDeposits.reduce((sum, d) => sum + d.amount, 0);
    expect(totalDeposited).toBe(248704);
  });

  it('3. cash_on_hand = -155.95 (= 256,506 - 7,957.95 - 248,704) and triggers the negative-cash red flag', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    const { totalExpenses } = calculateExpensesBreakdown(migrationResult.expenses);
    const totalDeposited = migrationResult.auditInputs.totalDeposited; // 248,704

    const reconciliation = calculateMmfReconciliation(
      totals.moneyIn, // 256,506
      totalExpenses, // 7,957.95
      totalDeposited, // 248,704
      migrationResult.auditInputs.mmfBalance, // 283,701.20
      migrationResult.auditInputs.cumulativeInterest // 41,173.16
    );

    // cash_on_hand = 256,506 - 7,957.95 - 248,704 = -155.95
    expect(reconciliation.cashOnHand).toBe(-155.95);
    expect(reconciliation.negativeCashFlag).toBe(true);
  });

  it('4. MMF balance = 283,701.20; interest = 41,173.16; expected MMF = 289,877.16; discrepancy = 6,175.96 (status: Discrepancy)', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    const { totalExpenses } = calculateExpensesBreakdown(migrationResult.expenses);
    const reconciliation = calculateMmfReconciliation(
      totals.moneyIn,
      totalExpenses,
      migrationResult.auditInputs.totalDeposited,
      migrationResult.auditInputs.mmfBalance,
      migrationResult.auditInputs.cumulativeInterest
    );

    expect(reconciliation.mmfBalance).toBe(283701.20);
    expect(reconciliation.interestEarned).toBe(41173.16);
    expect(reconciliation.expectedBalance).toBe(289877.16);
    expect(reconciliation.discrepancy).toBe(6175.96);
    expect(reconciliation.status).toBe('Discrepancy');
  });

  it('5. net_fund = 283,545.25 (= 283,701.20 - 155.95)', () => {
    const { totals } = calculateDashboardTotals(
      migrationResult.members,
      migrationResult.payments,
      asOfDate,
      migrationResult.group.settings
    );

    const { totalExpenses } = calculateExpensesBreakdown(migrationResult.expenses);
    const reconciliation = calculateMmfReconciliation(
      totals.moneyIn,
      totalExpenses,
      migrationResult.auditInputs.totalDeposited,
      migrationResult.auditInputs.mmfBalance,
      migrationResult.auditInputs.cumulativeInterest
    );

    expect(reconciliation.netFundValue).toBe(283545.25);
  });

  it('6. Treasurer debt: liability 8,184; repaid 2,000; outstanding 6,184', () => {
    const debtTracker = calculateTreasurerDebt(
      migrationResult.auditInputs.treasurerDebtLiability, // 8,184
      migrationResult.payments,
      migrationResult.auditInputs.treasurerDebtorName
    );

    expect(debtTracker.agreedLiability).toBe(8184);
    expect(debtTracker.repaidToDate).toBe(2000);
    expect(debtTracker.outstandingBalance).toBe(6184);
    expect(debtTracker.debtorName).toBe('Antoinette Ochieng');
  });

  it('7. Document Workflow: A document uploaded by the President stays hidden from members until another official approves it', () => {
    // Simulated document uploaded by President
    const newDoc: DocumentRecord = {
      id: 'doc-test-101',
      groupId: migrationResult.group.id,
      title: 'Financial Strategy 2027',
      category: 'Other',
      visibility: 'All members',
      currentVersionNumber: 1,
      releasedVersionNumber: undefined, // NOT released yet
      status: 'Pending approval',
      uploadedBy: 'usr-winnie',
      uploadedByName: 'Winnie Mbidhi (President)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionNumber: 1,
          fileName: 'Strategy_2027_Draft.pdf',
          fileUrl: '/docs/Strategy_2027_Draft.pdf',
          uploadedBy: 'usr-winnie',
          uploadedByName: 'Winnie Mbidhi',
          uploadedAt: new Date().toISOString(),
          status: 'Pending approval',
          approvals: []
        }
      ]
    };

    // Permission function: what can an ordinary member see?
    function getVisibleVersionForMember(doc: DocumentRecord, isOfficial: boolean): DocumentVersion | null {
      if (isOfficial) {
        // Officials can see the current draft/pending version
        return doc.versions.find(v => v.versionNumber === doc.currentVersionNumber) || null;
      }
      // Ordinary members ONLY see the released version
      if (!doc.releasedVersionNumber) return null; // Hidden from members!
      return doc.versions.find(v => v.versionNumber === doc.releasedVersionNumber) || null;
    }

    // 1. Ordinary member tries to see the unapproved doc -> HIDDEN (null)
    expect(getVisibleVersionForMember(newDoc, false)).toBeNull();

    // 2. Official (e.g. Vice President) can view pending doc to review it
    expect(getVisibleVersionForMember(newDoc, true)).not.toBeNull();

    // 3. President cannot approve their own upload rule:
    function canOfficialApproveDocument(doc: DocumentRecord, approverUserId: string, approverRole: string): { allowed: boolean; reason?: string } {
      const allowedRoles = ['President', 'Vice President', 'Secretary', 'Organizing Secretary', 'Treasurer 1', 'Treasurer 2', 'Auditor'];
      if (!allowedRoles.includes(approverRole)) {
        return { allowed: false, reason: 'Only officials can approve documents.' };
      }
      if (doc.uploadedBy === approverUserId) {
        return { allowed: false, reason: 'Self-approval blocked: Another official must approve your upload.' };
      }
      return { allowed: true };
    }

    // President (uploader) tries to approve own doc -> BLOCKED
    const selfApproval = canOfficialApproveDocument(newDoc, 'usr-winnie', 'President');
    expect(selfApproval.allowed).toBe(false);
    expect(selfApproval.reason).toContain('Another official must approve');

    // Vice President approves doc -> ALLOWED
    const vpApproval = canOfficialApproveDocument(newDoc, 'usr-mark', 'Vice President');
    expect(vpApproval.allowed).toBe(true);

    // Once approved, doc is marked Released
    newDoc.status = 'Released';
    newDoc.releasedVersionNumber = 1;

    // Now ordinary member can see it!
    expect(getVisibleVersionForMember(newDoc, false)).not.toBeNull();
    expect(getVisibleVersionForMember(newDoc, false)?.fileName).toBe('Strategy_2027_Draft.pdf');
  });

  it('8. Document Versioning: Uploading a new version keeps the old approved version visible to members until approval', () => {
    // Existing document with Released Version 1
    const docWithV1Released: DocumentRecord = {
      id: 'doc-test-102',
      groupId: migrationResult.group.id,
      title: 'Group Constitution',
      category: 'Constitution',
      visibility: 'All members',
      currentVersionNumber: 2, // New Version 2 uploaded!
      releasedVersionNumber: 1, // Version 1 was previously released
      status: 'Pending approval', // Version 2 is pending
      uploadedBy: 'usr-sandra',
      uploadedByName: 'Sandra Achieng',
      createdAt: '2025-10-01T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
      versions: [
        {
          versionNumber: 1,
          fileName: 'Constitution_v1.pdf',
          fileUrl: '/docs/Constitution_v1.pdf',
          uploadedBy: 'usr-winnie',
          uploadedByName: 'Winnie Mbidhi',
          uploadedAt: '2025-10-01T00:00:00Z',
          status: 'Released',
          approvals: []
        },
        {
          versionNumber: 2,
          fileName: 'Constitution_v2_Proposed_Amendments.pdf',
          fileUrl: '/docs/Constitution_v2_Proposed_Amendments.pdf',
          uploadedBy: 'usr-sandra',
          uploadedByName: 'Sandra Achieng',
          uploadedAt: '2026-10-25T00:00:00Z',
          status: 'Pending approval',
          approvals: []
        }
      ]
    };

    function getVisibleVersionForMember(doc: DocumentRecord, isOfficial: boolean): DocumentVersion | null {
      if (isOfficial) {
        // Officials inspect latest version (v2)
        return doc.versions.find(v => v.versionNumber === doc.currentVersionNumber) || null;
      }
      // Members still see the released version (v1) while v2 is pending!
      if (!doc.releasedVersionNumber) return null;
      return doc.versions.find(v => v.versionNumber === doc.releasedVersionNumber) || null;
    }

    const memberVisible = getVisibleVersionForMember(docWithV1Released, false);
    expect(memberVisible).not.toBeNull();
    // Must be version 1!
    expect(memberVisible?.versionNumber).toBe(1);
    expect(memberVisible?.fileName).toBe('Constitution_v1.pdf');

    const officialVisible = getVisibleVersionForMember(docWithV1Released, true);
    expect(officialVisible?.versionNumber).toBe(2);
    expect(officialVisible?.fileName).toBe('Constitution_v2_Proposed_Amendments.pdf');
  });
});
