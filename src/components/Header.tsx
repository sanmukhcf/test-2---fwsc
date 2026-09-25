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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Section */}
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none shrink-0"
          onClick={() => onNavigate('home')}
        >
          <DigiVirusLogo size="md" subtitleText="By Lab of digiVirus" />
          <div className="h-8 w-[1px] bg-neutral-200 hidden sm:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-[#111827]">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/60 mr-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero 3rd-Party APIs &bull; Server Crawler</span>
          </div>

          {user ? (
            /* Logged In State */
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="header-dashboard-btn"
                onClick={() => onNavigate('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">My Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </button>

              <button
                id="header-new-audit-btn"
                onClick={() => onNavigate('home')}
                disabled={isAuditing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Audit</span>
              </button>

              <div className="h-6 w-[1px] bg-neutral-200 mx-0.5 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div
                  title={`Logged in as ${user.fullName} (@${user.username})`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-orange-50/70 border border-orange-200/70 text-neutral-800"
                >
                  <div className="w-6 h-6 rounded-full bg-[#FF5500] text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user.fullName ? user.fullName.charAt(0) : <User className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold text-neutral-900 hidden md:inline max-w-[120px] truncate">
                    {user.fullName || user.username}
                  </span>
                </div>

                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-xl text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out / Public State */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="header-login-btn"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 transition-all cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>

              <button
                id="header-signup-btn"
                onClick={onOpenSignup}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
