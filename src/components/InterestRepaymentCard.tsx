import React, { useState, useMemo, useEffect } from 'react';
import { Loan } from '../types';
import { useLoans } from '../contexts/LoanContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { getLoanStatus, getInterestPerPeriod, getPendingInterest, getRemainingPrincipal } from '../utils/planCalculations';
import { Search, IndianRupee, User, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { sanitize } from '../utils/sanitizer';

interface InterestRepaymentCardProps {
  title: string;
}

const InterestRepaymentCard: React.FC<InterestRepaymentCardProps> = ({ title }) => {
  const { t } = useLanguage();
  const { loans, addTransaction } = useLoans();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentFor, setPaymentFor] = useState<'principal' | 'interest'>('interest');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLoans = useMemo(() => {
    return loans
      .filter(loan => loan.loanType === 'InterestRate' && getLoanStatus(loan) !== 'Completed')
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [loans]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) return [];
    return activeLoans
      .filter(l => l.customerName.toLowerCase().includes(lower) || l.phone.includes(searchTerm.trim()))
      .slice(0, 5);
  }, [searchTerm, activeLoans]);

  // Derived values for selected loan
  const periodInterest = selectedLoan ? getInterestPerPeriod(selectedLoan) : 0;
  const pendingInterest = selectedLoan ? getPendingInterest(selectedLoan) : 0;
  const remainingPrincipal = selectedLoan ? getRemainingPrincipal(selectedLoan) : 0;
  const durationUnit = selectedLoan?.durationUnit ?? 'Months';
  const periodLabel = durationUnit === 'Days' ? 'Daily' : durationUnit === 'Weeks' ? 'Weekly' : 'Monthly';

  // Auto-fill amount when switching to interest
  useEffect(() => {
    if (paymentFor === 'interest' && selectedLoan) {
      setAmount(String(periodInterest));
    } else if (paymentFor === 'principal') {
      setAmount('');
    }
  }, [paymentFor, selectedLoan, periodInterest]);

  const handleSelectLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setSearchTerm(loan.customerName);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedLoan(null);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentFor('interest');
  };

  const handleSelectLoanFromDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const loanId = e.target.value;
    if (loanId) {
      const loan = activeLoans.find(l => l.id === loanId);
      if (loan) handleSelectLoan(loan);
    } else {
      handleReset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !amount) {
      showToast('Please select a loan and enter an amount.', 'error');
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showToast('Please enter a valid positive amount.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addTransaction(selectedLoan.id, {
        amount: paymentAmount,
        payment_date: new Date(date).toISOString(),
        payment_type: paymentFor,
      });
      const typeLabel = paymentFor === 'interest' ? 'Interest' : 'Principal';
      showToast(`${typeLabel} payment of ₹${paymentAmount.toLocaleString('en-IN')} logged for ${selectedLoan.customerName}.`, 'success');
      handleReset();
    } catch {
      // Error handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <User size={14} />{t('Search for a Customer')}
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-muted-foreground" />
            <input
              id="search-interest"
              type="text"
              placeholder={t('Search by name or phone...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (selectedLoan && e.target.value !== selectedLoan.customerName) setSelectedLoan(null);
              }}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
              autoComplete="off"
            />
          </div>
          {searchTerm && searchResults.length > 0 && !selectedLoan && (
            <ul className="absolute z-10 w-full bg-card border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
              {searchResults.map(loan => (
                <li key={loan.id} onClick={() => handleSelectLoan(loan)} className="px-4 py-2 hover:bg-muted cursor-pointer text-sm">
                  {sanitize(loan.customerName)} ({sanitize(loan.phone)})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center my-1 text-xs text-muted-foreground">OR</div>

        {/* Dropdown */}
        <div>
          <label htmlFor="select-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <User size={14} />{t('Select a Customer')}
          </label>
          <select
            id="select-interest"
            value={selectedLoan ? selectedLoan.id : ''}
            onChange={handleSelectLoanFromDropdown}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
          >
            <option value="">{t('-- Select a loan --')}</option>
            {activeLoans.map(loan => (
              <option key={loan.id} value={loan.id}>
                {sanitize(loan.customerName)} ({sanitize(loan.phone)})
              </option>
            ))}
          </select>
        </div>

        {/* Loan Summary Panel */}
        {selectedLoan && (
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 animate-fade-in-fast space-y-2">
            <p className="text-sm font-bold text-primary mb-2">{sanitize(selectedLoan.customerName)}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card rounded-lg p-2 border border-border/50">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Principal</p>
                <p className="text-sm font-bold text-foreground">₹{remainingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card rounded-lg p-2 border border-border/50">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{periodLabel} Int.</p>
                <p className="text-sm font-bold text-primary">₹{periodInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card rounded-lg p-2 border border-border/50">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pending Int.</p>
                <p className={`text-sm font-bold ${pendingInterest > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  ₹{pendingInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-1 border-t border-border/30 pt-2">
              Closing Amount = ₹{(remainingPrincipal + pendingInterest).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Payment Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t('Payment For')}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentFor('interest')}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                paymentFor === 'interest'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-input hover:bg-secondary/80'
              }`}
            >
              🟢 {t('Interest')}
            </button>
            <button
              type="button"
              onClick={() => setPaymentFor('principal')}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                paymentFor === 'principal'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-input hover:bg-secondary/80'
              }`}
            >
              🔵 {t('Principal')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {paymentFor === 'interest'
              ? '💡 Interest only — principal remains unchanged'
              : '💡 Principal reduction — future interest recalculated on new balance'}
          </p>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <IndianRupee size={14} />{t('Amount')}
          </label>
          <input
            id="amount-interest"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
            disabled={!selectedLoan || isSubmitting}
            min="0.01"
            step="0.01"
          />
          {selectedLoan && paymentFor === 'interest' && (
            <div className="flex flex-col gap-1 mt-1">
              <button
                type="button"
                onClick={() => setAmount(String(periodInterest))}
                className="text-xs text-primary hover:underline text-left"
              >
                Auto-fill {periodLabel.toLowerCase()} interest: ₹{periodInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </button>
              {pendingInterest > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(pendingInterest))}
                  className="text-xs text-destructive hover:underline text-left"
                >
                  Pay all pending interest: ₹{pendingInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <Calendar size={14} />{t('Date')}
          </label>
          <input
            id="date-interest"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
            disabled={!selectedLoan || isSubmitting}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!selectedLoan || !amount || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle size={16} className="mr-2" />}
          {paymentFor === 'interest' ? t('Log Interest Payment') : t('Log Principal Payment')}
        </button>
      </form>
    </div>
  );
};

export default InterestRepaymentCard;
