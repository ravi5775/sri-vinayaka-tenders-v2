import React, { useState } from 'react';
import { Loan } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useLoans } from '../contexts/LoanContext';
import { useNavigate } from 'react-router-dom';
import { calculateBalance, getLoanStatus, calculateLoanProfit, calculateNextDueDate, calculateInterestAmount } from '../utils/planCalculations';
import { Eye, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import PaymentModal from './PaymentModal';
import ConfirmationModal from './ConfirmationModal';
import { sanitize } from '../utils/sanitizer';

interface LoansTableProps {
  loans: Loan[];
}

const LoansTable: React.FC<LoansTableProps> = ({ loans }) => {
  const { t } = useLanguage();
  const { deleteMultipleLoans } = useLoans();
  const navigate = useNavigate();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(new Set(loans.map(loan => loan.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (loanId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(loanId)) {
      newSelectedIds.delete(loanId);
    } else {
      newSelectedIds.add(loanId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    await deleteMultipleLoans(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsDeleteConfirmOpen(false);
  };

  const getRowHighlightClass = (loan: Loan): string => {
    const status = getLoanStatus(loan);
    if (status === 'Completed') return 'bg-success/5';
    if (status === 'Overdue') return 'bg-destructive/5';
    const nextDueDate = calculateNextDueDate(loan);
    if (nextDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      nextDueDate.setHours(0, 0, 0, 0);
      if (nextDueDate.getTime() === today.getTime()) return 'bg-warning/5';
    }
    return '';
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full';
    if (status === 'Completed') return `${base} bg-success/15 text-success`;
    if (status === 'Overdue') return `${base} bg-destructive/15 text-destructive`;
    return `${base} bg-warning/15 text-warning`;
  };

  const numSelected = selectedIds.size;
  const numLoans = loans.length;

  return (
    <>
      {numSelected > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-primary/5 rounded-xl flex items-center justify-between animate-fade-in-fast border border-primary/20">
          <span className="text-xs sm:text-sm font-semibold text-primary">
            {numSelected} {numSelected > 1 ? t('loans selected') : t('loan selected')}
          </span>
          <button onClick={handleDeleteSelected} className="btn bg-destructive hover:brightness-110 text-destructive-foreground shadow-sm text-xs sm:text-sm px-3 py-2">
            <Trash2 size={14} className="mr-1 sm:mr-2" />
            {t('Delete')}
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-auto max-h-[70vh] rounded-xl border border-border/50">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-primary to-primary/85">
              <th scope="col" className="px-5 py-3.5">
                <input type="checkbox" className="h-4 w-4 rounded focus:ring-ring" onChange={handleSelectAll}
                  checked={numLoans > 0 && numSelected === numLoans}
                  ref={input => { if (input) input.indeterminate = numSelected > 0 && numSelected < numLoans; }} />
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Customer Name')}</th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Loan Type')}</th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Status')}</th>
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Next Due Date')}</th>
              <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Balance Due')}</th>
              <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Interest')}</th>
              <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Profit')}</th>
              <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-primary-foreground">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border/30">
            {loans.map((loan, idx) => (
              <tr key={loan.id} className={`${getRowHighlightClass(loan)} ${selectedIds.has(loan.id) ? 'bg-primary/10' : 'hover:bg-muted/50'} transition-colors duration-150`}
                style={{ animationDelay: `${idx * 30}ms` }}>
                <td className="px-5 py-4"><input type="checkbox" className="h-4 w-4 rounded focus:ring-ring" checked={selectedIds.has(loan.id)} onChange={() => handleSelectOne(loan.id)} /></td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-foreground">{sanitize(loan.customerName)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{sanitize(loan.phone)}</div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap"><span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">{t(loan.loanType)}</span></td>
                <td className="px-5 py-4 whitespace-nowrap"><span className={getStatusBadge(getLoanStatus(loan))}>{t(getLoanStatus(loan))}</span></td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-muted-foreground">{calculateNextDueDate(loan)?.toLocaleDateString() ?? 'N/A'}</td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-foreground text-right font-mono font-medium">₹{calculateBalance(loan).toLocaleString('en-IN')}</td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-muted-foreground text-right font-mono">{loan.loanType === 'InterestRate' ? `₹${calculateInterestAmount(loan).toLocaleString('en-IN')}` : '-'}</td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-foreground text-right font-mono font-medium">₹{calculateLoanProfit(loan).toLocaleString('en-IN')}</td>
                <td className="px-5 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelectedLoan(loan)} className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors duration-150" title={t('View/Pay')}><Eye size={18} /></button>
                    <button onClick={() => navigate(`/loan/edit/${loan.id}`)} className="p-2 rounded-xl text-success hover:bg-success/10 transition-colors duration-150" title={t('Edit')}><Edit size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {loans.map((loan) => {
          const status = getLoanStatus(loan);
          const isExpanded = expandedId === loan.id;

          return (
            <div key={loan.id} className={`bg-card border border-border rounded-xl overflow-hidden ${getRowHighlightClass(loan)}`}>
              <div className="flex items-center gap-2 p-3">
                <input type="checkbox" className="h-4 w-4 rounded flex-shrink-0" checked={selectedIds.has(loan.id)} onChange={() => handleSelectOne(loan.id)} />
                <button onClick={() => setExpandedId(isExpanded ? null : loan.id)} className="flex-1 flex items-center justify-between text-left min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{sanitize(loan.customerName)}</span>
                      <span className={getStatusBadge(status)}>{t(status)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{t(loan.loanType)}</span>
                      {loan.phone && <><span>•</span><span>{sanitize(loan.phone)}</span></>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-border animate-fade-in-fast">
                  <div className="grid grid-cols-2 gap-px bg-border">
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Balance Due')}</span>
                      <p className="text-sm font-mono font-medium mt-0.5">₹{calculateBalance(loan).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Profit')}</span>
                      <p className="text-sm font-mono font-medium mt-0.5">₹{calculateLoanProfit(loan).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Interest')}</span>
                      <p className="text-sm font-mono mt-0.5">{loan.loanType === 'InterestRate' ? `₹${calculateInterestAmount(loan).toLocaleString('en-IN')}` : '-'}</p>
                    </div>
                    <div className="bg-card p-3">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('Next Due Date')}</span>
                      <p className="text-sm font-medium mt-0.5">{calculateNextDueDate(loan)?.toLocaleDateString() ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-around p-3 border-t border-border bg-muted/30">
                    <button onClick={() => setSelectedLoan(loan)} className="flex flex-col items-center gap-1 p-1.5 text-primary">
                      <Eye size={18} /><span className="text-[10px]">{t('View')}</span>
                    </button>
                    <button onClick={() => navigate(`/loan/edit/${loan.id}`)} className="flex flex-col items-center gap-1 p-1.5 text-success">
                      <Edit size={18} /><span className="text-[10px]">{t('Edit')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loans.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">{t('No loans found.')}</p>}
      {selectedLoan && <PaymentModal loanId={selectedLoan.id} onClose={() => setSelectedLoan(null)} />}
      <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleConfirmDelete} title={t('Confirm Deletion')} variant="danger">
        <p>{t('Are you sure you want to delete')} {selectedIds.size} {selectedIds.size > 1 ? t('loans') : t('loan')}?</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('This action cannot be undone.')}</p>
      </ConfirmationModal>
    </>
  );
};

export default LoansTable;
