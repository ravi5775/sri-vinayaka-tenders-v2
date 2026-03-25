import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Notification } from '../types';
import { useLoans } from './LoanContext';
import { getLoanStatus } from '../utils/planCalculations';
import { useAuth } from './AuthContext';
import apiService from '../utils/apiService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { loans } = useLoans();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) { fetchNotifications(); }
    else { setNotifications([]); setIsLoading(false); }
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const checkOverdueLoans = useCallback(async () => {
    if (!user || loans.length === 0 || isLoading) return;
    const existingUnread = await apiService.getNotifications(false);
    const unreadLoanIds = new Set(existingUnread.map(n => n.loan_id).filter(Boolean));
    const overdueLoans = loans.filter(loan => getLoanStatus(loan) === 'Overdue');
    const newNotificationsToCreate: Omit<Notification, 'id' | 'created_at' | 'user_id'>[] = [];

    overdueLoans.forEach(loan => {
      if (!unreadLoanIds.has(loan.id)) {
        newNotificationsToCreate.push({
          loan_id: loan.id,
          title: `Loan Overdue: ${loan.customerName}`,
          message: `The loan for ${loan.customerName} (ID: ...${loan.id.slice(-4)}) is overdue.`,
          is_read: false,
        });
        unreadLoanIds.add(loan.id);
      }
    });

    if (newNotificationsToCreate.length > 0) {
      try {
        await apiService.createNotifications(newNotificationsToCreate);
        await fetchNotifications();
      } catch (error) {
        console.error("Error creating overdue loan notifications:", error);
      }
    }
  }, [loans, user, isLoading, fetchNotifications]);

  useEffect(() => {
    if (loans.length > 0) {
      const timer = setTimeout(() => { checkOverdueLoans(); }, 2000);
      const interval = setInterval(checkOverdueLoans, 1000 * 60 * 60);
      return () => { clearTimeout(timer); clearInterval(interval); };
    }
  }, [loans, checkOverdueLoans]);

  const markAsRead = async (id: string) => {
    try { await apiService.markNotificationAsRead(id); await fetchNotifications(); }
    catch (error) { console.error("Error marking notification as read:", error); }
  };

  const markAllAsRead = async () => {
    try { await apiService.markAllNotificationsAsRead(); await fetchNotifications(); }
    catch (error) { console.error("Error marking all notifications as read:", error); }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
