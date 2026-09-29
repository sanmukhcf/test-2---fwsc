import React from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { ShieldCheck, User, LogOut, LayoutDashboard, PlusCircle, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  currentView: 'home' | 'dashboard' | 'audit_progress' | 'audit_report' | 'audit_failure';
  onNavigate: (view: 'home' | 'dashboard') => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onLogout: () => void;
  isAuditing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  onNavigate,
  onOpenLogin,
  onOpenSignup,
  onLogout,
  isAuditing
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-3 w-full min-w-0">
        {/* Brand Section */}
        <div
          className="flex items-center gap-1.5 sm:gap-3.5 cursor-pointer select-none shrink-0 min-w-0"
          onClick={() => onNavigate('home')}
        >
          {/* Compact logo on mobile to prevent horizontal push, full on sm+ */}
          <DigiVirusLogo size="sm" showSubtitle={false} className="sm:hidden" />
          <DigiVirusLogo size="md" subtitleText="By Lab of digiVirus" className="hidden sm:inline-flex" />
          <div className="h-8 w-[1px] bg-neutral-200 hidden sm:block" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight text-[#111827]">
                FWSC
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#FF5500] border border-orange-200/80 uppercase tracking-wide">
                Live Audit
              </span>
            </div>
            <p className="hidden sm:block text-xs text-neutral-600 font-medium leading-tight whitespace-nowrap">
              Free Website SEO Checker <span className="text-neutral-400">&bull;</span> <span className="font-semibold text-neutral-800">By Lab of digiVirus</span>
            </p>
          </div>
        </div>

        {/* Right Section Navigation & Auth */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/60 mr-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero 3rd-Party APIs &bull; Server Crawler</span>
          </div>

          {user ? (
            /* Logged In State */
            <div className="flex items-center gap-1 sm:gap-2.5">
              <button
                id="header-dashboard-btn"
                onClick={() => onNavigate('dashboard')}
                title="My Dashboard"
                className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">My Dashboard</span>
                <span className="hidden min-[360px]:inline sm:hidden">Dashboard</span>
              </button>

              <button
                id="header-new-audit-btn"
                onClick={() => onNavigate('home')}
                disabled={isAuditing}
                title="New Audit"
                className="inline-flex items-center gap-1 px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">New Audit</span>
                <span className="hidden min-[360px]:inline sm:hidden">Audit</span>
              </button>

              <div className="h-6 w-[1px] bg-neutral-200 mx-0.5 hidden sm:block" />

              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  title={`Logged in as ${user.fullName} (@${user.username})`}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF5500] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-2xs"
                >
                  {user.fullName ? user.fullName.charAt(0) : <User className="w-3.5 h-3.5" />}
                </div>

                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 sm:p-2 rounded-xl text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out / Public State */
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                id="header-login-btn"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 transition-all cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>

              <button
                id="header-signup-btn"
                onClick={onOpenSignup}
                className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="hidden min-[360px]:inline">Create Account</span>
                <span className="min-[360px]:hidden">Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
