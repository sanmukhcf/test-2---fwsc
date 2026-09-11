import React from 'react';
import { AuditJob } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Server,
  FileCode,
  Layers,
  Link2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface OverviewSectionProps {
  job: AuditJob;
  onNavigateTab: (tab: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ job, onNavigateTab }) => {
  const score = job.scoreBreakdown.overall;

  const getScoreMeta = (val: number) => {
    if (val >= 90) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300' };
    if (val >= 75) return { label: 'Good', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (val >= 50) return { label: 'Needs Improvement', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Poor SEO Health', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300' };
  };

  const scoreMeta = getScoreMeta(score);

  const topPriorityIssues = job.issues
    .filter(i => i.category === 'critical' || i.category === 'warning')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Score + Crawl Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Score Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between border-b border-neutral-100 pb-3 text-xs text-neutral-500 font-medium">
            <span>Overall SEO Health Score</span>
            <span className="font-semibold text-neutral-800">Ground-Truth Audit</span>
          </div>

          <div className="my-6 flex flex-col items-center">
            {/* Score Ring / Badge */}
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-neutral-50 border-8 border-neutral-100 shadow-inner">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-neutral-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`${score >= 75 ? 'stroke-emerald-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500'} transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * score) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-neutral-900 tracking-tight">
                  {score}
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                  out of 100
                </span>
              </div>
            </div>

            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${scoreMeta.bg} ${scoreMeta.color} border ${scoreMeta.border}`}
              >
                {scoreMeta.label}
              </span>
            </div>
          </div>

          <div className="w-full pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            Calculated strictly from {job.pages.length} real crawled pages &bull; 0 fake data
          </div>
        </div>

        {/* Crawl Summary & Category Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sub-Category Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Technical</span>
                <Server className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {job.scoreBreakdown.technical}
                <span className="text-xs text-neutral-400 font-normal">/100</span>
              </div>
              <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#FF5500] h-full rounded-full"
                  style={{ width: `${job.scoreBreakdown.technical}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">On-Page</span>
                <FileCode className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {job.scoreBreakdown.onPage}
                <span className="text-xs text-neutral-400 font-normal">/100</span>
              </div>
              <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#FF5500] h-full rounded-full"
                  style={{ width: `${job.scoreBreakdown.onPage}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Content</span>
                <Layers className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {job.scoreBreakdown.content}
                <span className="text-xs text-neutral-400 font-normal">/100</span>
              </div>
              <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#FF5500] h-full rounded-full"
                  style={{ width: `${job.scoreBreakdown.content}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Links</span>
                <Link2 className="w-4 h-4 text-[#FF5500]" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {job.scoreBreakdown.links}
                <span className="text-xs text-neutral-400 font-normal">/100</span>
              </div>
              <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#FF5500] h-full rounded-full"
                  style={{ width: `${job.scoreBreakdown.links}%` }}
                />
              </div>
            </div>
          </div>

          {/* Issue Tally Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => onNavigateTab('issues')}
              className="bg-white p-4 rounded-xl border border-red-200 hover:border-red-300 shadow-xs cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold">Critical Errors</span>
              </div>
              <div className="text-2xl font-black text-red-600">
                {job.stats.criticalIssuesCount}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">High SEO impact</p>
            </div>

            <div
              onClick={() => onNavigateTab('issues')}
              className="bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-300 shadow-xs cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold">Warnings</span>
              </div>
              <div className="text-2xl font-black text-amber-600">
                {job.stats.warningIssuesCount}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Optimization needed</p>
            </div>

            <div
              onClick={() => onNavigateTab('issues')}
              className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-300 shadow-xs cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold">Notices</span>
              </div>
              <div className="text-2xl font-black text-blue-600">
                {job.stats.noticeIssuesCount}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Recommended tweaks</p>
            </div>

            <div
              onClick={() => onNavigateTab('issues')}
              className="bg-white p-4 rounded-xl border border-emerald-200 hover:border-emerald-300 shadow-xs cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">Passed Checks</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {job.stats.passedChecksCount}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Healthy signals</p>
            </div>
          </div>

          {/* Crawl Parameters Bar */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-neutral-600">
            <div>
              <span className="text-neutral-400 block font-medium">Domain Audited:</span>
              <span className="font-bold text-neutral-900 font-mono truncate block">
                {job.hostname}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block font-medium">Pages Crawled:</span>
              <span className="font-bold text-neutral-900">
                {job.pages.length} / {job.maxPages} Requested
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block font-medium">Avg Response Time:</span>
              <span className="font-bold text-neutral-900">
                {job.stats.avgResponseTimeMs} ms
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block font-medium">HTTPS Protocol:</span>
              <span className="font-bold text-emerald-700">
                {job.reachability?.finalUrl.startsWith('https') ? 'Active (SSL)' : 'Insecure HTTP'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Priority Issues to Address */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Top Actionable SEO Recommendations
            </h3>
            <p className="text-xs text-neutral-500">
              Highest impact issues identified during the real site crawl
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('issues')}
            className="text-xs font-bold text-[#FF5500] hover:text-[#E04400] flex items-center gap-1 cursor-pointer"
          >
            <span>View all issues ({job.issues.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topPriorityIssues.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">
              Zero Critical or Warning Issues Found!
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Your website passed all primary foundational SEO benchmarks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPriorityIssues.map(issue => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        issue.category === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {issue.category}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {issue.title}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1">
                    {issue.description}
                  </p>
                  <p className="text-xs text-neutral-700 font-medium pt-0.5">
                    Fix: {issue.recommendation}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-lg text-neutral-700">
                    {issue.impactedPages.length} page{issue.impactedPages.length > 1 ? 's' : ''} affected
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
