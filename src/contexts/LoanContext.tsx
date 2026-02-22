import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Loan, Transaction } from '../types';
import { useAuth } from './AuthContext';
import { useToastContext } from './ToastContext';
import apiService from '../utils/apiService';

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
      // Auto-refresh every 2 minutes (reduced from 30s to cut server load)
      const interval = setInterval(() => fetchLoans(true), 120000);
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
      // Optimistic: append the new loan locally instead of re-fetching all
      setLoans(prev => [{ ...newLoan, transactions: newLoan.transactions || [] }, ...prev]);
      showToast('Loan created successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateLoan = async (loanData: Loan) => {
    try {
      const updatedLoan = await apiService.updateLoan(loanData.id, loanData);
      // Optimistic: replace the loan in local state
      setLoans(prev => prev.map(l => l.id === loanData.id
        ? { ...updatedLoan, transactions: l.transactions }
        : l
      ));
      showToast('Loan updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteMultipleLoans = async (loanIds: string[]) => {
    try {
      // Optimistic: remove loans from local state immediately
      const idsSet = new Set(loanIds);
      setLoans(prev => prev.filter(l => !idsSet.has(l.id)));
      await apiService.deleteLoans(loanIds);
      showToast('Loan(s) deleted successfully!', 'success');
    } catch (error: any) {
      // Rollback on failure — re-fetch
      await fetchLoans(true);
      showToast(error.message, 'error');
      throw error;
    }
  };

  const getLoanById = useCallback((id: string) => loans.find(l => l.id === id), [loans]);

  const addTransaction = async (loanId: string, transaction: Omit<Transaction, 'id' | 'loan_id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      await apiService.addTransaction(loanId, transaction);
      // After successful server write, update locally with a temp ID
      // then do a background refetch to get the real server state
      const tempTxn: Transaction = {
        id: crypto.randomUUID(),
        loan_id: loanId,
        user_id: user.id,
        amount: transaction.amount,
        payment_date: transaction.payment_date,
        payment_type: transaction.payment_type,
      };
      setLoans(prev => prev.map(l => {
        if (l.id !== loanId) return l;
        return { ...l, transactions: [tempTxn, ...(l.transactions || [])] };
      }));
      // Background sync to get real transaction ID
      fetchLoans(true);
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
      // Optimistic: update transaction locally
      setLoans(prev => prev.map(l => {
        if (l.id !== loanId) return l;
        return {
          ...l,
          transactions: (l.transactions || []).map(t =>
            t.id === updatedTxn.id ? { ...t, amount: updatedTxn.amount, payment_date: updatedTxn.payment_date } : t
          ),
        };
      }));
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteTransaction = async (loanId: string, transactionId: string) => {
    try {
      await apiService.deleteTransaction(loanId, transactionId);
      // Optimistic: remove transaction locally
      setLoans(prev => prev.map(l => {
        if (l.id !== loanId) return l;
        return { ...l, transactions: (l.transactions || []).filter(t => t.id !== transactionId) };
      }));
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
