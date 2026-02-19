import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLogo } from '../contexts/LogoContext';
import { Language } from '../types';
import { Bell, LogOut, Settings, HandCoins, Users, Menu, X, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import SettingsModal from './SettingsModal';
import { useSync } from '../contexts/SyncContext';
import { sanitize } from '../utils/sanitizer';

const Header: React.FC = () => {
  const { admin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { logo } = useLogo();
  const { isOnline } = useSync();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (lang: Language) => setLanguage(lang);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const NavIconButton: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200
        ${isActive(to)
          ? 'bg-primary-foreground/20 text-primary-foreground shadow-sm'
          : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground'
        }`}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );

  return (
    <>
      <header className="bg-gradient-to-r from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Logo + Brand */}
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary-foreground/15 p-1.5 backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-primary-foreground/20 overflow-hidden ring-1 ring-primary-foreground/10">
                <img src={logo} alt="Logo" className="h-full w-full object-contain drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold tracking-tight leading-tight">{t('Sri Vinayaka Tenders')}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-muted-foreground/50'}`} />
                  <span className="text-[10px] text-primary-foreground/50 font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1.5">
              {/* Navigation Links */}
              <nav className="flex items-center gap-1 mr-2">
                <NavIconButton to="/" icon={<HandCoins size={15} />} label={t('Loans')} />
                <NavIconButton to="/investors" icon={<Users size={15} />} label={t('Investors')} />
                <NavIconButton to="/repayments" icon={<HandCoins size={15} />} label={t('Repayments')} />
              </nav>

              {/* Divider */}
              <div className="h-6 w-px bg-primary-foreground/15 mx-1" />

              {/* Language Toggle */}
              <div className="flex items-center bg-primary-foreground/10 rounded-lg overflow-hidden">
                <button onClick={() => handleLanguageChange('en')} className={`px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 ${language === 'en' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/60 hover:text-primary-foreground'}`}>EN</button>
                <button onClick={() => handleLanguageChange('te')} className={`px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 ${language === 'te' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/60 hover:text-primary-foreground'}`}>TE</button>
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200">
                  <Bell size={17} className="text-primary-foreground/70" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-primary animate-scale-in">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl shadow-elevated border overflow-hidden text-foreground animate-fade-in-up">
                    <div className="p-4 font-semibold text-sm border-b flex justify-between items-center bg-muted/50">
                      <span className="font-bold">{t('Notifications')}</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-4 text-sm border-b hover:bg-muted/50 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                          <p className="font-semibold">{sanitize(n.title)}</p>
                          <p className="text-muted-foreground text-xs mt-1">{sanitize(n.message)}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      )) : (
                        <p className="p-6 text-center text-sm text-muted-foreground">{t('No new notifications')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200" title={t('Settings')}>
                <Settings size={17} className="text-primary-foreground/70" />
              </button>

              {/* User + Logout */}
              <div className="h-6 w-px bg-primary-foreground/15 mx-1" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-primary-foreground/50 hidden lg:block max-w-[120px] truncate">
                  {sanitize(admin?.username) || 'User'}
                </span>
                <button onClick={signOut} className="p-2 rounded-xl hover:bg-destructive/30 transition-all duration-200 group" title={t('Logout')}>
                  <LogOut size={16} className="text-primary-foreground/70 group-hover:text-destructive-foreground" />
                </button>
              </div>
            </div>

            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-0.5">
              <div className="relative" ref={!isMobileMenuOpen ? notificationRef : undefined}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl hover:bg-primary-foreground/10 transition-all">
                  <Bell size={18} className="text-primary-foreground/80" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-primary">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-card rounded-2xl shadow-elevated border overflow-hidden text-foreground animate-fade-in-up z-50">
                    <div className="p-3 font-semibold text-sm border-b flex justify-between items-center bg-muted/50">
                      <span className="font-bold">{t('Notifications')}</span>
                      {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">Mark all read</button>}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 text-sm border-b hover:bg-muted/50 cursor-pointer ${!n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                          <p className="font-semibold text-xs">{sanitize(n.title)}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{sanitize(n.message)}</p>
                        </div>
                      )) : <p className="p-4 text-center text-xs text-muted-foreground">{t('No new notifications')}</p>}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl hover:bg-primary-foreground/10 transition-all">
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-primary-foreground/10 bg-primary/95 backdrop-blur-md animate-fade-in-fast">
            <div className="container mx-auto px-4 py-3 space-y-1">
              {/* User info bar */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary-foreground/5 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary-foreground/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{(admin?.username || 'U')[0].toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-medium text-primary-foreground/70 truncate max-w-[160px]">{sanitize(admin?.username) || 'User'}</span>
                </div>
                <div className="flex items-center bg-primary-foreground/10 rounded-lg overflow-hidden">
                  <button onClick={() => handleLanguageChange('en')} className={`px-2.5 py-1 text-[11px] font-bold ${language === 'en' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/60'}`}>EN</button>
                  <button onClick={() => handleLanguageChange('te')} className={`px-2.5 py-1 text-[11px] font-bold ${language === 'te' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/60'}`}>TE</button>
                </div>
              </div>

              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${isActive('/') ? 'bg-primary-foreground/15 text-primary-foreground' : 'text-primary-foreground/80 hover:bg-primary-foreground/10'}`}>
                <HandCoins size={16} /> {t('Loans')}
              </Link>
              <Link to="/investors" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${isActive('/investors') ? 'bg-primary-foreground/15 text-primary-foreground' : 'text-primary-foreground/80 hover:bg-primary-foreground/10'}`}>
                <Users size={16} /> {t('Investors')}
              </Link>
              <Link to="/repayments" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${isActive('/repayments') ? 'bg-primary-foreground/15 text-primary-foreground' : 'text-primary-foreground/80 hover:bg-primary-foreground/10'}`}>
                <HandCoins size={16} /> {t('Repayments')}
              </Link>
              <button onClick={() => { setIsSettingsModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl text-primary-foreground/80 hover:bg-primary-foreground/10 text-sm font-medium">
                <Settings size={16} /> {t('Settings')}
              </button>
              <div className="pt-1 border-t border-primary-foreground/10 mt-1">
                <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl text-destructive-foreground/80 hover:bg-destructive/20 text-sm font-medium">
                  <LogOut size={16} /> {t('Logout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </>
  );
};

export default Header;