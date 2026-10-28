import { Member, LedgerEntry, Group, GroupSettings, RoleTerm, MemberStatus, PaymentType, Expense, ExpenseCategory, MmfDepositEntry, DocumentRecord } from '../types';
import { formatMonthYearISO, getFinancialYear } from './calculations';
import { NDHUHULU_MEMBERS_RAW_CSV, NDHUHULU_PAYMENTS_RAW_CSV, NDHUHULU_EXPENSES_RAW_CSV, NDHUHULU_AUDIT_INPUTS } from '../data/ndhuhuluRawData';

export interface MigrationResult {
  group: Group;
  members: Member[];
  payments: LedgerEntry[];
  roleTerms: RoleTerm[];
  expenses: Expense[];
  mmfDeposits: MmfDepositEntry[];
  documents: DocumentRecord[];
  auditInputs: typeof NDHUHULU_AUDIT_INPUTS;
  unmatchedNames: string[];
  duplicateNames: string[];
  skippedRows: string[];
  logs: string[];
}

export const NDHUHULU_DEFAULT_SETTINGS: GroupSettings = {
  share_value: 100,
  penalty_rate: 0.01,
  penalty_start: '2025-10-01',
  penalty_grace_months: 1,
  financial_year_start_month: 10, // October
  stand_for_office_max_months_behind: 2,
  document_approvals_required: 1,
  registration_fee_default: 200,
  meeting_quorum: null,
  absence_fines_enabled: false,
  term_length_months: 24,
  pilot_mode: 'A',
  last_sheet_import_date: '2026-10-25',
};

export function importNdhuhuluData(): MigrationResult {
  const groupId = 'group-ndhuhulu-001';
  const logs: string[] = [];
  const skippedRows: string[] = [];
  const unmatchedNames: string[] = [];
  const duplicateNames: string[] = [];

  const group: Group = {
    id: groupId,
    name: 'Ndhuhulu Self-Help Group',
    inviteCode: 'ndhuhulu-welcome-2026',
    inviteLinkActive: true,
    settings: { ...NDHUHULU_DEFAULT_SETTINGS },
    createdAt: '2023-01-01T00:00:00Z',
  };

  // 1. Parse Members
  const memberLines = NDHUHULU_MEMBERS_RAW_CSV.trim().split('\n');
  const members: Member[] = [];
  const memberNameMap = new Map<string, Member>();
  const seenNames = new Set<string>();

  for (let i = 1; i < memberLines.length; i++) {
    const line = memberLines[i].trim();
    if (!line) continue;

    // Handle commas inside quotes or plain split
    const parts = parseCsvLine(line);
    if (parts.length < 5) continue;

    const noStr = parts[0]?.trim();
    const fullName = parts[1]?.trim();
    const rawJoinDate = parts[2]?.trim();
    const regFeeStr = parts[3]?.trim();
    const statusStr = parts[4]?.trim();
    const notes = parts[5]?.trim() || '';

    // Guard against non-member header/summary rows
    if (!noStr || isNaN(parseInt(noStr, 10)) || !fullName) {
      skippedRows.push(`Member row skipped: ${line}`);
      continue;
    }

    if (seenNames.has(fullName.toLowerCase())) {
      duplicateNames.push(fullName);
    }
    seenNames.add(fullName.toLowerCase());

    const memberNo = parseInt(noStr, 10);
    const memberId = `mem-ndh-${String(memberNo).padStart(3, '0')}`;
    const joinDate = formatMonthYearISO(rawJoinDate);
    const regFee = parseInt(regFeeStr, 10) || 0;
    const status = (statusStr as MemberStatus) || 'Active';

    const member: Member = {
      id: memberId,
      groupId,
      memberNo,
      fullName,
      joinDate,
      regFee,
      status,
      beneficiaryNotes: notes || undefined,
      createdAt: `${joinDate}-01T00:00:00Z`,
    };

    members.push(member);
    memberNameMap.set(fullName.toLowerCase(), member);
  }

  logs.push(`Imported ${members.length} members.`);

  // 2. Parse Payments
  const paymentLines = NDHUHULU_PAYMENTS_RAW_CSV.trim().split('\n');
  const payments: LedgerEntry[] = [];

  for (let i = 1; i < paymentLines.length; i++) {
    const line = paymentLines[i].trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    if (parts.length < 4) continue;

    const txNo = parts[0]?.trim();
    const dateReceived = parts[1]?.trim();
    const memberName = parts[2]?.trim();
    const amountStr = parts[3]?.trim();
    const typeStr = parts[4]?.trim();
    const periodNotes = parts[5]?.trim() || '';

    // Skip subtotal rows (e.g. ",,,71300,,") or divider rows (e.g. ",,2026 - 2027,,,")
    if (memberName === '2026 - 2027' || line.includes('2026 - 2027')) {
      skippedRows.push(`FY Divider skipped: ${line}`);
      continue;
    }
    if (!txNo && amountStr && !memberName) {
      skippedRows.push(`Subtotal row skipped: ${line}`);
      continue;
    }
    if (txNo === 'TOTALS' || line.startsWith('TOTALS')) {
      skippedRows.push(`Totals row skipped: ${line}`);
      continue;
    }

    // Must have a valid amount
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      skippedRows.push(`Invalid amount row skipped: ${line}`);
      continue;
    }

    // Match member
    const matchedMember = memberNameMap.get(memberName.toLowerCase());
    if (!matchedMember) {
      unmatchedNames.push(memberName);
      skippedRows.push(`Unmatched member name: ${memberName}`);
      continue;
    }

    const type = (typeStr as PaymentType) || 'Contribution';
    
    // Determine effective date and financial year
    let effectiveDate = dateReceived;
    if (!effectiveDate) {
      // Extract year from periodNotes if available
      const yearMatch = periodNotes.match(/\b(202[3-7])\b/);
      const estYear = yearMatch ? yearMatch[1] : '2023';
      effectiveDate = `${estYear}-01-01`;
    }

    const financialYear = getFinancialYear(effectiveDate);

    const payment: LedgerEntry = {
      id: `tx-ndh-${txNo || String(payments.length + 1).padStart(3, '0')}`,
      groupId,
      memberId: matchedMember.id,
      memberName: matchedMember.fullName,
      amount,
      type,
      dateReceived: effectiveDate,
      periodNotes,
      status: 'Confirmed', // Historical rows imported as already confirmed
      confirmedAt: `${effectiveDate}T12:00:00Z`,
      financialYear,
      createdAt: `${effectiveDate}T12:00:00Z`,
    };

    payments.push(payment);
  }

  logs.push(`Imported ${payments.length} ledger entries.`);

  // 3. Define initial roles per user confirmation
  // President: Winnie Mbidhi (mem-ndh-014)
  // Vice President: Mark Okello (Mark O. Okello - mem-ndh-016)
  // Treasurer 1: Wesley Mbidhi (mem-ndh-013)
  // Treasurer 2: Colly Oduka (Collins Oduka - mem-ndh-029)
  // Secretary: Sandra Achieng (mem-ndh-017)
  // Organizing Sec: Aaron Oduor (mem-ndh-004)
  // Chief Whip 1: Eugene Nyasio (mem-ndh-040)
  // Auditor: Noel Oduor (mem-ndh-008)

  const findMemberId = (nameQuery: string): string => {
    const m = members.find(mem => mem.fullName.toLowerCase().includes(nameQuery.toLowerCase()));
    return m ? m.id : '';
  };

  const roleDefinitions: Array<{ role: RoleTerm['role']; nameQuery: string }> = [
    { role: 'President', nameQuery: 'Winnie Mbidhi' },
    { role: 'Vice President', nameQuery: 'Mark O. Okello' },
    { role: 'Treasurer 1', nameQuery: 'Wesley Mbidhi' },
    { role: 'Treasurer 2', nameQuery: 'Collins Oduka' },
    { role: 'Secretary', nameQuery: 'Sandra Achieng' },
    { role: 'Organizing Secretary', nameQuery: 'Aaron Oduor' },
    { role: 'Chief Whip 1', nameQuery: 'Eugene Nyasio' },
    { role: 'Auditor', nameQuery: 'Noel Oduor' },
  ];

  const roleTerms: RoleTerm[] = [];
  roleDefinitions.forEach((def, index) => {
    const memId = findMemberId(def.nameQuery);
    if (memId) {
      roleTerms.push({
        id: `role-term-00${index + 1}`,
        groupId,
        memberId: memId,
        role: def.role,
        startDate: '2025-10-01',
        endDate: '2027-09-30',
        active: true,
      });
    }
  });

  // 4. Parse Expenses
  const expenseLines = NDHUHULU_EXPENSES_RAW_CSV.trim().split('\n');
  const expenses: Expense[] = [];

  for (let i = 1; i < expenseLines.length; i++) {
    const line = expenseLines[i].trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    if (parts.length < 5) continue;

    const expNo = parts[0]?.trim();
    const date = parts[1]?.trim();
    const rawCat = parts[2]?.trim();
    let category: ExpenseCategory = 'Other Group Expenses';
    if (rawCat === 'Transaction Cost') category = 'Transaction Cost';
    else if (rawCat.includes('Registration')) category = 'Group Registration Fees';
    else if (rawCat.includes('Meeting')) category = 'Meeting Expenses';
    else if (rawCat.includes('Communication')) category = 'Communication';
    else category = 'Other Group Expenses';
    const description = parts[3]?.trim();
    const amountStr = parts[4]?.trim();
    const authorizedBy = parts[5]?.trim() || 'Wesley';
    const notesReceipt = parts[6]?.trim() || '';

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue;

    expenses.push({
      id: `exp-ndh-${expNo || String(expenses.length + 1).padStart(3, '0')}`,
      groupId,
      expenseNo: expNo,
      date,
      category,
      description,
      amount,
      authorizedBy,
      notesReceipt,
      status: 'Confirmed', // Historical expenses imported as confirmed
      confirmedAt: `${date}T12:00:00Z`,
      createdAt: `${date}T12:00:00Z`,
    });
  }

  logs.push(`Imported ${expenses.length} expenses totaling ${expenses.reduce((s, e) => s + e.amount, 0)}.`);

  // 5. Seed MMF Deposits Breakdown (Total = 248,704)
  const mmfDeposits: MmfDepositEntry[] = [
    {
      id: 'mmf-dep-001',
      groupId,
      date: '2025-09-30',
      amount: 244998,
      source: 'Member Funds',
      notes: 'Historical member contributions accumulated before formalization',
      recordedBy: 'system-migration',
      confirmedBy: 'system-migration',
    },
    {
      id: 'mmf-dep-002',
      groupId,
      date: '2025-10-29',
      amount: 706,
      source: 'Penalty Fines',
      notes: 'KES 706 penalty fines collected in 2024 deposited to CIC MMF',
      recordedBy: 'system-migration',
      confirmedBy: 'system-migration',
    },
    {
      id: 'mmf-dep-003',
      groupId,
      date: '2026-02-03',
      amount: 1000,
      source: 'Treasurer Debt Repayment',
      notes: 'Antoinette Ochieng debt repayment instalment 1 deposited to MMF',
      recordedBy: 'system-migration',
      confirmedBy: 'system-migration',
    },
    {
      id: 'mmf-dep-004',
      groupId,
      date: '2026-03-26',
      amount: 1000,
      source: 'Treasurer Debt Repayment',
      notes: 'Antoinette Ochieng debt repayment instalment 2 deposited to MMF',
      recordedBy: 'system-migration',
      confirmedBy: 'system-migration',
    },
    {
      id: 'mmf-dep-005',
      groupId,
      date: '2026-04-10',
      amount: 1000,
      source: 'Member Funds',
      notes: 'Q1 member monthly contributions deposit',
      recordedBy: 'system-migration',
      confirmedBy: 'system-migration',
    }
  ];

  // 6. Seed Initial Document Records
  const documents: DocumentRecord[] = [
    {
      id: 'doc-001',
      groupId,
      title: 'Ndhuhulu Self-Help Group Constitution (2025 Revision)',
      category: 'Constitution',
      visibility: 'All members',
      currentVersionNumber: 1,
      releasedVersionNumber: 1,
      status: 'Released',
      uploadedBy: 'usr-winnie',
      uploadedByName: 'Winnie Mbidhi (President)',
      createdAt: '2025-10-01T10:00:00Z',
      updatedAt: '2025-10-01T10:00:00Z',
      versions: [
        {
          versionNumber: 1,
          fileName: 'Ndhuhulu_Constitution_2025_Final.pdf',
          fileUrl: '/docs/Ndhuhulu_Constitution_2025_Final.pdf',
          uploadedBy: 'usr-winnie',
          uploadedByName: 'Winnie Mbidhi',
          uploadedAt: '2025-10-01T10:00:00Z',
          changeSummary: 'Adopted at Annual General Meeting October 2025',
          status: 'Released',
          approvals: [
            {
              id: 'app-001',
              versionNumber: 1,
              officialUserId: 'usr-mark',
              officialName: 'Mark O. Okello (VP)',
              action: 'Approved',
              timestamp: '2025-10-02T11:00:00Z',
            }
          ]
        }
      ]
    },
    {
      id: 'doc-002',
      groupId,
      title: 'Minutes of the Annual General Meeting - Oct 2025',
      category: 'Minutes',
      visibility: 'All members',
      currentVersionNumber: 1,
      releasedVersionNumber: 1,
      status: 'Released',
      uploadedBy: 'usr-sandra',
      uploadedByName: 'Sandra Achieng (Secretary)',
      createdAt: '2025-10-15T14:00:00Z',
      updatedAt: '2025-10-15T14:00:00Z',
      versions: [
        {
          versionNumber: 1,
          fileName: 'AGM_Minutes_October_2025.pdf',
          fileUrl: '/docs/AGM_Minutes_October_2025.pdf',
          uploadedBy: 'usr-sandra',
          uploadedByName: 'Sandra Achieng',
          uploadedAt: '2025-10-15T14:00:00Z',
          changeSummary: 'Finalized minutes signed by Secretary and President',
          status: 'Released',
          approvals: [
            {
              id: 'app-002',
              versionNumber: 1,
              officialUserId: 'usr-winnie',
              officialName: 'Winnie Mbidhi (President)',
              action: 'Approved',
              timestamp: '2025-10-16T09:00:00Z',
            }
          ]
        }
      ]
    }
  ];

  return {
    group,
    members,
    payments,
    roleTerms,
    expenses,
    mmfDeposits,
    documents,
    auditInputs: NDHUHULU_AUDIT_INPUTS,
    unmatchedNames: Array.from(new Set(unmatchedNames)),
    duplicateNames: Array.from(new Set(duplicateNames)),
    skippedRows,
    logs,
  };
}

/**
 * Robust CSV line splitter that handles quotation marks.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
