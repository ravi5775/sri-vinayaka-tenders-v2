import { Admin, Loan, Transaction, Investor, InvestorPayment, Notification, LoginHistory } from '../types';

const API_BASE = '/api';

let cachedCsrfToken: string | null = null;

const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_BASE}/csrf-token`);
    const data = await response.json();
    cachedCsrfToken = data.csrfToken;
    return data.csrfToken;
  } catch (e) {
    console.error("Failed to fetch CSRF token", e);
    return null;
  }
};

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(options.method || 'GET') && !cachedCsrfToken) {
    await fetchCsrfToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(cachedCsrfToken ? { 'X-CSRF-Token': cachedCsrfToken } : {}),
    ...((options.headers as any) || {}),
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    localStorage.removeItem('authToken');
    if (!window.location.pathname.includes('/login')) {
      // Show alert for session replaced
      if (errorData.code === 'SESSION_REPLACED') {
        alert('Your session was ended because you logged in from another device.');
      }
      window.location.href = '/login';
    }
    throw new Error(errorData.error || 'Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 409 && errorData.code === 'SESSION_CONFLICT') {
      const err: any = new Error(errorData.message || 'Active session exists on another device');
      err.code = 'SESSION_CONFLICT';
      err.lastLoginAt = errorData.lastLoginAt;
      throw err;
    }
    if (response.status === 400 && errorData.errors) {
      const firstError = errorData.errors[0];
      throw new Error(firstError.msg || 'Validation error');
    }
    if (response.status === 403 && errorData.message?.includes('CSRF')) {
      await fetchCsrfToken();
      throw new Error('Security token expired. Please try again.');
    }
    throw new Error(errorData.error || errorData.message || `Server Error: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
};

const apiService = {
  // Auth
  login: async (email: string, password?: string, forceLogin?: boolean): Promise<{ token: string; user: Admin }> => {
    const result = await authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, forceLogin }) });
    if (result.token) {
      localStorage.setItem('authToken', result.token);
    }
    return result;
  },
  signup: async (email: string, password: string, displayName?: string): Promise<{ message: string }> => {
    return authFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
  },
  logout: async (): Promise<void> => {
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('authToken');
  },
  getCurrentUser: async (): Promise<Admin | null> => {
    try {
      const result = await authFetch('/auth/me');
      return result.user || result;
    } catch {
      return null;
    }
  },
  forgotPassword: async (email: string): Promise<any> => {
    return authFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },
  resetPassword: async (token: string, newPassword: string): Promise<any> => {
    return authFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
  },

  // Admin
  createAdmin: async (email: string, password: string): Promise<any> => {
    return authFetch('/admin/create', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  changePassword: async (oldPassword: string, newPassword: string): Promise<any> => {
    return authFetch('/admin/change-password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) });
  },
  getLoginHistory: async (): Promise<LoginHistory[]> => {
    return authFetch('/admin/login-history');
  },
  getAdminUsers: async (): Promise<any[]> => {
    return authFetch('/admin/users');
  },
  deleteAdmin: async (id: string): Promise<void> => {
    return authFetch(`/admin/users/${id}`, { method: 'DELETE' });
  },
  resetAdminPassword: async (id: string): Promise<any> => {
    return authFetch(`/admin/reset-password/${id}`, { method: 'POST' });
  },

  // Loans
  getLoans: async (): Promise<Loan[]> => authFetch('/loans'),
  createLoan: async (loanData: Partial<Loan>): Promise<Loan> => {
    return authFetch('/loans', { method: 'POST', body: JSON.stringify(loanData) });
  },
  updateLoan: async (id: string, loanData: Partial<Loan>): Promise<Loan> => {
    return authFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(loanData) });
  },
  deleteLoans: async (ids: string[]): Promise<void> => {
    return authFetch('/loans/delete-multiple', { method: 'POST', body: JSON.stringify({ ids }) });
  },

  // Transactions
  addTransaction: async (loanId: string, transaction: Omit<Transaction, 'id' | 'loan_id' | 'user_id' | 'created_at'>): Promise<void> => {
    return authFetch(`/loans/${loanId}/transactions`, { method: 'POST', body: JSON.stringify(transaction) });
  },

  updateTransaction: async (loanId: string, transactionId: string, transaction: Partial<Transaction>): Promise<void> => {
    return authFetch(`/loans/${loanId}/transactions/${transactionId}`, { method: 'PUT', body: JSON.stringify(transaction) });
  },
  deleteTransaction: async (loanId: string, transactionId: string): Promise<void> => {
    return authFetch(`/loans/${loanId}/transactions/${transactionId}`, { method: 'DELETE' });
  },

  // Investors
  getInvestors: async (): Promise<Investor[]> => authFetch('/investors'),
  createInvestor: async (data: Partial<Investor>): Promise<Investor> => {
    return authFetch('/investors', { method: 'POST', body: JSON.stringify(data) });
  },
  updateInvestor: async (id: string, data: Partial<Investor>): Promise<Investor> => {
    return authFetch(`/investors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteInvestor: async (id: string): Promise<void> => {
    return authFetch(`/investors/${id}`, { method: 'DELETE' });
  },

  // Investor Payments
  addInvestorPayment: async (investorId: string, data: Partial<InvestorPayment>): Promise<InvestorPayment> => {
    return authFetch(`/investors/${investorId}/payments`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateInvestorPayment: async (investorId: string, paymentId: string, data: Partial<InvestorPayment>): Promise<Investor> => {
    return authFetch(`/investors/${investorId}/payments/${paymentId}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteInvestorPayment: async (investorId: string, paymentId: string): Promise<void> => {
    return authFetch(`/investors/${investorId}/payments/${paymentId}`, { method: 'DELETE' });
  },

  // Notifications
  getNotifications: async (isRead?: boolean): Promise<Notification[]> => {
    const query = isRead !== undefined ? `?is_read=${isRead}` : '';
    return authFetch(`/notifications${query}`);
  },
  createNotifications: async (notifications: Omit<Notification, 'id' | 'created_at' | 'user_id'>[]): Promise<void> => {
    return authFetch('/notifications', { method: 'POST', body: JSON.stringify(notifications) });
  },
  markNotificationAsRead: async (id: string): Promise<void> => {
    return authFetch(`/notifications/${id}/read`, { method: 'PUT' });
  },
  markAllNotificationsAsRead: async (): Promise<void> => {
    return authFetch('/notifications/read-all', { method: 'PUT' });
  },

  // Backup
  restoreBackup: async (backupData: any): Promise<void> => {
    return authFetch('/admin/restore', { method: 'POST', body: JSON.stringify(backupData) });
  },
  backupToMongo: async (data: any): Promise<void> => {
    return authFetch('/backup/mongodb', { method: 'POST', body: JSON.stringify(data) });
  },
  sendBackupEmail: async (data: any): Promise<any> => {
    return authFetch('/backup/email', { method: 'POST', body: JSON.stringify(data) });
  },
};

export default apiService;
