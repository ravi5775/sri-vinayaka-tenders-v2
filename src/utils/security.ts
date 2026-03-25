/**
 * security.ts — Client-side security utilities
 *
 * Covers:
 *  • Brute-force / login-attempt rate limiting (5 attempts → 15 min lockout)
 *  • Zod schemas for all form inputs
 *  • Input sanitization helpers
 */

import { z } from 'zod';

// ─── Brute-force protection ────────────────────────────────────────────────

const ATTEMPT_KEY = '__login_attempts__';
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const getAttempts = (): AttemptRecord => {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
};

const saveAttempts = (rec: AttemptRecord) => {
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(rec));
};

/** Call BEFORE sending the login request. Returns error string if locked. */
export const checkLoginAllowed = (): string | null => {
  const rec = getAttempts();
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    const remainingMs = rec.lockedUntil - Date.now();
    const mins = Math.ceil(remainingMs / 60000);
    return `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`;
  }
  // Reset lock if expired
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    saveAttempts({ count: 0, lockedUntil: null });
  }
  return null;
};

/** Call AFTER a failed login attempt. */
export const recordFailedAttempt = (): { locked: boolean; attemptsLeft: number } => {
  const rec = getAttempts();
  const newCount = rec.count + 1;

  if (newCount >= MAX_ATTEMPTS) {
    saveAttempts({ count: newCount, lockedUntil: Date.now() + LOCK_DURATION_MS });
    return { locked: true, attemptsLeft: 0 };
  }

  saveAttempts({ count: newCount, lockedUntil: null });
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - newCount };
};

/** Call AFTER a successful login. */
export const clearLoginAttempts = () => {
  sessionStorage.removeItem(ATTEMPT_KEY);
};

// ─── Zod validation schemas ────────────────────────────────────────────────

const positiveNumber = (label: string) =>
  z.number({ invalid_type_error: `${label} must be a number` })
   .positive(`${label} must be greater than 0`);

/** Login form */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

/** Loan form — Finance */
export const financeSchema = z.object({
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  loanAmount: positiveNumber('Loan amount'),
  givenAmount: z.number().min(0, 'Given amount cannot be negative'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%'),
  durationInMonths: z.number().int().min(1, 'Duration must be at least 1 month').max(360, 'Duration too long'),
  startDate: z.string().min(1, 'Start date is required'),
}).refine(d => d.givenAmount <= d.loanAmount, {
  message: 'Given amount cannot exceed loan amount',
  path: ['givenAmount'],
});

/** Loan form — Tender */
export const tenderSchema = z.object({
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  loanAmount: positiveNumber('Loan amount (repayment)'),
  givenAmount: positiveNumber('Given amount'),
  durationInDays: z.number().int().min(1, 'Duration must be at least 1 day').max(1825, 'Duration too long'),
  startDate: z.string().min(1, 'Start date is required'),
}).refine(d => d.givenAmount < d.loanAmount, {
  message: 'Given amount must be less than repayment amount',
  path: ['givenAmount'],
});

/** Loan form — Interest Rate */
export const interestRateSchema = z.object({
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  loanAmount: positiveNumber('Principal amount'),
  givenAmount: z.number().min(0, 'Given amount cannot be negative'),
  interestRate: z.number().min(0.01, 'Interest rate must be > 0').max(100, 'Interest rate cannot exceed 100%'),
  durationValue: z.number().int().min(1, 'Duration must be at least 1').max(1000, 'Duration too long'),
  startDate: z.string().min(1, 'Start date is required'),
}).refine(d => d.givenAmount <= d.loanAmount, {
  message: 'Given amount cannot exceed loan amount',
  path: ['givenAmount'],
});

/** Payment / transaction amount */
export const paymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount is unrealistically large — double-check'),
  payment_date: z.string().min(1, 'Date is required'),
});

/** Investor form */
export const investorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  investmentAmount: positiveNumber('Investment amount'),
  profitRate: z.number().min(0, 'Profit rate cannot be negative').max(100, 'Profit rate cannot exceed 100%'),
  startDate: z.string().min(1, 'Start date is required'),
});

// ─── Helper: flatten Zod errors to a single string ─────────────────────────

export const flattenZodErrors = (err: z.ZodError): string => {
  return err.errors.map(e => e.message).join(' · ');
};
