import React from 'react';
import { RecentSite } from '../types';
import { History, ArrowUpRight, AlertTriangle, CheckCircle } from 'lucide-react';

interface RecentAuditsProps {
  recentSites: RecentSite[];
  onSelectSite: (url: string) => void;
}

export const RecentAudits: React.FC<RecentAuditsProps> = ({ recentSites, onSelectSite }) => {
  // Never show hardcoded demo sites. Only show validated sites from real audits.
  if (!recentSites || recentSites.length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 65) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const formatDate = (timestamp: number) => {
    const diffMin = Math.round((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#FF5500]" />
          <h3 className="text-sm font-bold text-neutral-800 tracking-tight">
            Recently Audited Websites
          </h3>
        </div>
        <span className="text-xs text-neutral-400">
          Verified live domains only
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {recentSites.map(site => (
          <div
            key={site.domain + site.timestamp}
            onClick={() => onSelectSite(site.url)}
            className="group bg-white p-3.5 rounded-xl border border-neutral-200 hover:border-orange-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="truncate">
                <h4 className="font-bold text-sm text-neutral-900 group-hover:text-[#FF5500] transition-colors truncate">
                  {site.domain}
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {site.crawledPages} pages crawled &bull; {formatDate(site.timestamp)}
                </p>
              </div>
              <div
                className={`text-xs font-black px-2 py-0.5 rounded-md border shrink-0 ${getScoreColor(
                  site.score
                )}`}
              >
                {site.score}/100
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                {site.criticalIssues > 0 ? (
                  <span className="flex items-center gap-1 text-red-600 text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3" /> {site.criticalIssues} critical
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
                    <CheckCircle className="w-3 h-3" /> 0 critical
                  </span>
                )}
              </div>
              <span className="flex items-center gap-0.5 text-neutral-400 group-hover:text-[#FF5500] font-medium text-[11px]">
                Re-audit <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
