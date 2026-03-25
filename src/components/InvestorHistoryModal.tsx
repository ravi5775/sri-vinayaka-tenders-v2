import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Investor, InvestorPayment, PaymentType } from '../types';
import { useInvestors } from '../contexts/InvestorContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { X, Edit, Trash2, Check, AlertTriangle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { sanitize } from '../utils/sanitizer';

interface InvestorHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  investor: Investor;
}

const InvestorHistoryModal: React.FC<InvestorHistoryModalProps> = ({ isOpen, onClose, investor }) => {
  const { t } = useLanguage();
  const { updateInvestorPayment, deleteInvestorPayment } = useInvestors();
  const { showToast } = useToast();

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState({ amount: '', date: '', payment_type: 'Profit' as PaymentType, remarks: '' });
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEditStart = (payment: InvestorPayment) => {
    setEditingPaymentId(payment.id);
    setEditedData({
      amount: String(payment.amount),
      date: new Date(payment.payment_date).toISOString().split('T')[0],
      payment_type: payment.payment_type,
      remarks: payment.remarks || ''
    });
  };

  const handleEditCancel = () => setEditingPaymentId(null);

  const handleEditSave = async () => {
    if (!editingPaymentId) return;
    const amount = parseFloat(editedData.amount);
    if (isNaN(amount) || amount <= 0 || !editedData.date) {
      showToast("Please enter a valid amount and date.", 'error');
      return;
    }
    const originalPayment = investor.payments.find(p => p.id === editingPaymentId);
    if (originalPayment) {
      try {
        await updateInvestorPayment(investor.id, {
          ...originalPayment, amount, payment_date: new Date(editedData.date).toISOString(),
          payment_type: editedData.payment_type, remarks: editedData.remarks
        });
        showToast("Payment updated successfully!", 'success');
      } catch (err) {}
    }
    setEditingPaymentId(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingPaymentId) {
      try {
        await deleteInvestorPayment(investor.id, deletingPaymentId);
        showToast("Payment deleted successfully!", 'success');
      } catch (err) {}
      setDeletingPaymentId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-fast">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary">{t('Payment History')} - {sanitize(investor.name)}</h2>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted"><X size={20} /></button>
          </div>
          <div className="p-6 overflow-y-auto">
            {investor.payments.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Date')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Payment Type')}</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Amount')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Remarks')}</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {investor.payments.map(p => (
                      <tr key={p.id}>
                        {editingPaymentId === p.id ? (
                          <>
                            <td className="p-2"><input type="date" value={editedData.date} onChange={e => setEditedData(d => ({...d, date: e.target.value}))} className="w-full p-1 border rounded bg-background" /></td>
                            <td className="p-2">
                              <select value={editedData.payment_type} onChange={e => setEditedData(d => ({...d, payment_type: e.target.value as PaymentType}))} className="w-full p-1 border rounded bg-background">
                                <option value="Profit">{t('Profit')}</option>
                                <option value="Interest">{t('Interest')}</option>
                                <option value="Principal">{t('Principal')}</option>
                              </select>
                            </td>
                            <td className="p-2"><input type="number" value={editedData.amount} onChange={e => setEditedData(d => ({...d, amount: e.target.value}))} className="w-full p-1 border rounded text-right bg-background" /></td>
                            <td className="p-2"><input type="text" value={editedData.remarks} onChange={e => setEditedData(d => ({...d, remarks: e.target.value}))} className="w-full p-1 border rounded bg-background" /></td>
                            <td className="p-2 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={handleEditSave} className="p-1 text-green-600 hover:bg-green-100 rounded-full"><Check size={18} /></button>
                                <button onClick={handleEditCancel} className="p-1 text-destructive hover:bg-destructive/10 rounded-full"><X size={18} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{t(p.payment_type)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-right">₹{p.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{sanitize(p.remarks)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleEditStart(p)} className="p-1 text-muted-foreground hover:bg-muted rounded-full" title={t('Edit')}><Edit size={16} /></button>
                                <button onClick={() => setDeletingPaymentId(p.id)} className="p-1 text-muted-foreground hover:bg-muted rounded-full" title={t('Delete')}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('No payments yet.')}</p>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal isOpen={!!deletingPaymentId} onClose={() => setDeletingPaymentId(null)} onConfirm={handleDeleteConfirm} title="Delete Payment" variant="danger">
        {t('Are you sure you want to delete this payment?')}
      </ConfirmationModal>
    </>
  );
};

export default InvestorHistoryModal;
