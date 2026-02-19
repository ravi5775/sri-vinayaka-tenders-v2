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

const getInterestRateCalculationDetails = (loan: Loan) => {
  const transactions = loan.transactions ? [...loan.transactions].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()) : [];
  if (loan.loanAmount <= 0 && transactions.length === 0) {
    return { balance: 0, nextDueDate: null, status: 'Completed' as const };
  }

  // Separate principal payments from interest payments
  const principalPayments = transactions.filter(tx => tx.payment_type === 'principal');
  const interestPayments = transactions.filter(tx => tx.payment_type === 'interest');
  // Legacy transactions (no payment_type) are treated as interest payments
  const legacyPayments = transactions.filter(tx => !tx.payment_type);

  // Calculate principal reductions
  const totalPrincipalPaid = principalPayments.reduce((sum, tx) => sum + tx.amount, 0);
  let currentPrincipal = loan.loanAmount - totalPrincipalPaid;

  const startDate = new Date(loan.startDate);
  const today = new Date();
  let hasOverdueInterest = false;
  let monthIterator = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastFullMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Only use interest + legacy payments for monthly interest tracking
  const interestTxns = [...interestPayments, ...legacyPayments];

  while (monthIterator < lastFullMonthStart) {
    const interestForMonth = Math.max(0, currentPrincipal) * ((loan.interestRate || 0) / 100);
    const startOfMonth = new Date(monthIterator);
    const endOfMonth = new Date(monthIterator.getFullYear(), monthIterator.getMonth() + 1, 0, 23, 59, 59);
    const paidThisMonth = interestTxns
      .filter(tx => { const txDate = new Date(tx.payment_date); return txDate >= startOfMonth && txDate <= endOfMonth; })
      .reduce((sum, tx) => sum + tx.amount, 0);
    const unpaidInterest = interestForMonth - paidThisMonth;
    if (unpaidInterest > 0) { currentPrincipal += unpaidInterest; hasOverdueInterest = true; }
    else { currentPrincipal += unpaidInterest; }
    monthIterator.setMonth(monthIterator.getMonth() + 1);
  }

  const paidThisCurrentMonth = interestTxns
    .filter(tx => { const txDate = new Date(tx.payment_date); return txDate >= lastFullMonthStart && txDate <= today; })
    .reduce((sum, tx) => sum + tx.amount, 0);
  currentPrincipal -= paidThisCurrentMonth;
  const balance = Math.max(0, currentPrincipal);
  if (balance < 0.01) return { balance: 0, nextDueDate: null, status: 'Completed' as const };

  let nextDueDate = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
  if (nextDueDate <= today) nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  const status = hasOverdueInterest ? ('Overdue' as const) : ('Active' as const);
  return { balance, nextDueDate, status };
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
