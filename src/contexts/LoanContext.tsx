import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Loan, Transaction } from '../types';
import { useAuth } from './AuthContext';
import { useToastContext } from './ToastContext';
import apiService from '../utils/apiService';
import { auditLog } from '../utils/auditLogger';

interface LoanContextType {
  loans: Loan[];
  isLoading: boolean;
  addLoan: (loanData: Partial<Loan>) => Promise<void>;
  updateLoan: (loanData: Loan) => Promise<void>;
  deleteMultipleLoans: (loanIds: string[]) => Promise<void>;
  getLoanById: (id: string) => Loan | undefined;
  addTransaction: (loanId: string, transaction: Omit<Transaction, 'id' | 'loan_id' | 'user_id' | 'created_at'>) => Promise<void>;

  updateTransaction: (loanId: string, transaction: Transaction) => Promise<void>;
  deleteTransaction: (loanId: string, transactionId: string) => Promise<void>;
  refreshLoans: () => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export const LoanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToastContext();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLoans = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setIsLoading(true);
    try {
      const data = await apiService.getLoans();
      setLoans(data);
    } catch (error: any) {
      showToast(`Error fetching loans: ${error.message}`, 'error');
      setLoans([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      fetchLoans();
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => fetchLoans(true), 30000);
      return () => clearInterval(interval);
    } else {
      setLoans([]);
      setIsLoading(false);
    }
  }, [user, fetchLoans]);

  const addLoan = async (loanData: Partial<Loan>) => {
    if (!user) return;
    try {
      const newLoan = await apiService.createLoan(loanData);
      await fetchLoans(true);
      auditLog({ action: 'LOAN_CREATED', entityType: 'loan', entityId: newLoan?.id, details: { customerName: loanData.customerName, loanType: loanData.loanType, loanAmount: loanData.loanAmount } });
      showToast('Loan created successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateLoan = async (loanData: Loan) => {
    try {
      await apiService.updateLoan(loanData.id, loanData);
      await fetchLoans(true);
      auditLog({ action: 'LOAN_UPDATED', entityType: 'loan', entityId: loanData.id, details: { customerName: loanData.customerName } });
      showToast('Loan updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteMultipleLoans = async (loanIds: string[]) => {
    try {
      await apiService.deleteLoans(loanIds);
      await fetchLoans(true);
      auditLog({ action: 'LOAN_DELETED', entityType: 'loan', details: { loanIds, count: loanIds.length } });
      showToast('Loan(s) deleted successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const getLoanById = useCallback((id: string) => loans.find(l => l.id === id), [loans]);

  const addTransaction = async (loanId: string, transaction: Omit<Transaction, 'id' | 'loan_id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      await apiService.addTransaction(loanId, transaction);
      await fetchLoans(true);
      auditLog({ action: 'PAYMENT_LOGGED', entityType: 'transaction', entityId: loanId, details: { amount: transaction.amount, type: transaction.payment_type, date: transaction.payment_date } });
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateTransaction = async (loanId: string, updatedTxn: Transaction) => {
    try {
      await apiService.updateTransaction(loanId, updatedTxn.id, {
        amount: updatedTxn.amount,
        payment_date: updatedTxn.payment_date,
      });
      await fetchLoans(true);
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteTransaction = async (loanId: string, transactionId: string) => {
    try {
      await apiService.deleteTransaction(loanId, transactionId);
      await fetchLoans(true);
      auditLog({ action: 'PAYMENT_DELETED', entityType: 'transaction', entityId: transactionId, details: { loanId } });
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  return (
    <LoanContext.Provider value={{
      loans, isLoading, addLoan, updateLoan, deleteMultipleLoans, getLoanById,
      addTransaction, updateTransaction, deleteTransaction, refreshLoans: () => fetchLoans(true)
    }}>
      {children}
    </LoanContext.Provider>
  );
};

export const useLoans = () => {
  const context = useContext(LoanContext);
  if (context === undefined) {
    throw new Error('useLoans must be used within a LoanProvider');
  }
  return context;
};
