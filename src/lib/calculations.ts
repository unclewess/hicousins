import { Member, LedgerEntry, GroupSettings, MemberCalculatedStatement, DashboardTotals, MemberStatus, Expense, ExpenseCategory, MmfReconciliationSnapshot, TreasurerDebtRecord } from '../types';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Parses date string in multiple formats (e.g. "Jan-2023", "2023-01", "2023-01-15")
 * into { year: number, month: number (1-12) }
 */
export function parseMonthYear(dateStr: string): { year: number; month: number } {
  if (!dateStr) return { year: 2023, month: 1 };

  // Format "Jan-2023" or "Jan 2023"
  const textMatch = dateStr.match(/^([A-Za-z]{3})[- ]?(\d{4})$/);
  if (textMatch) {
    const monthIndex = MONTH_NAMES.findIndex(
      m => m.toLowerCase() === textMatch[1].toLowerCase()
    );
    if (monthIndex >= 0) {
      return { year: parseInt(textMatch[2], 10), month: monthIndex + 1 };
    }
  }

  // Format "2023-01" or "2023-01-15"
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) };
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  return { year: 2023, month: 1 };
}

/**
 * Normalizes "Jan-2023" or "2023-01" to standard "YYYY-MM" string.
 */
export function formatMonthYearISO(dateStr: string): string {
  const { year, month } = parseMonthYear(dateStr);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Formats { year, month } into display format like "Dec-2026"
 */
export function formatDisplayMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]}-${year}`;
}

/**
 * Derives financial year strictly from payment date (Oct to Sep).
 * E.g. 2026-09-28 -> "FY 2025-2026"
 * E.g. 2026-10-16 -> "FY 2026-2027"
 */
export function getFinancialYear(dateStr?: string, defaultYear?: number): string {
  if (!dateStr) {
    const yr = defaultYear || 2026;
    return `FY ${yr}-${yr + 1}`;
  }
  const { year, month } = parseMonthYear(dateStr);
  if (month >= 10) {
    return `FY ${year}-${year + 1}`;
  } else {
    return `FY ${year - 1}-${year}`;
  }
}

/**
 * Whole months from join month to the first day of NEXT month.
 * As-of 25 Oct 2026:
 * Next month = 1 Nov 2026.
 * Join = Jan 2023 (1 Jan 2023).
 * Total months = (2026 - 2023)*12 + (11 - 1) = 46.
 */
export function calculateMonthsDue(joinDateStr: string, asOfDate: Date): number {
  const { year: joinYear, month: joinMonth } = parseMonthYear(joinDateStr);
  const asOfYear = asOfDate.getFullYear();
  const asOfMonth = asOfDate.getMonth() + 1; // 1-12

  // First day of next month
  let nextMonthYear = asOfYear;
  let nextMonth = asOfMonth + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextMonthYear += 1;
  }

  const months = (nextMonthYear - joinYear) * 12 + (nextMonth - joinMonth);
  return Math.max(0, months);
}

/**
 * Shares = floor(total Contribution / share_value) for everyone except Never Active.
 */
export function calculateMemberShares(
  member: Member,
  memberPayments: LedgerEntry[],
  shareValue: number = 100
): number {
  if (member.status === 'Never Active') return 0;
  
  const totalContributions = memberPayments
    .filter(p => p.type === 'Contribution' && p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  return Math.floor(totalContributions / shareValue);
}

/**
 * Paid up to = join month + shares - 1 months ("Not started" if 0 shares).
 */
export function calculatePaidUpTo(joinDateStr: string, shares: number): string {
  if (shares <= 0) return 'Not started';

  const { year: joinYear, month: joinMonth } = parseMonthYear(joinDateStr);
  const totalMonths = (joinMonth - 1) + (shares - 1);
  const targetYear = joinYear + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;

  return formatDisplayMonth(targetYear, targetMonth);
}

/**
 * Months behind = max(0, months_due - shares).
 * Returns null for Left / Deceased / Never Active to show "-".
 */
export function calculateMonthsBehind(
  status: MemberStatus,
  monthsDue: number,
  shares: number
): number | null {
  if (status === 'Left' || status === 'Deceased' || status === 'Never Active') {
    return null;
  }
  return Math.max(0, monthsDue - shares);
}

/**
 * Arrears = months_behind x share_value.
 * Returns null for Left / Deceased / Never Active to show "-".
 */
export function calculateArrears(
  monthsBehind: number | null,
  shareValue: number = 100
): number | null {
  if (monthsBehind === null) return null;
  return monthsBehind * shareValue;
}

/**
 * Penalty calculation:
 * N = whole months from max(penalty_start, join month + shares months) to the first day of the CURRENT month.
 * If N > 0:
 *   penalty = round(share_value*(1+r)/r*((1+r)^N - 1) - share_value*N, 2), else 0.
 * Net penalty owed = computed + legacy "Penalty Charged" - Penalty Payments.
 */
export function calculatePenalty(
  member: Member,
  shares: number,
  memberPayments: LedgerEntry[],
  asOfDate: Date,
  settings: GroupSettings
): number {
  if (member.status === 'Left' || member.status === 'Deceased' || member.status === 'Never Active') {
    return 0;
  }

  const { year: joinYear, month: joinMonth } = parseMonthYear(member.joinDate);
  // join month + shares months
  const paidThroughMonths = (joinMonth - 1) + shares;
  const paidThroughYear = joinYear + Math.floor(paidThroughMonths / 12);
  const paidThroughMonth = (paidThroughMonths % 12) + 1; // 1-12

  const { year: penaltyStartYear, month: penaltyStartMonth } = parseMonthYear(settings.penalty_start);

  // max(penalty_start, join month + shares months)
  const isPenaltyStartLater = 
    penaltyStartYear > paidThroughYear || 
    (penaltyStartYear === paidThroughYear && penaltyStartMonth > paidThroughMonth);

  const startYear = isPenaltyStartLater ? penaltyStartYear : paidThroughYear;
  const startMonth = isPenaltyStartLater ? penaltyStartMonth : paidThroughMonth;

  // First day of the CURRENT month of asOfDate
  const currentYear = asOfDate.getFullYear();
  const currentMonth = asOfDate.getMonth() + 1;

  // N = whole months from start to first day of current month
  const N = (currentYear - startYear) * 12 + (currentMonth - startMonth);

  let computedPenalty = 0;
  if (N > 0) {
    const r = settings.penalty_rate;
    const sv = settings.share_value;
    const compoundFactor = Math.pow(1 + r, N) - 1;
    const rawVal = (sv * (1 + r) / r) * compoundFactor - (sv * N);
    computedPenalty = Math.round(rawVal * 100) / 100;
  }

  // Legacy Charged and Penalty Payments
  const legacyCharged = memberPayments
    .filter(p => p.type === 'Penalty Charged' && p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const penaltyPaid = memberPayments
    .filter(p => p.type === 'Penalty Payment' && p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const netPenalty = computedPenalty + legacyCharged - penaltyPaid;
  return Math.max(0, Math.round(netPenalty * 100) / 100);
}

/**
 * Traffic lights:
 * green = current (0 months behind)
 * yellow = 1 to 2 months behind
 * red = 3 or more months behind
 * gray = Left / Deceased / Never Active
 */
export function getTrafficLight(
  status: MemberStatus,
  monthsBehind: number | null
): { color: 'green' | 'yellow' | 'red' | 'gray'; label: string } {
  if (status === 'Never Active') {
    return { color: 'gray', label: '⬜ Never Active' };
  }
  if (status === 'Left') {
    return { color: 'gray', label: '🔒 Left' };
  }
  if (status === 'Deceased') {
    return { color: 'gray', label: '🕊 Deceased' };
  }
  if (monthsBehind === null || monthsBehind === 0) {
    return { color: 'green', label: '🟢 Current' };
  }
  if (monthsBehind <= 2) {
    return { color: 'yellow', label: `🟡 ${monthsBehind} mo behind` };
  }
  return { color: 'red', label: `🔴 ${monthsBehind} mo behind` };
}

/**
 * Calculates complete statement for a single member as of a given date.
 */
export function calculateMemberStatement(
  member: Member,
  allPayments: LedgerEntry[],
  totalGroupShares: number,
  netFundValue: number,
  asOfDate: Date,
  settings: GroupSettings
): MemberCalculatedStatement {
  const memberPayments = allPayments.filter(p => p.memberId === member.id);
  const shares = calculateMemberShares(member, memberPayments, settings.share_value);
  const monthsDue = calculateMonthsDue(member.joinDate, asOfDate);
  const monthsBehind = calculateMonthsBehind(member.status, monthsDue, shares);
  const arrears = calculateArrears(monthsBehind, settings.share_value);
  const penaltyOwed = calculatePenalty(member, shares, memberPayments, asOfDate, settings);
  const paidUpTo = calculatePaidUpTo(member.joinDate, shares);

  const ownershipPercentage = totalGroupShares > 0 && member.status !== 'Never Active'
    ? shares / totalGroupShares
    : 0;

  const estimatedPayout = Math.round(ownershipPercentage * netFundValue * 100) / 100;
  const trafficLightInfo = getTrafficLight(member.status, monthsBehind);

  return {
    member,
    shares,
    paidUpTo,
    monthsDue,
    monthsBehind,
    arrears,
    penaltyOwed,
    ownershipPercentage,
    estimatedPayout,
    trafficLight: trafficLightInfo.color,
    statusText: trafficLightInfo.label,
    payments: memberPayments.sort((a, b) => (b.dateReceived || '').localeCompare(a.dateReceived || ''))
  };
}

/**
 * Calculates whole dashboard totals and per-member statements.
 */
export function calculateDashboardTotals(
  members: Member[],
  payments: LedgerEntry[],
  asOfDate: Date,
  settings: GroupSettings,
  netFundValue: number = 0
): { totals: DashboardTotals; statements: MemberCalculatedStatement[] } {
  // Only confirmed payments
  const confirmedPayments = payments.filter(p => p.status === 'Confirmed');

  // Compute total shares first across all non-Never-Active members
  let totalShares = 0;
  members.forEach(m => {
    if (m.status !== 'Never Active') {
      const mPayments = confirmedPayments.filter(p => p.memberId === m.id);
      totalShares += calculateMemberShares(m, mPayments, settings.share_value);
    }
  });

  // Calculate each member statement
  const statements = members.map(m =>
    calculateMemberStatement(m, confirmedPayments, totalShares, netFundValue, asOfDate, settings)
  );

  let totalContributions = 0;
  let totalAdminIncome = 0;
  let totalDebtRepaid = 0;
  let totalPenaltiesCharged = 0;
  let totalPenaltiesCollected = 0;

  confirmedPayments.forEach(p => {
    if (p.type === 'Contribution') totalContributions += p.amount;
    else if (p.type === 'Admin Income') totalAdminIncome += p.amount;
    else if (p.type === 'Debt Repayment') totalDebtRepaid += p.amount;
    else if (p.type === 'Penalty Charged') totalPenaltiesCharged += p.amount;
    else if (p.type === 'Penalty Payment') totalPenaltiesCollected += p.amount;
  });

  // money_in = Contributions + Admin Income + Penalty Payments
  // Debt Repayments are NOT money in!
  const moneyIn = totalContributions + totalAdminIncome + totalPenaltiesCollected;

  let activeMembersCount = 0;
  let membersInArrearsCount = 0;
  let totalActiveArrears = 0;
  let leftCount = 0;
  let deceasedCount = 0;
  let neverActiveCount = 0;

  statements.forEach(stmt => {
    if (stmt.member.status === 'Active') {
      activeMembersCount += 1;
      if (stmt.monthsBehind !== null && stmt.monthsBehind > 0) {
        membersInArrearsCount += 1;
        totalActiveArrears += (stmt.arrears || 0);
      }
    } else if (stmt.member.status === 'Left') {
      leftCount += 1;
    } else if (stmt.member.status === 'Deceased') {
      deceasedCount += 1;
    } else if (stmt.member.status === 'Never Active') {
      neverActiveCount += 1;
    }
  });

  return {
    totals: {
      activeMembersCount,
      totalShares,
      totalContributions,
      totalAdminIncome,
      totalDebtRepaid,
      totalPenaltiesCharged,
      totalPenaltiesCollected,
      moneyIn,
      membersInArrearsCount,
      totalActiveArrears,
      leftCount,
      deceasedCount,
      neverActiveCount,
    },
    statements
  };
}

// ============================================================================
// Phase 2 Calculations: Expenses, MMF Reconciliation, and Treasurer Debt
// ============================================================================

/**
 * Computes expense breakdowns and totals for confirmed expenses.
 */
export function calculateExpensesBreakdown(expenses: Expense[]): {
  totalExpenses: number;
  byCategory: Record<ExpenseCategory, number>;
} {
  const confirmed = expenses.filter(e => e.status === 'Confirmed');
  const byCategory: Record<ExpenseCategory, number> = {
    'Transaction Cost': 0,
    'Group Registration Fees': 0,
    'Meeting Expenses': 0,
    'Communication': 0,
    'Other Group Expenses': 0,
  };

  let totalExpenses = 0;
  confirmed.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    totalExpenses += e.amount;
  });

  totalExpenses = Math.round(totalExpenses * 100) / 100;
  for (const cat in byCategory) {
    byCategory[cat as ExpenseCategory] = Math.round(byCategory[cat as ExpenseCategory] * 100) / 100;
  }

  return { totalExpenses, byCategory };
}

/**
 * Computes MMF reconciliation and net fund value.
 * cash_on_hand = money_in - Expenses - Deposited to MMF
 * expected_MMF = deposited + interest
 * discrepancy = |MMF balance - expected_MMF|
 * net_fund = MMF balance + cash_on_hand
 */
export function calculateMmfReconciliation(
  moneyIn: number,
  totalExpenses: number,
  totalDeposited: number,
  mmfBalance: number,
  interestEarned: number,
  asOfDateStr: string = '2026-10-25'
): MmfReconciliationSnapshot {
  const rawCash = moneyIn - totalExpenses - totalDeposited;
  const cashOnHand = Math.round(rawCash * 100) / 100;
  const negativeCashFlag = cashOnHand < 0;

  const expectedBalance = Math.round((totalDeposited + interestEarned) * 100) / 100;
  const discrepancy = Math.round(Math.abs(mmfBalance - expectedBalance) * 100) / 100;
  const status: 'Balanced' | 'Discrepancy' = discrepancy < 1 ? 'Balanced' : 'Discrepancy';

  const rawNetFund = mmfBalance + cashOnHand;
  const netFundValue = Math.round(rawNetFund * 100) / 100;

  return {
    groupId: 'group-ndhuhulu-001',
    asOfDate: asOfDateStr,
    totalDeposited,
    mmfBalance,
    interestEarned,
    expectedBalance,
    discrepancy,
    status,
    cashOnHand,
    netFundValue,
    negativeCashFlag,
    notes: negativeCashFlag
      ? `Negative Cash Flag (KES ${cashOnHand.toFixed(2)}): The treasurer deposited more money into the MMF than net money collected from members (using their own money to round up/cover deposit costs). Reconcile treasurer reimbursement.`
      : status === 'Discrepancy'
      ? "Discrepancy may be caused by: (1) Antoinette's outstanding KES 6,184 debt not yet in MMF (2) Accrued interest timing (3) Undeposited cash on hand."
      : undefined
  };
}

/**
 * Computes treasurer debt balance (Antoinette Ochieng).
 * outstanding = agreed liability - repaid to date
 */
export function calculateTreasurerDebt(
  agreedLiability: number,
  payments: LedgerEntry[],
  debtorName: string = 'Antoinette Ochieng'
): TreasurerDebtRecord {
  const repaidToDate = payments
    .filter(p => p.type === 'Debt Repayment' && p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = agreedLiability - repaidToDate;

  return {
    agreedLiability,
    repaidToDate,
    outstandingBalance,
    debtorName,
  };
}
