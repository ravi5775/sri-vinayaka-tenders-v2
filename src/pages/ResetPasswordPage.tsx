import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogo } from '../contexts/LogoContext';
import { Lock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import apiService from '../utils/apiService';

const ResetPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const { logo } = useLogo();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col justify-center items-center p-4">
      <div className="fixed top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 mb-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-2 shadow-glow">
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground mt-2 text-sm">Enter your new password below.</p>
        </div>

        <div className="glass-card p-8">
          {success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle size={24} />
                <p className="text-sm font-semibold">Password reset successfully!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can now login with your new password.
              </p>
              <button onClick={() => navigate('/login')}
                className="btn btn-primary text-xs flex items-center gap-2 w-fit mt-4">
                <ArrowLeft size={14} /> Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!token && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                  Invalid reset link. Please request a new password reset.
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-foreground mb-1.5">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input id="newPassword" name="newPassword" type="password" required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-background text-sm"
                    placeholder="••••••••" minLength={6} />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl shadow-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-background text-sm"
                    placeholder="••••••••" minLength={6} />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 animate-fade-in-fast">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading || !token}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-primary-foreground bg-gradient-to-r from-primary to-primary/85 hover:brightness-110 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-xs text-primary hover:underline font-medium">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
