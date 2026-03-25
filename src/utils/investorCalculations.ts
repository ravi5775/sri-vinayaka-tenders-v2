import { Investor } from '../types';

interface InvestorMetrics {
  currentBalance: number;
  accumulatedProfit: number;
  totalPaid: number;
  missedMonths: number;
  monthlyProfit: number;
  status: 'On Track' | 'Delayed' | 'Closed';
}

export const calculateInvestorMetrics = (investor: Investor): InvestorMetrics => {
  if (investor.status === 'Closed') {
    const totalPaid = investor.payments.reduce((sum, p) => sum + p.amount, 0);
    const accumulatedProfit = Math.max(0, totalPaid - investor.investmentAmount);
    return { currentBalance: 0, accumulatedProfit, totalPaid, missedMonths: 0, monthlyProfit: 0, status: 'Closed' };
  }

  // Separate payments by type
  const principalPayments = investor.payments.filter(p => p.payment_type === 'Principal');
  const interestPayments = investor.payments.filter(p => p.payment_type === 'Interest' || p.payment_type === 'Profit' || !p.payment_type);

  const totalPrincipalPaid = principalPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalInterestPaid = interestPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = totalPrincipalPaid + totalInterestPaid;

  // For InterestRatePlan: principal payments reduce the investment base
  const effectiveInvestment = investor.investmentType === 'InterestRatePlan'
    ? Math.max(0, investor.investmentAmount - totalPrincipalPaid)
    : investor.investmentAmount;

  const startDate = new Date(investor.startDate);
  const today = new Date();
  const monthlyProfit = effectiveInvestment * (investor.profitRate / 100);
  let monthsCompleted = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
  if (today.getDate() < startDate.getDate()) monthsCompleted--;
  monthsCompleted = Math.max(0, monthsCompleted);

  const accumulatedProfit = monthlyProfit * monthsCompleted;
  const pendingProfit = accumulatedProfit - totalInterestPaid;
  const missedMonths = monthlyProfit > 0 ? Math.floor(Math.max(0, pendingProfit) / monthlyProfit) : 0;
  let status: 'On Track' | 'Delayed' | 'Closed' = 'On Track';
  if (pendingProfit > 0.01) status = 'Delayed';
  const currentBalance = effectiveInvestment + Math.max(0, pendingProfit);

  return { currentBalance, accumulatedProfit, totalPaid, missedMonths, monthlyProfit, status };
};

interface InvestorSummary {
  totalInvestors: number;
  totalInvestment: number;
  totalProfitEarned: number;
  totalPaidToInvestors: number;
  totalPendingProfit: number;
  overallProfitLoss: number;
}

export const calculateInvestorSummary = (investors: Investor[]): InvestorSummary => {
  const summary: InvestorSummary = {
    totalInvestors: investors.length,
    totalInvestment: 0, totalProfitEarned: 0, totalPaidToInvestors: 0, totalPendingProfit: 0, overallProfitLoss: 0,
  };

  investors.forEach(investor => {
    const metrics = calculateInvestorMetrics(investor);
    const pendingProfit = Math.max(0, metrics.accumulatedProfit - metrics.totalPaid);
    summary.totalInvestment += investor.investmentAmount;
    summary.totalPaidToInvestors += metrics.totalPaid;
    summary.totalProfitEarned += metrics.accumulatedProfit;
    // Exclude InterestRatePlan interest from total pending
    if (investor.investmentType !== 'InterestRatePlan') {
      summary.totalPendingProfit += pendingProfit;
    }
  });

  summary.overallProfitLoss = summary.totalPaidToInvestors - summary.totalInvestment;
  return summary;
};
