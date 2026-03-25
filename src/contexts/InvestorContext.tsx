import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Investor, InvestorPayment } from '../types';
import { useAuth } from './AuthContext';
import { useToastContext } from './ToastContext';
import apiService from '../utils/apiService';

interface InvestorContextType {
  investors: Investor[];
  isLoading: boolean;
  addInvestor: (investorData: Omit<Investor, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'payments'>) => Promise<void>;
  updateInvestor: (investorData: Investor) => Promise<void>;
  deleteInvestor: (investorId: string) => Promise<void>;
  addInvestorPayment: (investorId: string, payment: Omit<InvestorPayment, 'id' | 'investor_id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateInvestorPayment: (investorId: string, payment: InvestorPayment) => Promise<void>;
  deleteInvestorPayment: (investorId: string, paymentId: string) => Promise<void>;
  refreshInvestors: () => Promise<void>;
}

const InvestorContext = createContext<InvestorContextType | undefined>(undefined);

export const InvestorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToastContext();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvestors = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setIsLoading(true);
    try {
      const data = await apiService.getInvestors();
      setInvestors(data);
    } catch (error: any) {
      showToast(`Error fetching investors: ${error.message}`, 'error');
      setInvestors([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      fetchInvestors();
      const interval = setInterval(() => fetchInvestors(true), 30000);
      return () => clearInterval(interval);
    } else {
      setInvestors([]);
      setIsLoading(false);
    }
  }, [user, fetchInvestors]);

  const addInvestor = async (investorData: Omit<Investor, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'payments'>) => {
    if (!user) return;
    try {
      await apiService.createInvestor(investorData as Partial<Investor>);
      await fetchInvestors(true);
      showToast('Investor added successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateInvestor = async (investorData: Investor) => {
    try {
      await apiService.updateInvestor(investorData.id, investorData as Partial<Investor>);
      await fetchInvestors(true);
      showToast('Investor updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteInvestor = async (investorId: string) => {
    try {
      await apiService.deleteInvestor(investorId);
      await fetchInvestors(true);
      showToast('Investor deleted successfully!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const addInvestorPayment = async (investorId: string, payment: Omit<InvestorPayment, 'id' | 'investor_id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      await apiService.addInvestorPayment(investorId, payment as Partial<InvestorPayment>);
      await fetchInvestors(true);
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateInvestorPayment = async (_investorId: string, updatedPayment: InvestorPayment) => {
    try {
      await apiService.updateInvestorPayment(_investorId, updatedPayment.id, {
        amount: updatedPayment.amount,
        payment_date: updatedPayment.payment_date,
        payment_type: updatedPayment.payment_type,
        remarks: updatedPayment.remarks,
      });
      await fetchInvestors(true);
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteInvestorPayment = async (_investorId: string, paymentId: string) => {
    try {
      await apiService.deleteInvestorPayment(_investorId, paymentId);
      await fetchInvestors(true);
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  return (
    <InvestorContext.Provider value={{
      investors, isLoading, addInvestor, updateInvestor, deleteInvestor,
      addInvestorPayment, updateInvestorPayment, deleteInvestorPayment, refreshInvestors: () => fetchInvestors(true)
    }}>
      {children}
    </InvestorContext.Provider>
  );
};

export const useInvestors = () => {
  const context = useContext(InvestorContext);
  if (context === undefined) {
    throw new Error('useInvestors must be used within an InvestorProvider');
  }
  return context;
};
