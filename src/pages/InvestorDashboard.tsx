import React, { useState, useMemo, useCallback } from 'react';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateInvestorSummary, calculateInvestorMetrics } from '../utils/investorCalculations';
import { Users, BarChart2, TrendingUp, TrendingDown, Plus, IndianRupee, ChevronLeft, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorForm from '../components/InvestorForm';
import InvestorsTable from '../components/InvestorsTable';
import SummaryCard from '../components/SummaryCard';

const InvestorDashboard: React.FC = () => {
  const { investors, isLoading } = useInvestors();
  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const summary = useMemo(() => calculateInvestorSummary(investors), [investors]);

  const exportCSV = useCallback(() => {
    const headers = ['Investor Name', 'Investment Type', 'Invested Amount', 'Monthly Interest', 'Accumulated Profit', 'Total Paid', 'Pending Profit', 'Missed Months', 'Status', 'Start Date'];
    const rows = investors.map(inv => {
      const m = calculateInvestorMetrics(inv);
      const interestPaid = inv.payments.filter(p => p.payment_type === 'Interest' || p.payment_type === 'Profit' || !p.payment_type).reduce((s, p) => s + p.amount, 0);
      const pending = Math.max(0, m.accumulatedProfit - interestPaid);
      return [
        inv.name,
        inv.investmentType,
        inv.investmentAmount,
        m.monthlyProfit.toFixed(2),
        m.accumulatedProfit.toFixed(2),
        m.totalPaid,
        pending.toFixed(2),
        m.missedMonths,
        m.status,
        new Date(inv.startDate).toLocaleDateString(),
      ].map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [investors]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overallProfitLossColor = summary.overallProfitLoss >= 0 ? 'text-success' : 'text-destructive';

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      <Link to="/" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-200">
        <ChevronLeft size={16} className="mr-1" />
        {t('Back to Dashboard')}
      </Link>
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Investor Payment Dashboard')}</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={exportCSV} className="btn btn-secondary text-xs sm:text-sm flex-1 sm:flex-none">
            <Download size={16} className="mr-1.5" />
            {t('Export')}
          </button>
          <button onClick={() => setIsFormOpen(true)} className="btn btn-primary text-xs sm:text-sm flex-1 sm:flex-none">
            <Plus size={16} className="mr-1.5" />
            {t('Add New Investor')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <SummaryCard icon={Users} title={t('Total Investors')} value={summary.totalInvestors} />
        <SummaryCard icon={IndianRupee} title={t('Total Investment Amount')} value={summary.totalInvestment} isCurrency />
        <SummaryCard icon={TrendingUp} title={t('Total Profit Earned')} value={summary.totalProfitEarned} isCurrency />
        <SummaryCard icon={BarChart2} title={t('Total Paid to Investors')} value={summary.totalPaidToInvestors} isCurrency />
        <SummaryCard icon={TrendingDown} title={t('Total Pending Profit')} value={summary.totalPendingProfit} isCurrency />
        <SummaryCard icon={BarChart2} title={t('Overall Profit/Loss')} value={summary.overallProfitLoss} isCurrency color={overallProfitLossColor} />
      </div>

      <div className="glass-card p-6">
        <InvestorsTable />
      </div>

      {isFormOpen && (
        <InvestorForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
};

export default InvestorDashboard;
