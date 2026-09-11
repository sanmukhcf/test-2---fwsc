import React, { useState } from 'react';
import { AuditIssue } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink
} from 'lucide-react';

interface IssuesSectionProps {
  issues: AuditIssue[];
}

export const IssuesSection: React.FC<IssuesSectionProps> = ({ issues }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'notice' | 'passed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredIssues = issues.filter(issue => {
    if (activeFilter !== 'all' && issue.category !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.recommendation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: issues.length,
    critical: issues.filter(i => i.category === 'critical').length,
    warning: issues.filter(i => i.category === 'warning').length,
    notice: issues.filter(i => i.category === 'notice').length,
    passed: issues.filter(i => i.category === 'passed').length
  };

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'critical':
        return {
          icon: ShieldAlert,
          badge: 'Critical Error',
          bg: 'bg-red-50 text-red-800 border-red-200',
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          badge: 'Warning',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          iconColor: 'text-amber-600'
        };
      case 'notice':
        return {
          icon: Info,
          badge: 'Notice',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600'
        };
      default:
        return {
          icon: CheckCircle2,
          badge: 'Passed Check',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconColor: 'text-emerald-600'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Filter Pills & Search */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'critical'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 hover:bg-red-100 text-red-700'
            }`}
          >
            Critical ({counts.critical})
          </button>
          <button
            onClick={() => setActiveFilter('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'warning'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
            }`}
          >
            Warnings ({counts.warning})
          </button>
          <button
            onClick={() => setActiveFilter('notice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'notice'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
          >
            Notices ({counts.notice})
          </button>
          <button
            onClick={() => setActiveFilter('passed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'passed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Passed ({counts.passed})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200 text-neutral-500">
            <p className="text-sm font-semibold">No issues matching this filter.</p>
          </div>
        ) : (
          filteredIssues.map(issue => {
            const meta = getCategoryMeta(issue.category);
            const Icon = meta.icon;
            const isExpanded = expandedId === issue.id;

            return (
              <div
                key={issue.id}
                className="bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 shadow-xs transition-all overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${meta.bg} border shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${meta.bg}`}
                        >
                          {meta.badge}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900">
                          {issue.title}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-1">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-md text-neutral-600 hidden sm:inline-block">
                      {issue.impactedPages.length} {issue.impactedPages.length === 1 ? 'page' : 'pages'}
                    </span>
                    <button className="text-neutral-400 hover:text-neutral-700">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-neutral-100 bg-neutral-50/50 space-y-4">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        Diagnostic Details:
                      </h5>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#FF5500] mb-1">
                        How to Resolve:
                      </h5>
                      <p className="text-xs sm:text-sm text-neutral-800 font-medium">
                        {issue.recommendation}
                      </p>
                    </div>

                    {/* Impacted URLs */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                        Affected URLs ({issue.impactedPages.length}):
                      </h5>
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {issue.impactedPages.map((page, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-white p-2.5 rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                          >
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-neutral-800 hover:text-[#FF5500] truncate flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{page.url}</span>
                            </a>
                            {page.detail && (
                              <span className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-mono shrink-0">
                                {page.detail}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
