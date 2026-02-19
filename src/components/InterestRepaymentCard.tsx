import React, { useState, useMemo } from 'react';
import { Loan } from '../types';
import { useLoans } from '../contexts/LoanContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { calculateBalance, getLoanStatus } from '../utils/planCalculations';
import { Search, DollarSign, User, Calendar, CheckCircle, Loader2 } from 'lucide-react';
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
    return loans.filter(loan => loan.loanType === 'InterestRate' && getLoanStatus(loan) !== 'Completed')
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [loans]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedSearch = searchTerm.toLowerCase().trim();
    if (!lowercasedSearch) return [];
    return activeLoans.filter(loan =>
      loan.customerName.toLowerCase().includes(lowercasedSearch) ||
      loan.phone.includes(searchTerm.trim())
    ).slice(0, 5);
  }, [searchTerm, activeLoans]);

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

  const monthlyInterest = selectedLoan
    ? (selectedLoan.loanAmount * (selectedLoan.interestRate || 0)) / 100
    : 0;

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
    } catch (err) {
      // Error handled by context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const balance = selectedLoan ? calculateBalance(selectedLoan) : 0;

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="search-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><User size={14}/>{t('Search for a Customer')}</label>
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
                <li key={loan.id} onClick={() => handleSelectLoan(loan)} className="px-4 py-2 hover:bg-muted cursor-pointer">
                  {sanitize(loan.customerName)} ({sanitize(loan.phone)})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center my-1 text-sm text-muted-foreground">OR</div>

        <div>
          <label htmlFor="select-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><User size={14}/>{t('Select a Customer')}</label>
          <select
            id="select-interest"
            value={selectedLoan ? selectedLoan.id : ''}
            onChange={handleSelectLoanFromDropdown}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
          >
            <option value="">{t('-- Select a loan --')}</option>
            {activeLoans.map(loan => (
              <option key={loan.id} value={loan.id}>
                {sanitize(loan.customerName)} ({sanitize(loan.phone)}) - Bal: ₹{calculateBalance(loan).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {selectedLoan && (
          <div className='p-3 bg-primary/5 rounded-md border border-primary/20 animate-fade-in-fast'>
            <p className="text-sm font-semibold text-primary">{sanitize(selectedLoan.customerName)}</p>
            <p className="text-xs text-muted-foreground">Balance: ₹{balance.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Monthly Interest: ₹{monthlyInterest.toLocaleString('en-IN')}</p>
          </div>
        )}

        {/* Payment type selector */}
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
              {t('Interest')}
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
              {t('Principal')}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="amount-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><DollarSign size={14}/>{t('Amount')}</label>
          <input
            id="amount-interest"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={paymentFor === 'interest' ? `₹${monthlyInterest.toLocaleString('en-IN')}` : '0.00'}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
            disabled={!selectedLoan || isSubmitting}
            min="1"
            step="0.01"
          />
          {selectedLoan && paymentFor === 'interest' && (
            <button
              type="button"
              onClick={() => setAmount(String(monthlyInterest))}
              className="text-xs text-primary hover:underline mt-1"
            >
              {t('Fill monthly interest')}: ₹{monthlyInterest.toLocaleString('en-IN')}
            </button>
          )}
        </div>

        <div>
          <label htmlFor="date-interest" className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Calendar size={14}/>{t('Date')}</label>
          <input
            id="date-interest"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary bg-background"
            disabled={!selectedLoan || isSubmitting}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={!selectedLoan || !amount || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle size={16} className="mr-2"/>}
          {paymentFor === 'interest' ? t('Log Interest Payment') : t('Log Principal Payment')}
        </button>
      </form>
    </div>
  );
};

export default InterestRepaymentCard;
