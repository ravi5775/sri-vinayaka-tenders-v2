export type Language = 'en' | 'te';

export interface Admin {
  id: string;
  username: string;
}

export interface Notification {
  id: string;
  user_id: string;
  loan_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type TransactionPaymentType = 'interest' | 'principal';

export interface Transaction {
  id: string;
  loan_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_type?: TransactionPaymentType;
  created_at?: string;
}

export type LoanType = 'Finance' | 'Tender' | 'InterestRate';
export type DurationUnit = 'Months' | 'Weeks' | 'Days';

export interface Loan {
  id: string;
  user_id: string;
  customerName: string;
  phone: string;
  loanType: LoanType;
  loanAmount: number;
  givenAmount: number;
  interestRate: number | null;
  durationInMonths: number | null;
  durationInDays: number | null;
  startDate: string;
  durationValue: number | null;
  durationUnit: DurationUnit | null;
  status: 'Active' | 'Completed' | 'Overdue';
  transactions: Transaction[];
  created_at: string;
  updated_at: string;
}

export type InvestmentType = 'Finance' | 'Tender' | 'InterestRatePlan';
export type InvestorStatus = 'On Track' | 'Delayed' | 'Closed';
export type PaymentType = 'Principal' | 'Profit' | 'Interest';

export interface InvestorPayment {
  id: string;
  investor_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_type: PaymentType;
  remarks?: string;
  created_at?: string;
}

export interface Investor {
  id: string;
  user_id: string;
  name: string;
  investmentAmount: number;
  investmentType: InvestmentType;
  profitRate: number;
  startDate: string;
  status: InvestorStatus;
  payments: InvestorPayment[];
  created_at: string;
  updated_at: string;
}

export interface LoginHistory {
  id: string;
  user: {
    id: string;
    email: string;
  } | null;
  ip: string;
  userAgent: string;
  timestamp: string;
}
