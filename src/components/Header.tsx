import React from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  onNewAuditClick?: () => void;
  isAuditing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNewAuditClick, isAuditing }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={onNewAuditClick}>
          <DigiVirusLogo size="md" showSubtitle={false} />
          <div className="h-8 w-[1px] bg-neutral-200 hidden sm:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#111827]">
                FWSC
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#FF5500] border border-orange-200/70 uppercase tracking-wide">
                <Zap className="w-3 h-3 text-[#FF5500]" /> Real Crawler
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              Free Website SEO Checker <span className="text-neutral-400">by</span> <span className="font-semibold text-neutral-700">digiVirus</span>
            </p>
          </div>
        </div>

        {/* Right Info / Action */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 bg-neutral-100/80 px-3 py-1.5 rounded-lg border border-neutral-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Third-Party SEO APIs &bull; Server-Side Audit</span>
          </div>

          {onNewAuditClick && (
            <button
              id="header-new-audit-btn"
              onClick={onNewAuditClick}
              disabled={isAuditing}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#FF5500] hover:bg-[#E04400] text-white shadow-sm shadow-orange-500/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              New Audit
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
