import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useLoans } from '../contexts/LoanContext';
import { X, Edit, Trash2, Check, Printer } from 'lucide-react';
import { calculateTotalAmount, calculateAmountPaid, calculateBalance } from '../utils/planCalculations';
import ConfirmationModal from './ConfirmationModal';
import { sanitize } from '../utils/sanitizer';

interface PaymentModalProps {
  loanId: string;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ loanId, onClose }) => {
  const { t } = useLanguage();
  const { loans, getLoanById, updateTransaction, deleteTransaction } = useLoans();
  const loan = useMemo(() => getLoanById(loanId), [loanId, loans]);

  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null);

  if (!loan) return null;

  const totalAmount = calculateTotalAmount(loan);
  const amountPaid = calculateAmountPaid(loan.transactions);
  const balance = calculateBalance(loan);

  const handleEditStart = (txn: Transaction) => {
    setEditingTxnId(txn.id);
    setEditedAmount(String(txn.amount));
    setEditedDate(new Date(txn.payment_date).toISOString().split('T')[0]);
  };

  const handleEditCancel = () => setEditingTxnId(null);

  const handleEditSave = async () => {
    if (!editingTxnId) return;
    const amount = parseFloat(editedAmount);
    if (isNaN(amount) || amount <= 0 || !editedDate) {
      alert("Please enter a valid amount and date.");
      return;
    }
    const originalTxn = loan.transactions.find(t => t.id === editingTxnId);
    if (originalTxn) {
      await updateTransaction(loan.id, {
        ...originalTxn,
        amount: amount,
        payment_date: new Date(editedDate).toISOString(),
      });
    }
    setEditingTxnId(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingTxnId) {
      await deleteTransaction(loan.id, deletingTxnId);
      setDeletingTxnId(null);
    }
  };

  const handleExportPDF = () => {
    const title = `Loan Details - ${sanitize(loan.customerName)}`;
    const totalAmountStr = `₹${totalAmount.toLocaleString('en-IN')}`;
    const amountPaidStr = `₹${amountPaid.toLocaleString('en-IN')}`;
    const balanceStr = `₹${balance.toLocaleString('en-IN')}`;

    const rows = loan.transactions.map(txn => `\n      <tr>\n        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${new Date(txn.payment_date).toLocaleDateString()}</td>\n        <td style="padding:8px;border-bottom:1px solid #e5e7eb">₹${txn.amount.toLocaleString('en-IN')}</td>\n        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${txn.payment_type ? (txn.payment_type === 'interest' ? 'Interest' : 'Principal') : '—'}</td>\n      </tr>\n    `).join('');

    const html = `<!doctype html>\n    <html>\n      <head>\n        <meta charset="utf-8" />\n        <title>${title}</title>\n        <style>\n          body{font-family: Arial, Helvetica, sans-serif; padding:20px; color:#111}\n          .header{display:flex;justify-content:space-between;align-items:center}\n          .summary{margin-top:16px;display:flex;gap:24px}\n          .stat{padding:8px}\n          table{width:100%;border-collapse:collapse;margin-top:16px}\n          th{background:#f3f4f6;padding:8px;text-align:left}\n        </style>\n      </head>\n      <body>\n        <div class="header">\n          <h1>${title}</h1>\n          <div>${new Date().toLocaleString()}</div>\n        </div>\n        <div class="summary">\n          <div class="stat"><strong>Total Amount</strong><div>${totalAmountStr}</div></div>\n          <div class="stat"><strong>Amount Paid</strong><div style="color:green">${amountPaidStr}</div></div>\n          <div class="stat"><strong>Balance Due</strong><div style="color:#dc2626">${balanceStr}</div></div>\n        </div>\n\n        <h3 style="margin-top:20px">Transaction History</h3>\n        <table>\n          <thead>\n            <tr>\n              <th>Date</th>\n              <th>Amount</th>\n              <th>Type</th>\n            </tr>\n          </thead>\n          <tbody>\n            ${rows}\n          </tbody>\n        </table>\n      </body>\n    </html>`;

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('Unable to open print window. Please allow popups.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Give browser a moment to render then trigger print
    setTimeout(() => { try { win.print(); } catch (e) { console.error(e); } }, 500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-fast">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary">{t('Loan Details')} - {sanitize(loan.customerName)}</h2>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleExportPDF(); }} className="p-2 rounded hover:bg-muted" title="Export PDF">
                <Printer size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">{t('Total Amount')}</p>
                <p className="text-xl font-bold text-foreground">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Amount Paid')}</p>
                <p className="text-xl font-bold text-green-600">₹{amountPaid.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Balance Due')}</p>
                <p className="text-xl font-bold text-destructive">₹{balance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{t('Transaction History')}</h3>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {loan.transactions.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">{t('Date')}</th>
                         <th className="p-2 text-left font-medium">{t('Amount')}</th>
                         <th className="p-2 text-left font-medium">Type</th>
                         <th className="p-2 text-right font-medium">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.transactions.map(txn => (
                        <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/50">
                          {editingTxnId === txn.id ? (
                            <>
                              <td className="p-2"><input type="date" value={editedDate} onChange={e => setEditedDate(e.target.value)} className="w-full p-1 border rounded bg-background" /></td>
                              <td className="p-2"><input type="number" value={editedAmount} onChange={e => setEditedAmount(e.target.value)} className="w-full p-1 border rounded bg-background" /></td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={handleEditSave} className="p-1 text-green-600 hover:bg-green-100 rounded-full"><Check size={18} /></button>
                                  <button onClick={handleEditCancel} className="p-1 text-destructive hover:bg-destructive/10 rounded-full"><X size={18} /></button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2">{new Date(txn.payment_date).toLocaleDateString()}</td>
                              <td className="p-2">₹{txn.amount.toLocaleString('en-IN')}</td>
              <td className="p-2">
                                {txn.payment_type ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    txn.payment_type === 'interest'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-secondary text-secondary-foreground border border-border'
                                  }`}>
                                    {txn.payment_type === 'interest' ? '🟢 Interest' : '🔵 Principal'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleEditStart(txn)} className="p-1 text-muted-foreground hover:bg-muted rounded-full" title={t('Edit')}><Edit size={16} /></button>
                                  <button onClick={() => setDeletingTxnId(txn.id)} className="p-1 text-muted-foreground hover:bg-muted rounded-full" title={t('Delete')}><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-center text-muted-foreground">{t('No transactions yet.')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal isOpen={!!deletingTxnId} onClose={() => setDeletingTxnId(null)} onConfirm={handleDeleteConfirm} title="Delete Transaction" variant="danger">
        Are you sure you want to delete this transaction? This action cannot be undone.
      </ConfirmationModal>
    </>
  );
};

export default PaymentModal;
