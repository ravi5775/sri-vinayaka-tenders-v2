import React, { useState } from 'react';
import { Investor } from '../types';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateInvestorMetrics } from '../utils/investorCalculations';
import { Edit, Trash2, IndianRupee, History, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import InvestorForm from './InvestorForm';
import InvestorPaymentModal from './InvestorPaymentModal';
import InvestorHistoryModal from './InvestorHistoryModal';
import { sanitize } from '../utils/sanitizer';

const calculateNextPayoutDate = (investor: Investor): Date => {
  const today = new Date();
  let nextPayout = new Date(investor.startDate);
  while (nextPayout <= today) {
    nextPayout.setMonth(nextPayout.getMonth() + 1);
  }
  return nextPayout;
};

const InvestorsTable: React.FC = () => {
  const { investors, deleteInvestor } = useInvestors();
  const { t } = useLanguage();

  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [payingInvestor, setPayingInvestor] = useState<Investor | null>(null);
  const [historyInvestor, setHistoryInvestor] = useState<Investor | null>(null);
  const [deletingInvestorId, setDeletingInvestorId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletingInvestorId) {
      await deleteInvestor(deletingInvestorId);
      setDeletingInvestorId(null);
    }
  };

  const getStatusChip = (status: 'On Track' | 'Delayed' | 'Closed') => {
    switch (status) {
      case 'On Track': return 'bg-green-100 text-green-800';
      case 'Delayed': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-card divide-y divide-border">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Investor Name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Investment Type')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Invested Amount')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Interest')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Accumulated Profit')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Total Paid')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">{t('Missed Months')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Next Payout Date')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {investors.map((investor) => {
              const metrics = calculateInvestorMetrics(investor);
              const profitLoss = metrics.totalPaid - investor.investmentAmount;
              const profitLossColor = profitLoss >= 0 ? 'text-green-600' : 'text-destructive';
              const nextPayoutDate = investor.status !== 'Closed' ? calculateNextPayoutDate(investor).toLocaleDateString() : 'N/A';

              return (
                <tr key={investor.id} className="hover:bg-muted/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">{sanitize(investor.name)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{t(investor.investmentType)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">₹{investor.investmentAmount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right font-mono">
                    {investor.investmentType === 'InterestRatePlan' ? `₹${metrics.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${profitLossColor}`}>₹{metrics.accumulatedProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">₹{metrics.totalPaid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">{metrics.missedMonths > 0 ? <span className='flex items-center justify-center gap-1 text-destructive'><AlertCircle size={14}/> {metrics.missedMonths}</span> : 0}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChip(metrics.status)}`}>{t(metrics.status)}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{nextPayoutDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setPayingInvestor(investor)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100" title={t('Pay Now')} disabled={investor.status === 'Closed'}><IndianRupee size={18} /></button>
                      <button onClick={() => setHistoryInvestor(investor)} className="p-2 rounded-full text-purple-600 hover:bg-purple-100" title={t('View History')}><History size={18} /></button>
                      <button onClick={() => setEditingInvestor(investor)} className="p-2 rounded-full text-green-600 hover:bg-green-100" title={t('Edit')}><Edit size={18} /></button>
                      <button onClick={() => setDeletingInvestorId(investor.id)} className="p-2 rounded-full text-destructive hover:bg-destructive/10" title={t('Delete')}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {investors.map((investor) => {
          const metrics = calculateInvestorMetrics(investor);
          const profitLossColor = (metrics.totalPaid - investor.investmentAmount) >= 0 ? 'text-green-600' : 'text-destructive';
          const nextPayoutDate = investor.status !== 'Closed' ? calculateNextPayoutDate(investor).toLocaleDateString() : 'N/A';
          const isExpanded = expandedId === investor.id;

          return (
            <div key={investor.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Card header - always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : investor.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{sanitize(investor.name)}</span>
                    <span className={`px-2 py-0.5 text-[10px] leading-4 font-semibold rounded-full ${getStatusChip(metrics.status)}`}>{t(metrics.status)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>₹{investor.investmentAmount.toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>{t(investor.investmentType)}</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border animate-fade-in-fast">
                  <div className="grid grid-cols-2 gap-px bg-border">
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Interest')}</span>
                      <p className="text-sm font-mono font-medium mt-0.5">
                        {investor.investmentType === 'InterestRatePlan' ? `₹${metrics.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                      </p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Accumulated Profit')}</span>
                      <p className={`text-sm font-semibold mt-0.5 ${profitLossColor}`}>₹{metrics.accumulatedProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Total Paid')}</span>
                      <p className="text-sm font-medium mt-0.5">₹{metrics.totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Missed Months')}</span>
                      <p className="text-sm font-medium mt-0.5">
                        {metrics.missedMonths > 0 ? <span className="text-destructive flex items-center gap-1"><AlertCircle size={12}/>{metrics.missedMonths}</span> : '0'}
                      </p>
                    </div>
                    <div className="bg-card p-3 col-span-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Next Payout Date')}</span>
                      <p className="text-sm font-medium mt-0.5">{nextPayoutDate}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-around p-3 border-t border-border bg-muted/30">
                    <button onClick={() => setPayingInvestor(investor)} className="flex flex-col items-center gap-1 p-1.5 text-blue-600" disabled={investor.status === 'Closed'}>
                      <IndianRupee size={18} /><span className="text-[10px]">{t('Pay')}</span>
                    </button>
                    <button onClick={() => setHistoryInvestor(investor)} className="flex flex-col items-center gap-1 p-1.5 text-purple-600">
                      <History size={18} /><span className="text-[10px]">{t('History')}</span>
                    </button>
                    <button onClick={() => setEditingInvestor(investor)} className="flex flex-col items-center gap-1 p-1.5 text-green-600">
                      <Edit size={18} /><span className="text-[10px]">{t('Edit')}</span>
                    </button>
                    <button onClick={() => setDeletingInvestorId(investor.id)} className="flex flex-col items-center gap-1 p-1.5 text-destructive">
                      <Trash2 size={18} /><span className="text-[10px]">{t('Delete')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {investors.length === 0 && <p className="text-center text-muted-foreground py-8">{t('No investors found.')}</p>}

      {editingInvestor && <InvestorForm isOpen={!!editingInvestor} onClose={() => setEditingInvestor(null)} investorToEdit={editingInvestor} />}
      {payingInvestor && <InvestorPaymentModal isOpen={!!payingInvestor} onClose={() => setPayingInvestor(null)} investor={payingInvestor} />}
      {historyInvestor && <InvestorHistoryModal isOpen={!!historyInvestor} onClose={() => setHistoryInvestor(null)} investor={historyInvestor} />}

      <ConfirmationModal isOpen={!!deletingInvestorId} onClose={() => setDeletingInvestorId(null)} onConfirm={handleDelete} title={t('Delete Investor')} variant="danger">
        {t('Are you sure you want to delete this investor?')} {t('This action cannot be undone.')}
      </ConfirmationModal>
    </>
  );
};

export default InvestorsTable;
