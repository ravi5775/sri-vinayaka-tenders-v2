import React, { useMemo } from 'react';
import { Loan, LoanType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateLoanProfit, calculateAmountPaid, calculateInterestAmount } from '../utils/planCalculations';
import SimpleBarGraph from './SimpleBarGraph';

interface LoanTypeSummaryProps {
  loans: Loan[];
  loanType: LoanType;
}

const LoanTypeSummary: React.FC<LoanTypeSummaryProps> = ({ loans, loanType }) => {
  const { t } = useLanguage();

  const summary = useMemo(() => {
    return loans.reduce(
      (acc, loan) => {
        acc.totalProfit += calculateLoanProfit(loan);
        acc.totalPrincipal += loan.loanAmount;
        acc.totalGiven += loan.givenAmount;
        acc.totalCollected += calculateAmountPaid(loan.transactions);
        acc.totalInterest += calculateInterestAmount(loan);
        return acc;
      },
      { totalProfit: 0, totalPrincipal: 0, totalGiven: 0, totalCollected: 0, totalInterest: 0 }
    );
  }, [loans]);

  const graphData = [
    { label: t('Total Given'), value: summary.totalGiven, color: 'bg-warning' },
    { label: t('Total Collected'), value: summary.totalCollected, color: 'bg-primary' },
    { label: t('Total Profit'), value: summary.totalProfit, color: 'bg-success' },
  ];

  return (
    <div className="mb-6 p-5 border border-border/50 rounded-2xl bg-gradient-to-br from-muted/50 to-background animate-fade-in-up">
      <h3 className="text-lg font-bold text-foreground mb-4">
        {t('Summary for')} <span className="text-primary">{t(loanType)}</span> {t('Loans')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Metric title={t('Total Profit')} value={summary.totalProfit} />
          <Metric title={t('Total Principal')} value={summary.totalPrincipal} />
          <Metric title={t('Total Given')} value={summary.totalGiven} />
          
        </div>
        <div>
          <h4 className="font-semibold text-muted-foreground text-sm mb-3">{t('Financials')}</h4>
          <SimpleBarGraph data={graphData} />
        </div>
      </div>
    </div>
  );
};

interface MetricProps {
  title: string;
  value: number;
}
const Metric: React.FC<MetricProps> = ({ title, value }) => (
  <div className="flex justify-between items-baseline p-3 bg-card rounded-xl border border-border/50">
    <span className="text-xs text-muted-foreground font-medium">{title}:</span>
    <span className="text-sm font-bold text-foreground">
      ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
    </span>
  </div>
);

export default LoanTypeSummary;
