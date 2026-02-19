import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogo } from '../contexts/LogoContext';
import { Lock, Mail, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  checkLoginAllowed,
  recordFailedAttempt,
  clearLoginAttempts,
  loginSchema,
  flattenZodErrors,
} from '../utils/security';

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { logo } = useLogo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // Refresh lock status every second while locked
  useEffect(() => {
    const interval = setInterval(() => {
      const msg = checkLoginAllowed();
      setLockMessage(msg);
    }, 1000);
    setLockMessage(checkLoginAllowed());
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent, forceLogin = false) => {
    e.preventDefault();
    setError(null);

    // Check brute-force lock
    const lockErr = checkLoginAllowed();
    if (lockErr) { setLockMessage(lockErr); return; }

    // Validate inputs with Zod
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(flattenZodErrors(parsed.error));
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email.trim(), password, forceLogin);

      if (result.error) {
        if (result.code === 'SESSION_CONFLICT') {
          setShowSessionConflict(true);
        } else if (
          result.error.toLowerCase().includes('invalid login credentials') ||
          result.error.toLowerCase().includes('invalid email or password')
        ) {
          const { locked, attemptsLeft } = recordFailedAttempt();
          if (locked) {
            setLockMessage(checkLoginAllowed());
            setError(null);
          } else {
            setError(`${t('Invalid username or password.')} ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`);
          }
        } else {
          recordFailedAttempt();
          setError(result.error);
        }
      } else {
        clearLoginAttempts();
        navigate('/');
      }
    } catch {
      setError('A critical system error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setShowSessionConflict(false);
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn(email, password, true);
      if (result.error) { setError(result.error); }
      else { clearLoginAttempts(); navigate('/'); }
    } catch {
      setError('A critical system error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col justify-center items-center p-4">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mx-auto h-28 w-28 mb-5 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 p-2.5 shadow-glow">
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Sri Vinayaka Tenders</h1>
          <p className="text-primary font-semibold mt-1 text-sm uppercase tracking-widest">Admin Portal</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">{t('Username')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <input id="email" name="email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-background text-sm"
                  placeholder="admin@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-1.5">{t('Password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <input id="password" name="password" type="password" autoComplete="current-password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-background text-sm"
                  placeholder="••••••••" minLength={6} />
              </div>
            </div>

            {/* Brute-force lockout banner */}
            {lockMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 flex items-center gap-2 animate-fade-in-fast">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{lockMessage}</span>
              </div>
            )}

            {error && !lockMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-fade-in-fast">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !!lockMessage}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-primary/85 hover:brightness-110 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : t('Login')}
            </button>

            <div className="text-center">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                {t('Forgot Password?')}
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Session Conflict Modal */}
      {showSessionConflict && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md m-4 p-6 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-grow">
                <h2 className="text-lg font-bold text-foreground">Active Session Detected</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  You are already logged in on another device. Continuing will end the other session.
                </p>
                <p className="text-sm text-foreground mt-3 font-medium">
                  Do you want to end the other session and continue logging in here?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSessionConflict(false)}
                className="btn btn-secondary px-5 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogin}
                disabled={isLoading}
                className="btn bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 text-sm font-semibold rounded-xl flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Continue Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
