import React, { useRef, useState } from 'react';
import { X, Settings as SettingsIcon, Shield, Download, Upload, Loader2, Cloud, Database } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogo } from '../contexts/LogoContext';
import { useLoans } from '../contexts/LoanContext';
import { useInvestors } from '../contexts/InvestorContext';
import { useToastContext } from '../contexts/ToastContext';
import AdminManagementModal from './AdminManagementModal';
import ConfirmationModal from './ConfirmationModal';
import apiService from '../utils/apiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { logo, setLogo, resetLogo } = useLogo();
  const { loans, refreshLoans } = useLoans();
  const { investors, refreshInvestors } = useInvestors();
  const { showToast } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isBackingUpMongo, setIsBackingUpMongo] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  if (!isOpen) return null;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvTC3wwj7UkOuVadvisinRCNag2tDlKZpoyQqa9ij-TJXS5Q_hdMuvMGZQi0MlCOaI/exec';

  const getBackupData = () => {
    return { loans, investors, exportedAt: new Date().toISOString() };
  };

  const getFileName = () => {
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
    return `sri-vinayaka-backup-${dateString}.json`;
  };

  const handleExportData = async () => {
    setIsBackingUp(true);
    try {
      const data = getBackupData();
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = getFileName();

      // Upload to Google Drive via Apps Script
      const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
      const payload = {
        filename: fileName,
        mimeType: 'application/json',
        data: base64Data,
      };

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Also download locally as a fallback
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Backup uploaded to Google Drive & downloaded locally!', 'success');
    } catch (err) {
      console.error('Backup error:', err);
      showToast('Failed to backup. Local download attempted.', 'error');
      try {
        const data = getBackupData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFileName();
        a.click();
        URL.revokeObjectURL(url);
      } catch {}
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleBackupToMongo = async () => {
    setIsBackingUpMongo(true);
    try {
      const data = getBackupData();
      await apiService.backupToMongo(data);
      showToast('Backup saved to MongoDB Atlas successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to backup to MongoDB Atlas.', 'error');
    } finally {
      setIsBackingUpMongo(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.loans || data.investors) {
          setPendingRestoreData(data);
          setShowRestoreConfirm(true);
        } else {
          showToast('Invalid backup file format.', 'error');
        }
      } catch {
        showToast('Failed to parse backup file.', 'error');
      }
    };
    reader.readAsText(file);
    if (restoreInputRef.current) restoreInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    try {
      await apiService.restoreBackup(pendingRestoreData);
      await refreshLoans();
      await refreshInvestors();
      showToast(`Restored ${pendingRestoreData.loans?.length || 0} loans and ${pendingRestoreData.investors?.length || 0} investors successfully!`, 'success');
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast(err.message || 'Failed to restore backup.', 'error');
    } finally {
      setIsRestoring(false);
      setPendingRestoreData(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
      <div className="glass-card w-full max-w-lg m-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl"><SettingsIcon size={18} className="text-primary" /></div>
            {t('Settings')}
          </h2>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-xl hover:bg-muted transition-colors duration-150">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Custom Logo */}
          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm">Custom Logo</h3>
            <p className="text-xs text-muted-foreground">Change the application logo. This is saved on your device.</p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border border-border/50 p-1.5 bg-muted/50 overflow-hidden">
                <img src={logo} alt="Current logo" className="h-full w-full object-contain" />
              </div>
              <div className='flex-grow'>
                <input type="file" id="logo-upload" ref={fileInputRef} accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-xs">Change Logo</button>
                <button onClick={resetLogo} className="text-xs text-destructive hover:underline mt-2 ml-2 font-medium">Reset to default</button>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <div className="border-t border-border/50 pt-6 space-y-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><Shield size={16} className="text-primary" />{t('Admin Management')}</h3>
            <p className="text-xs text-muted-foreground">{t('Manage admin users and passwords.')}</p>
            <button onClick={() => setIsAdminModalOpen(true)} className="btn btn-secondary text-xs">{t('Manage Admins')}</button>
          </div>

          {/* Data Management */}
          <div className="border-t border-border/50 pt-6 space-y-5">
            <h3 className="font-bold text-foreground text-sm">{t('Data Management')}</h3>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">{t('Download Backup')}</h4>
              <p className="text-xs text-muted-foreground">Saves to Google Drive & downloads locally.</p>
              <button onClick={handleExportData} disabled={isBackingUp} className="btn btn-secondary text-xs flex items-center gap-2">
                {isBackingUp ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                {isBackingUp ? 'Uploading...' : t('Backup to Drive')}
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Backup to MongoDB Atlas</h4>
              <p className="text-xs text-muted-foreground">Send current data to MongoDB Atlas for safekeeping.</p>
              <button onClick={handleBackupToMongo} disabled={isBackingUpMongo} className="btn btn-secondary text-xs flex items-center gap-2">
                {isBackingUpMongo ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                {isBackingUpMongo ? 'Saving...' : 'Backup to MongoDB'}
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">{t('Import Backup')}</h4>
              <p className="text-xs text-muted-foreground">{t('Restore data from a previously saved JSON file. This will overwrite current records.')}</p>
              <input type="file" ref={restoreInputRef} accept=".json" onChange={handleImportData} className="hidden" />
              <button onClick={() => restoreInputRef.current?.click()} disabled={isRestoring} className="btn btn-secondary text-xs flex items-center gap-2">
                {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isRestoring ? 'Restoring...' : t('Restore from File')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <AdminManagementModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <ConfirmationModal
        isOpen={showRestoreConfirm}
        onClose={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); }}
        onConfirm={handleConfirmRestore}
        title="Confirm Data Restore"
        confirmText="Restore"
        variant="danger"
      >
        <p className="text-sm font-semibold text-foreground">This is a destructive action and cannot be undone.</p>
        <p className="text-sm mt-2">
          Restoring from this backup file will permanently delete all existing loans and investors and replace them with the data from the file.
        </p>
        {pendingRestoreData && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-1">
            <p><strong>Loans:</strong> {pendingRestoreData.loans?.length || 0}</p>
            <p><strong>Investors:</strong> {pendingRestoreData.investors?.length || 0}</p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};

export default SettingsModal;
