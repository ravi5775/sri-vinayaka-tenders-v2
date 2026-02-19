import React, { useState, useMemo } from 'react';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateInvestorSummary } from '../utils/investorCalculations';
import { Users, BarChart2, TrendingUp, TrendingDown, Plus, IndianRupee, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorForm from '../components/InvestorForm';
import InvestorsTable from '../components/InvestorsTable';
import SummaryCard from '../components/SummaryCard';

const InvestorDashboard: React.FC = () => {
  const { investors, isLoading } = useInvestors();
  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const summary = useMemo(() => calculateInvestorSummary(investors), [investors]);

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
        <button onClick={() => setIsFormOpen(true)} className="btn btn-primary text-xs sm:text-sm w-full sm:w-auto">
          <Plus size={16} className="mr-1.5" />
          {t('Add New Investor')}
        </button>
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
