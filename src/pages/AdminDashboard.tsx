import React, { useState, useMemo } from 'react';
import { useLoans } from '../contexts/LoanContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import LoansTable from '../components/LoansTable';
import SummaryCard from '../components/SummaryCard';
import LoanTypeSummary from '../components/LoanTypeSummary';
import { generateCSV } from '../utils/csvUtils';
import { Plus, Download, Search, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateLoanProfit, calculateAmountPaid, calculateBalance } from '../utils/planCalculations';
import { LoanType } from '../types';

const AdminDashboard: React.FC = () => {
  const { loans, isLoading } = useLoans();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | LoanType>('All');

  const filteredLoans = useMemo(() => {
    let loansToFilter = loans;
    if (activeFilter !== 'All') {
      loansToFilter = loans.filter(loan => loan.loanType === activeFilter);
    }
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return loansToFilter;
    const lowercasedSearch = trimmedSearch.toLowerCase();
    return loansToFilter.filter(loan => {
      const nameMatch = loan.customerName.trim().toLowerCase().includes(lowercasedSearch);
      const phoneMatch = loan.phone ? loan.phone.includes(trimmedSearch) : false;
      return nameMatch || phoneMatch;
    });
  }, [loans, searchTerm, activeFilter]);

  const overallSummary = useMemo(() => {
    let totalProfit = 0;
    let totalCollected = 0;
    let totalPending = 0;
    loans.forEach(loan => {
      totalProfit += calculateLoanProfit(loan);
      totalCollected += calculateAmountPaid(loan.transactions);
      if (loan.loanType !== 'InterestRate') {
        totalPending += calculateBalance(loan);
      }
    });
    return { totalProfit, totalCollected, totalPending };
  }, [loans]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filterButtons: Array<'All' | LoanType> = ['All', 'Finance', 'Tender', 'InterestRate'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <SummaryCard icon={TrendingUp} title={t('Total Expected Profit')} value={overallSummary.totalProfit} isCurrency />
        <SummaryCard icon={IndianRupee} title={t('Total Collected')} value={overallSummary.totalCollected} isCurrency />
        <SummaryCard icon={TrendingDown} title={t('Total Pending')} value={overallSummary.totalPending} isCurrency color="text-destructive" />
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('All Loans')}</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={() => navigate('/loan/new')} className="btn btn-primary flex-1 sm:flex-none text-xs sm:text-sm">
              <Plus size={16} className="mr-1.5" />
              {t('Add New Loan')}
            </button>
            <button onClick={() => generateCSV(filteredLoans, t)} className="btn btn-secondary flex-1 sm:flex-none text-xs sm:text-sm">
              <Download size={16} className="mr-1.5" />
              {t('Export')}
            </button>
          </div>
        </div>

        <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-border/50 pb-3 sm:pb-4">
          {filterButtons.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeFilter === filter
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t(filter)}
            </button>
          ))}
        </div>

        {activeFilter !== 'All' && (
          <LoanTypeSummary loans={filteredLoans} loanType={activeFilter} />
        )}

        <div className="mb-5 relative">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('Search by name or phone...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background transition-all duration-200 text-sm"
          />
        </div>

        <LoansTable loans={filteredLoans} />
      </div>
    </div>
  );
};

export default AdminDashboard;
