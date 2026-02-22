import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLoans } from '../contexts/LoanContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { Loan, LoanType, DurationUnit } from '../types';
import { ChevronLeft, User, DollarSign, Percent, FileText, Clock } from 'lucide-react';
import { financeSchema, tenderSchema, interestRateSchema, flattenZodErrors } from '../utils/security';

const LoanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loans, addLoan, updateLoan, getLoanById } = useLoans();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const isEditing = !!id;
  const loanToEdit = useMemo(() => isEditing ? getLoanById(id) : undefined, [id, getLoanById, isEditing]);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [loanType, setLoanType] = useState<LoanType | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanAmount, setLoanAmount] = useState(0);
  const [givenAmount, setGivenAmount] = useState(0);
  const [interestRate, setInterestRate] = useState<number | null>(2);
  const [durationInMonths, setDurationInMonths] = useState<number | null>(1);
  const [durationInDays, setDurationInDays] = useState<number | null>(1);
  const [durationValue, setDurationValue] = useState<number | null>(12);
  const [durationUnit, setDurationUnit] = useState<DurationUnit | null>('Months');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (isEditing && loanToEdit) {
      setCustomerName(loanToEdit.customerName);
      setPhone(loanToEdit.phone);
      setLoanType(loanToEdit.loanType);
      setStartDate(new Date(loanToEdit.startDate).toISOString().split('T')[0]);
      setLoanAmount(loanToEdit.loanAmount);
      setGivenAmount(loanToEdit.givenAmount);
      setInterestRate(loanToEdit.interestRate);
      setDurationInMonths(loanToEdit.durationInMonths);
      setDurationInDays(loanToEdit.durationInDays);
      setDurationValue(loanToEdit.durationValue);
      setDurationUnit(loanToEdit.durationUnit);
    }
  }, [isEditing, loanToEdit]);

  useEffect(() => {
    if (isEditing) return;
    setLoanAmount(0);
    setGivenAmount(0);
    setInterestRate(2);
    setDurationInMonths(1);
    setDurationInDays(1);
    setDurationValue(12);
    setDurationUnit('Months');
  }, [loanType, isEditing]);

  const validateForm = (): boolean => {
    setFormError('');

    // Zod schema validation by loan type
    if (loanType === 'Finance') {
      const result = financeSchema.safeParse({
        customerName, phone, loanAmount, givenAmount,
        interestRate: interestRate ?? 0, durationInMonths: durationInMonths ?? 0, startDate,
      });
      if (!result.success) { setFormError(flattenZodErrors(result.error)); return false; }
    } else if (loanType === 'Tender') {
      const result = tenderSchema.safeParse({
        customerName, phone, loanAmount, givenAmount,
        durationInDays: durationInDays ?? 0, startDate,
      });
      if (!result.success) { setFormError(flattenZodErrors(result.error)); return false; }
    } else if (loanType === 'InterestRate') {
      const result = interestRateSchema.safeParse({
        customerName, phone, loanAmount, givenAmount,
        interestRate: interestRate ?? 0, durationValue: durationValue ?? 0, startDate,
      });
      if (!result.success) { setFormError(flattenZodErrors(result.error)); return false; }
    }

    // Allow duplicate customer names — different loans can have the same customer
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!loanType) {
      showToast('Please select a loan type.', 'error');
      return;
    }

    let finalGivenAmount = givenAmount;
    if ((loanType === 'Finance' || loanType === 'InterestRate') && (!givenAmount || givenAmount <= 0)) {
      finalGivenAmount = loanAmount;
    }

    const loanData: Partial<Loan> = {
      customerName, phone, loanType, startDate, loanAmount,
      givenAmount: finalGivenAmount,
      interestRate: loanType === 'Finance' || loanType === 'InterestRate' ? interestRate : null,
      durationInMonths: loanType === 'Finance' ? durationInMonths : null,
      durationInDays: loanType === 'Tender' ? durationInDays : null,
      durationValue: loanType === 'InterestRate' ? durationValue : null,
      durationUnit: loanType === 'InterestRate' ? durationUnit : null,
    };

    try {
      if (isEditing && loanToEdit) {
        await updateLoan({ ...loanToEdit, ...loanData });
      } else {
        await addLoan(loanData);
      }
      showToast(t('Loan saved successfully!'), 'success');
      navigate('/');
    } catch (error) {
      console.error(error);
      showToast(t('Failed to save loan.'), 'error');
    }
  };

  const totalFinanceAmount = useMemo(() => {
    const monthlyInterest = (loanAmount || 0) * ((interestRate || 0) / 100);
    const totalInterest = monthlyInterest * (durationInMonths || 0);
    return (loanAmount || 0) + totalInterest;
  }, [loanAmount, interestRate, durationInMonths]);

  const totalFinanceProfit = useMemo(() => {
    const effectiveGiven = givenAmount > 0 ? givenAmount : loanAmount;
    return totalFinanceAmount - effectiveGiven;
  }, [totalFinanceAmount, givenAmount, loanAmount]);

  const totalTenderProfit = useMemo(() => (loanAmount || 0) - (givenAmount || 0), [loanAmount, givenAmount]);
  const firstMonthInterest = useMemo(() => ((loanAmount || 0) * (interestRate || 0) / 100), [loanAmount, interestRate]);

  const inputFieldClass = "w-full px-4 py-2.5 border border-input rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background transition-all duration-200 text-sm";
  const selectFieldClass = `${inputFieldClass} bg-background`;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 mb-6 transition-colors duration-200">
        <ChevronLeft size={16} className="mr-1" />
        {t('Back to Dashboard')}
      </Link>

      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{isEditing ? t('Edit Loan') : t('Create New Loan')}</h1>

        {formError && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded-xl text-sm animate-fade-in-fast" role="alert">
            <p>{formError}</p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground border-b border-border/50 pb-3 flex items-center gap-2"><User size={18} className="text-primary" />{t('Customer Information')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label={t('Customer Name')} id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={inputFieldClass} />
            <InputField label={t('Phone (optional)')} id="phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" className={inputFieldClass} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="loanType" className="block text-sm font-semibold text-foreground flex items-center gap-2"><FileText size={14} className="text-primary" />{t('Select Loan Type')}</label>
          <select id="loanType" value={loanType} onChange={e => setLoanType(e.target.value as LoanType | '')} required className={selectFieldClass} disabled={isEditing}>
            <option value="" disabled>{t('-- Choose a loan type --')}</option>
            <option value="Finance">{t('Finance')}</option>
            <option value="Tender">{t('Tender')}</option>
            <option value="InterestRate">{t('InterestRate')}</option>
          </select>
        </div>

        {loanType === 'Finance' && (
          <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><DollarSign size={18} className="text-primary" />{t('Finance Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField label={t('Loan Amount')} id="loanAmount" type="number" value={loanAmount || ''} onChange={e => setLoanAmount(+e.target.value)} required min="1" className={inputFieldClass} />
              <InputField label={t('Given Amount (Disbursed)')} id="givenAmountFinance" type="number" value={givenAmount || ''} onChange={e => setGivenAmount(+e.target.value)} min="0" className={inputFieldClass} />
              <InputField label={t('Duration (Months)')} id="durationMonths" type="number" value={durationInMonths || ''} onChange={e => setDurationInMonths(+e.target.value)} required min="1" className={inputFieldClass} />
              <InputField label={t('Interest Rate (₹ per ₹100 per Month)')} id="interestRatePerMonth" type="number" value={interestRate || ''} onChange={e => setInterestRate(+e.target.value)} required min="0" step="0.01" className={inputFieldClass} />
              <InputField label={t('Start Date')} id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputFieldClass} />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl text-center border border-primary/10">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('Total Amount to be Paid')}</p>
                  <p className="text-xl font-bold text-primary mt-1">₹{totalFinanceAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-success/5 to-accent/5 rounded-xl text-center border border-success/10">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('Profit')}</p>
                  <p className="text-xl font-bold text-success mt-1">₹{totalFinanceProfit.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loanType === 'Tender' && (
          <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileText size={18} className="text-primary" />{t('Tender Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField label={t('Loan Amount (To be Repaid)')} id="tenderLoanAmount" type="number" value={loanAmount || ''} onChange={e => setLoanAmount(+e.target.value)} required min="1" className={inputFieldClass} />
              <InputField label={t('Given Amount (Disbursed)')} id="givenAmount" type="number" value={givenAmount || ''} onChange={e => setGivenAmount(+e.target.value)} required min="0" className={inputFieldClass} />
              <InputField label={t('Duration (Days)')} id="duration" type="number" value={durationInDays || ''} onChange={e => setDurationInDays(+e.target.value)} required min="1" className={inputFieldClass} />
              <InputField label={t('Start Date')} id="startDateTender" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputFieldClass} />
              <div className="md:col-span-2 p-4 bg-gradient-to-br from-success/5 to-accent/5 rounded-xl text-center border border-success/10">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('Profit')}</p>
                <p className="text-xl font-bold text-success mt-1">₹{totalTenderProfit.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        )}

        {loanType === 'InterestRate' && (
          <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in-up">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Percent size={18} className="text-primary" />{t('Interest Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField label={t('Principal Amount')} id="principalAmount" type="number" value={loanAmount || ''} onChange={e => setLoanAmount(+e.target.value)} required min="1" className={inputFieldClass} />
              <InputField label={t('Given Amount (Disbursed)')} id="givenAmountInterest" type="number" value={givenAmount || ''} onChange={e => setGivenAmount(+e.target.value)} min="0" className={inputFieldClass} />
              <InputField label={t('Interest Rate (₹ per ₹100 per Month)')} id="interestRatePerMonth" type="number" value={interestRate || ''} onChange={e => setInterestRate(+e.target.value)} required min="0" step="0.01" className={inputFieldClass} />
              <InputField label={t('Start Date')} id="startDateInterest" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputFieldClass} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
              <InputField icon={Clock} label={t('Duration')} id="durationValue" type="number" value={durationValue || ''} onChange={e => setDurationValue(+e.target.value)} min="1" className={inputFieldClass} />
              <div>
                <label htmlFor="durationUnit" className="block text-sm font-semibold text-foreground mb-1.5">{t('Duration Unit')}</label>
                <select id="durationUnit" value={durationUnit || ''} onChange={e => setDurationUnit(e.target.value as DurationUnit | null)} className={selectFieldClass}>
                  <option value="Months">{t('Months')}</option>
                  <option value="Weeks">{t('Weeks')}</option>
                  <option value="Days">{t('Days')}</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl text-center mt-4 border border-primary/10">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("First Month's Interest")}</p>
              <p className="text-xl font-bold text-primary mt-1">₹{firstMonthInterest.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-2">{t("Total amount due will change based on payments.")}</p>
            </div>
          </div>
        )}

        {loanType && (
          <div className="pt-6 border-t border-border/50">
            <button type="submit" className="btn btn-primary w-full sm:w-auto text-base px-8 py-3">
              {isEditing ? t('Update Loan') : t('Save Loan')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: React.ComponentType<any>;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, icon: Icon, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-primary" />}
      {label}
    </label>
    <input id={id} {...props} />
  </div>
);

export default LoanForm;
