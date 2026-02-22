import { Loan, Transaction } from '../types';

export const calculateAmountPaid = (transactions: Transaction[]): number => {
  if (!transactions) return 0;
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
};

// ── Per-loan cache to avoid redundant heavy calculations ──
const interestCache = new WeakMap<Loan, { result: ReturnType<typeof getInterestRateCalculationDetails>; hash: string }>();

const getLoanHash = (loan: Loan): string => {
  const txnHash = loan.transactions
    ? loan.transactions.map(t => `${t.id}:${t.amount}:${t.payment_date}:${t.payment_type}`).join('|')
    : '';
  return `${loan.id}:${loan.loanAmount}:${loan.interestRate}:${loan.startDate}:${loan.durationUnit}:${loan.durationValue}:${txnHash}`;
};

const getCachedInterestDetails = (loan: Loan) => {
  const hash = getLoanHash(loan);
  const cached = interestCache.get(loan);
  if (cached && cached.hash === hash) return cached.result;
  const result = getInterestRateCalculationDetails(loan);
  interestCache.set(loan, { result, hash });
  return result;
};

export const calculateFinalDueDate = (loan: Loan): Date | null => {
  const startDate = new Date(loan.startDate);
  if (isNaN(startDate.getTime())) return null;
  const finalDate = new Date(startDate);

  switch (loan.loanType) {
    case 'Finance':
      if (!loan.durationInMonths) return null;
      finalDate.setMonth(startDate.getMonth() + loan.durationInMonths);
      return finalDate;
    case 'Tender':
      if (!loan.durationInDays) return null;
      finalDate.setDate(startDate.getDate() + loan.durationInDays);
      return finalDate;
    case 'InterestRate':
      if (!loan.durationValue || !loan.durationUnit) return null;
      switch (loan.durationUnit) {
        case 'Days': finalDate.setDate(startDate.getDate() + loan.durationValue); break;
        case 'Weeks': finalDate.setDate(startDate.getDate() + loan.durationValue * 7); break;
        case 'Months': finalDate.setMonth(startDate.getMonth() + loan.durationValue); break;
      }
      return finalDate;
    default: return null;
  }
};

/**
 * SIMPLE INTEREST ONLY — principal NEVER increases due to interest.
 *
 * Rate is always entered as MONTHLY rate (₹X per ₹100 per month).
 * Duration unit controls collection frequency; rate is prorated accordingly:
 *   - Monthly : interestPerPeriod = principal × (rate / 100)
 *   - Weekly  : interestPerPeriod = principal × (rate / 100) / 4
 *   - Daily   : interestPerPeriod = principal × (rate / 100) / 30
 *
 * Principal is reduced ONLY by principal payments.
 * Pending interest = total interest accrued − total interest paid.
 * Balance = remainingPrincipal + pendingInterest.
 */
const PERIODS_PER_MONTH: Record<string, number> = {
  Months: 1,
  Weeks: 4,
  Days: 30,
};

const getInterestRateCalculationDetails = (loan: Loan) => {
  const transactions = loan.transactions
    ? [...loan.transactions].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    : [];

  const monthlyRate = loan.interestRate || 0;
  const durationUnit = loan.durationUnit || 'Months';
  const periodsPerMonth = PERIODS_PER_MONTH[durationUnit] ?? 1;
  // Rate per collection period (always derived from monthly rate)
  const ratePerPeriod = monthlyRate / periodsPerMonth;

  const startDate = new Date(loan.startDate);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separate payment types; legacy (no type) treated as interest
  const principalPayments = transactions.filter(tx => tx.payment_type === 'principal');
  const interestPayments = transactions.filter(tx => tx.payment_type === 'interest' || !tx.payment_type);

  const totalPrincipalPaid = principalPayments.reduce((sum, tx) => sum + tx.amount, 0);

  // Build a timeline of principal payments sorted by date
  const sortedPrincipalPayments = [...principalPayments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  // Helper: advance a date by one collection period
  const addOnePeriod = (date: Date): Date => {
    const d = new Date(date);
    switch (durationUnit) {
      case 'Days':   d.setDate(d.getDate() + 1); break;
      case 'Weeks':  d.setDate(d.getDate() + 7); break;
      case 'Months':
      default:       d.setMonth(d.getMonth() + 1); break;
    }
    return d;
  };

  let periodsElapsed = 0;
  let totalInterestAccrued = 0;

  // Walk period by period and accumulate interest on the principal at that time
  let periodStart = new Date(startDate);
  let periodEnd = addOnePeriod(periodStart);
  let runningPrincipal = loan.loanAmount;

  while (periodStart < today) {
    if (periodEnd <= today) {
      // Full period elapsed — calculate interest FIRST on current principal
      const interestForPeriod = runningPrincipal * (ratePerPeriod / 100);
      totalInterestAccrued += interestForPeriod;
      periodsElapsed++;
    }

    // Apply principal payments AFTER interest calc — affects next period onward
    for (const pp of sortedPrincipalPayments) {
      const ppDate = new Date(pp.payment_date);
      ppDate.setHours(0, 0, 0, 0);
      if (ppDate >= periodStart && ppDate < periodEnd && ppDate <= today) {
        runningPrincipal = Math.max(0, runningPrincipal - pp.amount);
      }
    }

    periodStart = periodEnd;
    periodEnd = addOnePeriod(periodStart);
  }

  const totalInterestPaid = interestPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const pendingInterest = Math.max(0, totalInterestAccrued - totalInterestPaid);
  const finalRemainingPrincipal = Math.max(0, loan.loanAmount - totalPrincipalPaid);
  const balance = finalRemainingPrincipal + pendingInterest;

  if (balance < 0.01) return { balance: 0, pendingInterest: 0, totalInterestAccrued, remainingPrincipal: 0, periodsElapsed, nextDueDate: null, status: 'Completed' as const };

  // Next due date = start of next period after today
  let nextDueDate = new Date(startDate);
  while (nextDueDate <= today) nextDueDate = addOnePeriod(nextDueDate);

  const hasOverdueInterest = pendingInterest > 0;
  const status = hasOverdueInterest ? ('Overdue' as const) : ('Active' as const);

  return { balance, pendingInterest, totalInterestAccrued, remainingPrincipal: finalRemainingPrincipal, periodsElapsed, nextDueDate, status };
};

/**
 * Returns the interest amount per collection period for an InterestRate loan.
 * Rate is always monthly; prorated by duration unit.
 *   Monthly → rate/100
 *   Weekly  → rate/100 / 4
 *   Daily   → rate/100 / 30
 */
export const getInterestPerPeriod = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  const principalPayments = (loan.transactions || []).filter(tx => tx.payment_type === 'principal');
  const totalPrincipalPaid = principalPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const remainingPrincipal = Math.max(0, loan.loanAmount - totalPrincipalPaid);
  const monthlyRate = loan.interestRate || 0;
  const periodsPerMonth = PERIODS_PER_MONTH[loan.durationUnit || 'Months'] ?? 1;
  return remainingPrincipal * (monthlyRate / periodsPerMonth / 100);
};

export const getPendingInterest = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  return getCachedInterestDetails(loan).pendingInterest;
};

export const getRemainingPrincipal = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return loan.loanAmount;
  return getCachedInterestDetails(loan).remainingPrincipal;
};

export const calculateTotalAmount = (loan: Loan): number => {
  switch (loan.loanType) {
    case 'Finance': {
      const monthlyInterest = (loan.loanAmount || 0) * ((loan.interestRate || 0) / 100);
      const totalInterest = monthlyInterest * (loan.durationInMonths || 0);
      return (loan.loanAmount || 0) + totalInterest;
    }
    case 'Tender': return loan.loanAmount;
    case 'InterestRate': {
      const { balance } = getCachedInterestDetails(loan);
      const amountPaid = calculateAmountPaid(loan.transactions);
      return balance + amountPaid;
    }
    default: return 0;
  }
};

export const calculateBalance = (loan: Loan): number => {
  if (loan.loanType === 'InterestRate') {
    // Balance = remaining principal only (interest is shown separately)
    return getCachedInterestDetails(loan).remainingPrincipal;
  }
  const totalAmount = calculateTotalAmount(loan);
  const amountPaid = calculateAmountPaid(loan.transactions);
  return Math.max(0, totalAmount - amountPaid);
};

export const calculateLoanProfit = (loan: Loan): number => {
  switch (loan.loanType) {
    case 'Finance': return calculateTotalAmount(loan) - (loan.givenAmount || 0);
    case 'Tender': return loan.loanAmount - loan.givenAmount;
    case 'InterestRate': {
      // Profit = total interest accrued so far (accumulated profit)
      return getCachedInterestDetails(loan).totalInterestAccrued;
    }
    default: return 0;
  }
};

export const calculateInterestAmount = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  // Show per-period interest based on current remaining principal (what's due next)
  return getInterestPerPeriod(loan);
};

export const calculateNextDueDate = (loan: Loan): Date | null => {
  if (calculateBalance(loan) <= 0) return null;
  if (loan.loanType === 'InterestRate') return getCachedInterestDetails(loan).nextDueDate;
  return calculateFinalDueDate(loan);
};

export const getLoanStatus = (loan: Loan): 'Active' | 'Completed' | 'Overdue' => {
  if (calculateBalance(loan) <= 0.01) return 'Completed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finalDueDate = calculateFinalDueDate(loan);
  if (finalDueDate) {
    finalDueDate.setHours(0, 0, 0, 0);
    if (finalDueDate < today) return 'Overdue';
  }
  if (loan.loanType === 'InterestRate') {
    const { status: interestStatus } = getCachedInterestDetails(loan);
    if (interestStatus === 'Overdue') return 'Overdue';
  }
  return 'Active';
};
