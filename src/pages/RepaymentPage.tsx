import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import RepaymentCard from '../components/RepaymentCard';
import InterestRepaymentCard from '../components/InterestRepaymentCard';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const RepaymentPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Link to="/" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-200">
        <ChevronLeft size={16} className="mr-1" />
        {t('Back to Dashboard')}
      </Link>

      <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('Log Repayments')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RepaymentCard title={t('Finance Payments')} loanType="Finance" />
        <RepaymentCard title={t('Tender Payments')} loanType="Tender" />
        <InterestRepaymentCard title={t('Interest Rate Payments')} />
      </div>
    </div>
  );
};

export default RepaymentPage;
