import React, { useState, useEffect } from 'react';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { Investor, InvestmentType, InvestorStatus } from '../types';
import { X, User, DollarSign, Percent, Calendar, Check, BarChart } from 'lucide-react';

interface InvestorFormProps {
  isOpen: boolean;
  onClose: () => void;
  investorToEdit?: Investor | null;
}

const InvestorForm: React.FC<InvestorFormProps> = ({ isOpen, onClose, investorToEdit }) => {
  const { investors, addInvestor, updateInvestor } = useInvestors();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const isEditing = !!investorToEdit;

  const getInitialState = () => ({
    name: '', investmentAmount: 0, investmentType: '' as InvestmentType | '',
    profitRate: 0, startDate: new Date().toISOString().split('T')[0], status: 'On Track' as InvestorStatus,
  });

  const [formState, setFormState] = useState(getInitialState());

  useEffect(() => {
    if (isOpen) {
      if (isEditing && investorToEdit) {
        setFormState({
          name: investorToEdit.name, investmentAmount: investorToEdit.investmentAmount,
          investmentType: investorToEdit.investmentType, profitRate: investorToEdit.profitRate,
          startDate: new Date(investorToEdit.startDate).toISOString().split('T')[0], status: investorToEdit.status,
        });
      } else {
        setFormState(getInitialState());
      }
    }
  }, [investorToEdit, isEditing, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'investmentAmount' || name === 'profitRate' ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || formState.investmentAmount <= 0 || !formState.investmentType || formState.profitRate <= 0) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    // Check for duplicate investor name
    const duplicateInvestor = investors.find(
      inv => inv.name.trim().toLowerCase() === formState.name.trim().toLowerCase() && (!isEditing || inv.id !== investorToEdit?.id)
    );
    if (duplicateInvestor) {
      showToast('An investor with this name already exists. Please use a different name.', 'error');
      return;
    }
    const investorData = { ...formState, investmentType: formState.investmentType as InvestmentType };
    try {
      if (isEditing && investorToEdit) {
        await updateInvestor({ ...investorToEdit, ...investorData });
        showToast(t('Investor updated successfully!'), 'success');
      } else {
        await addInvestor(investorData);
        showToast(t('Investor added successfully!'), 'success');
      }
      onClose();
    } catch (err) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-fast">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">{isEditing ? t('Edit Investor') : t('Create Investor')}</h2>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <FormInput icon={User} label={t('Investor Name')} name="name" value={formState.name} onChange={handleChange} required />
          <FormInput icon={DollarSign} label={t('Investment Amount (₹)')} name="investmentAmount" type="number" value={formState.investmentAmount || ''} onChange={handleChange} required min="1" />
          <FormSelect icon={BarChart} label={t('Investment Type')} name="investmentType" value={formState.investmentType} onChange={handleChange} required>
            <option value="" disabled>{t('-- Choose an investment type --')}</option>
            <option value="Finance">{t('Finance')}</option>
            <option value="Tender">{t('Tender')}</option>
            <option value="InterestRatePlan">{t('InterestRatePlan')}</option>
          </FormSelect>
          <FormInput icon={Percent} label={t('Profit Rate (% per month)')} name="profitRate" type="number" value={formState.profitRate || ''} onChange={handleChange} required min="0.1" step="0.01" />
          <FormInput icon={Calendar} label={t('Start Date')} name="startDate" type="date" value={formState.startDate} onChange={handleChange} required />
          <FormSelect icon={Check} label={t('Status')} name="status" value={formState.status} onChange={handleChange} required>
            <option value="On Track">{t('On Track')}</option>
            <option value="Delayed">{t('Delayed')}</option>
            <option value="Closed">{t('Closed')}</option>
          </FormSelect>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t('Cancel')}</button>
            <button type="submit" className="btn btn-primary">{isEditing ? t('Update Investor') : t('Save Investor')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormInput = ({ icon: Icon, label, ...props }: { icon: React.ComponentType<any>, label: string } & React.ComponentProps<'input'>) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Icon size={14}/>{label}</label>
    <input {...props} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary bg-background" />
  </div>
);

const FormSelect = ({ icon: Icon, label, children, ...props }: { icon: React.ComponentType<any>, label: string, children: React.ReactNode } & React.ComponentProps<'select'>) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Icon size={14}/>{label}</label>
    <select {...props} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary bg-background">
      {children}
    </select>
  </div>
);

export default InvestorForm;
