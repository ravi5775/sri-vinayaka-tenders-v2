import { Loan, Transaction } from '../types';

export const calculateAmountPaid = (transactions: Transaction[]): number => {
  if (!transactions) return 0;
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
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
 * Rules:
 *  - interestRate = ₹X per ₹100 per durationUnit period (i.e. rate%)
 *  - Interest per period = currentPrincipal × (rate / 100)
 *  - Principal is reduced ONLY by principal payments (sorted by date)
 *  - Pending interest = total interest accrued across periods − total interest paid
 *  - balance = remainingPrincipal + pendingInterest
 */
const getInterestRateCalculationDetails = (loan: Loan) => {
  const transactions = loan.transactions
    ? [...loan.transactions].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    : [];

  const rate = loan.interestRate || 0;
  const durationUnit = loan.durationUnit || 'Months';
  const startDate = new Date(loan.startDate);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separate payment types; legacy (no type) treated as interest
  const principalPayments = transactions.filter(tx => tx.payment_type === 'principal');
  const interestPayments = transactions.filter(tx => tx.payment_type === 'interest' || !tx.payment_type);

  const totalPrincipalPaid = principalPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const remainingPrincipal = Math.max(0, loan.loanAmount - totalPrincipalPaid);

  // Calculate number of complete periods elapsed since start date
  // We iterate period-by-period, tracking principal reductions at each boundary
  let periodsElapsed = 0;
  let totalInterestAccrued = 0;

  // Build a timeline of principal payments sorted by date
  const sortedPrincipalPayments = [...principalPayments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  // Helper: advance a date by one period
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

  // Walk period by period and accumulate interest on the principal at that time
  let periodStart = new Date(startDate);
  let periodEnd = addOnePeriod(periodStart);
  let runningPrincipal = loan.loanAmount;

  while (periodStart < today) {
    // Apply any principal payments that happened BEFORE this period started
    for (const pp of sortedPrincipalPayments) {
      const ppDate = new Date(pp.payment_date);
      ppDate.setHours(0, 0, 0, 0);
      if (ppDate >= periodStart && ppDate < periodEnd && ppDate <= today) {
        runningPrincipal = Math.max(0, runningPrincipal - pp.amount);
      }
    }

    if (periodEnd <= today) {
      // Full period elapsed
      const interestForPeriod = runningPrincipal * (rate / 100);
      totalInterestAccrued += interestForPeriod;
      periodsElapsed++;
    }
    // else: partial period in progress — no interest charged until period completes

    periodStart = periodEnd;
    periodEnd = addOnePeriod(periodStart);
  }

  const totalInterestPaid = interestPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const pendingInterest = Math.max(0, totalInterestAccrued - totalInterestPaid);
  const finalRemainingPrincipal = Math.max(0, loan.loanAmount - totalPrincipalPaid);
  const balance = finalRemainingPrincipal + pendingInterest;

  if (balance < 0.01) return { balance: 0, pendingInterest: 0, remainingPrincipal: 0, periodsElapsed, nextDueDate: null, status: 'Completed' as const };

  // Next due date = start of next period after today
  let nextDueDate = new Date(startDate);
  while (nextDueDate <= today) nextDueDate = addOnePeriod(nextDueDate);

  const hasOverdueInterest = pendingInterest > 0;
  const status = hasOverdueInterest ? ('Overdue' as const) : ('Active' as const);

  return { balance, pendingInterest, remainingPrincipal: finalRemainingPrincipal, periodsElapsed, nextDueDate, status };
};

/**
 * Returns the interest amount per period for an InterestRate loan,
 * calculated on the CURRENT remaining principal (after principal payments).
 */
export const getInterestPerPeriod = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  const principalPayments = (loan.transactions || []).filter(tx => tx.payment_type === 'principal');
  const totalPrincipalPaid = principalPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const remainingPrincipal = Math.max(0, loan.loanAmount - totalPrincipalPaid);
  return remainingPrincipal * ((loan.interestRate || 0) / 100);
};

export const getPendingInterest = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  return getInterestRateCalculationDetails(loan).pendingInterest;
};

export const getRemainingPrincipal = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return loan.loanAmount;
  return getInterestRateCalculationDetails(loan).remainingPrincipal;
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
      const { balance } = getInterestRateCalculationDetails(loan);
      const amountPaid = calculateAmountPaid(loan.transactions);
      return balance + amountPaid;
    }
    default: return 0;
  }
};

export const calculateBalance = (loan: Loan): number => {
  if (loan.loanType === 'InterestRate') return getInterestRateCalculationDetails(loan).balance;
  const totalAmount = calculateTotalAmount(loan);
  const amountPaid = calculateAmountPaid(loan.transactions);
  return Math.max(0, totalAmount - amountPaid);
};

export const calculateLoanProfit = (loan: Loan): number => {
  switch (loan.loanType) {
    case 'Finance': return calculateTotalAmount(loan) - (loan.givenAmount || 0);
    case 'Tender': return loan.loanAmount - loan.givenAmount;
    case 'InterestRate': {
      const totalLiability = calculateTotalAmount(loan);
      return Math.max(0, totalLiability - (loan.givenAmount || loan.loanAmount));
    }
    default: return 0;
  }
};

export const calculateInterestAmount = (loan: Loan): number => {
  if (loan.loanType !== 'InterestRate') return 0;
  const totalAmount = calculateTotalAmount(loan);
  const amountPaid = calculateAmountPaid(loan.transactions);
  return Math.max(0, totalAmount - loan.loanAmount);
};

export const calculateNextDueDate = (loan: Loan): Date | null => {
  if (calculateBalance(loan) <= 0) return null;
  if (loan.loanType === 'InterestRate') return getInterestRateCalculationDetails(loan).nextDueDate;
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
    const { status: interestStatus } = getInterestRateCalculationDetails(loan);
    if (interestStatus === 'Overdue') return 'Overdue';
  }
  return 'Active';
};
