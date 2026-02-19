import React, { useState, useMemo } from 'react';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { Investor, PaymentType } from '../types';
import { calculateInvestorMetrics } from '../utils/investorCalculations';
import { X, DollarSign, Calendar, MessageSquare, Check, Loader2, TrendingUp, IndianRupee, AlertCircle } from 'lucide-react';
import { sanitize } from '../utils/sanitizer';

interface InvestorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investor: Investor;
}

const InvestorPaymentModal: React.FC<InvestorPaymentModalProps> = ({ isOpen, onClose, investor }) => {
  const { addInvestorPayment } = useInvestors();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payment_type, setPaymentType] = useState<PaymentType>('Profit');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const metrics = useMemo(() => calculateInvestorMetrics(investor), [investor]);

  const pendingProfit = useMemo(() => {
    const interestPayments = investor.payments.filter(p => p.payment_type === 'Interest' || p.payment_type === 'Profit' || !p.payment_type);
    const totalInterestPaid = interestPayments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, metrics.accumulatedProfit - totalInterestPaid);
  }, [investor, metrics]);

  const principalPaid = useMemo(() => {
    return investor.payments.filter(p => p.payment_type === 'Principal').reduce((sum, p) => sum + p.amount, 0);
  }, [investor]);

  const effectiveInvestment = investor.investmentType === 'InterestRatePlan'
    ? Math.max(0, investor.investmentAmount - principalPaid)
    : investor.investmentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addInvestorPayment(investor.id, { amount: paymentAmount, payment_date: date, payment_type, remarks });
      showToast(t('Payment logged successfully!'), 'success');
      onClose();
    } catch (err) {} finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast p-3">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary">{t('Record Investor Payment')}</h2>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto">
          {/* Investor info card */}
          <div className="mx-4 mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-bold text-primary">{sanitize(investor.name)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t(investor.investmentType)}</p>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Invested Amount')}</span>
                <p className="text-sm font-semibold">₹{investor.investmentAmount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Effective Balance')}</span>
                <p className="text-sm font-semibold">₹{effectiveInvestment.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Monthly Interest')}</span>
                <p className="text-sm font-semibold font-mono">₹{metrics.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Pending Profit')}</span>
                <p className={`text-sm font-semibold ${pendingProfit > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₹{pendingProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Total Paid')}</span>
                <p className="text-sm font-semibold">₹{metrics.totalPaid.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Missed Months')}</span>
                <p className="text-sm font-semibold">
                  {metrics.missedMonths > 0
                    ? <span className="text-destructive flex items-center gap-1"><AlertCircle size={12} />{metrics.missedMonths}</span>
                    : <span className="text-green-600">0</span>}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Payment type toggle */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2"><Check size={14}/>{t('Payment Type')}</label>
              <div className="flex gap-2">
                {(['Interest', 'Principal', 'Profit'] as PaymentType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                      payment_type === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-input hover:bg-secondary/80'
                    }`}
                    disabled={isSubmitting}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount with quick fill */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <DollarSign size={14}/>{t('Payment Amount (₹)')}
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={payment_type === 'Interest' || payment_type === 'Profit'
                  ? `₹${metrics.monthlyProfit.toLocaleString('en-IN')}`
                  : '0.00'}
                className="w-full px-3 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background"
                required
                min="1"
                step="0.01"
                disabled={isSubmitting}
              />
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(payment_type === 'Interest' || payment_type === 'Profit') && metrics.monthlyProfit > 0 && (
                  <button type="button" onClick={() => setAmount(String(metrics.monthlyProfit))}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                    <IndianRupee size={10} /> {t('Fill monthly')}: ₹{metrics.monthlyProfit.toLocaleString('en-IN')}
                  </button>
                )}
                {(payment_type === 'Interest' || payment_type === 'Profit') && pendingProfit > 0 && (
                  <button type="button" onClick={() => setAmount(String(pendingProfit))}
                    className="text-xs text-destructive hover:underline font-medium flex items-center gap-1">
                    <TrendingUp size={10} /> {t('Fill pending')}: ₹{pendingProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </button>
                )}
                {payment_type === 'Principal' && effectiveInvestment > 0 && (
                  <button type="button" onClick={() => setAmount(String(effectiveInvestment))}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                    <IndianRupee size={10} /> {t('Fill full balance')}: ₹{effectiveInvestment.toLocaleString('en-IN')}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <Calendar size={14}/>{t('Payment Date')}
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background"
                required disabled={isSubmitting} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <MessageSquare size={14}/>{t('Remarks (optional)')}
              </label>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background"
                disabled={isSubmitting} />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>{t('Cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                {t('Log Payment')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvestorPaymentModal;
