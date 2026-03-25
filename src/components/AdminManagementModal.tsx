import React, { useState, useEffect } from 'react';
import { X, UserPlus, KeyRound, History, Loader2, Eye, EyeOff, Users, Trash2, RotateCcw, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import apiService from '../utils/apiService';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoginHistoryEntry {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

const AdminManagementModal: React.FC<AdminManagementModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToastContext();

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showChangeNewPassword, setShowChangeNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLoginHistory();
      fetchAdminUsers();
    }
  }, [isOpen]);

  const fetchAdminUsers = async () => {
    setIsLoadingAdmins(true);
    try {
      const data = await apiService.getAdminUsers();
      setAdminUsers(data || []);
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err.message);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    setIsDeletingAdmin(true);
    try {
      await apiService.deleteAdmin(deleteTarget.id);
      showToast(`Admin "${deleteTarget.email}" deleted successfully!`, 'success');
      setDeleteTarget(null);
      await fetchAdminUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete admin.', 'error');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  const handleResetAdminPassword = async () => {
    if (!resetTarget) return;
    setIsResettingPassword(true);
    try {
      const result = await apiService.resetAdminPassword(resetTarget.id);
      showToast(result.message || `Password reset for "${resetTarget.email}". Email sent with new credentials.`, 'success');
      setResetTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const fetchLoginHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await apiService.getLoginHistory();
      setLoginHistory((data || []) as any as LoginHistoryEntry[]);
    } catch (err: any) {
      console.error('Failed to fetch login history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || newPassword.length < 6) {
      showToast('Email and password (min 6 chars) are required.', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const result = await apiService.createAdmin(newEmail, newPassword);
      if (result?.error) throw new Error(result.error);
      showToast('Admin created successfully!', 'success');
      setNewEmail('');
      setNewPassword('');
      await fetchAdminUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !changeNewPassword || !confirmPassword) {
      showToast('All password fields are required.', 'error');
      return;
    }
    if (changeNewPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (changeNewPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiService.changePassword(currentPassword, changeNewPassword);
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setChangeNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const parseUserAgent = (ua: string): string => {
    if (!ua || ua === 'unknown') return 'Unknown Device';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    if (ua.includes('Chrome') && ua.includes('Mobile')) browser = 'Chrome Mobile';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android') || ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return `${browser} on ${os}`;
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-2.5 border border-input rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background pr-10 text-sm transition-all duration-200";

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
      <div className="glass-card w-full max-w-5xl m-4 max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-border/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl"><UserPlus size={18} className="text-primary" /></div>
            {t('Admin Management')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors duration-150"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Admin Accounts List */}
          <div className="p-5 rounded-2xl border border-border/50 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-primary/10 rounded-lg"><Users size={16} className="text-primary" /></div>
                {t('Admin Accounts')}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">{adminUsers.length} account{adminUsers.length !== 1 ? 's' : ''}</span>
            </div>
            {isLoadingAdmins ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : adminUsers.length > 0 ? (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Email')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Display Name')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Created')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {adminUsers.map(admin => (
                      <tr key={admin.id} className="hover:bg-muted/50 transition-colors duration-150">
                        <td className="px-4 py-2.5 text-foreground text-xs font-medium">
                          {admin.email}
                          {admin.id === user?.id && (
                            <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">You</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{admin.display_name || '—'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">{new Date(admin.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          {admin.id !== user?.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setResetTarget(admin)}
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors duration-150"
                                title="Reset password & send email"
                              >
                                <Mail size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(admin)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors duration-150"
                                title="Delete admin"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">{t('No admin accounts found.')}</p>
            )}
          </div>

          {/* Top row: Create Admin + Change Password side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Admin */}
            <div className="p-5 rounded-2xl border border-border/50 bg-muted/30 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-primary/10 rounded-lg"><UserPlus size={16} className="text-primary" /></div>
                {t('Create New Admin')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('Create a new administrator account.')}</p>
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t('New Admin Email')}</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="admin@svt.com" className={inputClass} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t('New Admin Password')}</label>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} required minLength={6} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {t('Create Admin')}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="p-5 rounded-2xl border border-border/50 bg-muted/30 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-primary/10 rounded-lg"><KeyRound size={16} className="text-primary" /></div>
                {t('Change Your Password')}
              </h3>
              <p className="text-xs text-muted-foreground">{t('Update your current login password.')}</p>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t('Current Password')}</label>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} required />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t('New Password')}</label>
                  <div className="relative">
                    <input type={showChangeNewPassword ? 'text' : 'password'} value={changeNewPassword} onChange={e => setChangeNewPassword(e.target.value)} className={inputClass} required minLength={6} />
                    <button type="button" onClick={() => setShowChangeNewPassword(!showChangeNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showChangeNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t('Confirm Password')}</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required minLength={6} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isChangingPassword}>
                  {isChangingPassword ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  {t('Change Password')}
                </button>
              </form>
            </div>
          </div>

          {/* Login History - full width below */}
          <div className="p-5 rounded-2xl border border-border/50 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-primary/10 rounded-lg"><History size={16} className="text-primary" /></div>
                {t('Login History')}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">{t('Last 50 Logins')}</span>
            </div>
            {isLoadingHistory ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : loginHistory.length > 0 ? (
              <div className="rounded-xl border border-border/50 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Admin')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('IP Address')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Device')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {loginHistory.map(entry => (
                      <tr key={entry.id} className="hover:bg-muted/50 transition-colors duration-150">
                        <td className="px-4 py-2.5 text-foreground text-xs font-medium">{entry.email}</td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{entry.ip_address}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{parseUserAgent(entry.user_agent)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">{t('No login history found.')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Admin Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAdmin}
        title="Delete Admin Account"
        confirmText={isDeletingAdmin ? 'Deleting...' : 'Delete'}
        variant="danger"
      >
        <p className="text-sm">
          Are you sure you want to delete the admin account <strong className="text-foreground">{deleteTarget?.email}</strong>?
        </p>
        <p className="text-sm mt-2">This action cannot be undone. All login history for this user will also be removed.</p>
      </ConfirmationModal>

      {/* Reset Password Confirmation */}
      <ConfirmationModal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={handleResetAdminPassword}
        title="Reset Admin Password"
        confirmText={isResettingPassword ? 'Resetting...' : 'Reset & Send Email'}
        variant="danger"
      >
        <p className="text-sm">
          This will generate a new temporary password for <strong className="text-foreground">{resetTarget?.email}</strong> and send it via email.
        </p>
        <p className="text-sm mt-2">The user's current session will be invalidated and they will need to log in with the new password.</p>
      </ConfirmationModal>
    </div>
  );
};

export default AdminManagementModal;
