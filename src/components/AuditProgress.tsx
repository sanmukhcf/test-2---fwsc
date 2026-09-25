import React from 'react';
import { AuditStatus } from '../types';
import { Check, Loader2, Globe, ShieldCheck, Compass, Sparkles, Database } from 'lucide-react';

interface AuditProgressProps {
  status: AuditStatus;
  targetUrl: string;
  crawledPages: number;
  targetPages?: number;
  currentUrl?: string;
  stageMessage?: string;
}

export const AuditProgress: React.FC<AuditProgressProps> = ({
  status,
  targetUrl,
  crawledPages,
  targetPages = 10,
  currentUrl,
  stageMessage
}) => {
  // Normalize status to one of the 5 canonical stages
  const getNormalizedStage = (s: AuditStatus) => {
    if (s === 'validating_website' || s === 'validating') return 'validating_website';
    if (s === 'checking_domain' || s === 'checking_reachability') return 'checking_domain';
    if (s === 'crawling_web' || s === 'crawling') return 'crawling_web';
    if (s === 'analyzing_seo' || s === 'analyzing') return 'analyzing_seo';
    if (s === 'saving_audit') return 'saving_audit';
    if (s === 'completed') return 'completed';
    return 'validating_website';
  };

  const stage = getNormalizedStage(status);

  const stageOrder = [
    'validating_website',
    'checking_domain',
    'crawling_web',
    'analyzing_seo',
    'saving_audit',
    'completed'
  ];

  const currentStageIndex = stageOrder.indexOf(stage);

  const steps = [
    {
      id: 'validating_website',
      label: 'Validating Website',
      description: 'Checking URL structure & SSRF guard',
      icon: Globe
    },
    {
      id: 'checking_domain',
      label: 'Checking Domain',
      description: 'DNS resolution & HTTP/HTTPS reachability',
      icon: ShieldCheck
    },
    {
      id: 'crawling_web',
      label: `Crawling Web (${crawledPages} pages found)`,
      description: 'Discovering indexable pages & links',
      icon: Compass
    },
    {
      id: 'analyzing_seo',
      label: 'Analyzing SEO',
      description: 'Evaluating on-page, tech, content & links',
      icon: Sparkles
    },
    {
      id: 'saving_audit',
      label: 'Saving Audit',
      description: 'Archiving report to your private history',
      icon: Database
    }
  ];

  const calculatePercent = () => {
    if (stage === 'completed') return 100;
    if (stage === 'saving_audit') return 95;
    if (stage === 'analyzing_seo') return 85;
    if (stage === 'crawling_web') {
      const crawlRatio = Math.min(1, (crawledPages || 1) / Math.max(crawledPages || 1, targetPages || 10));
      return Math.min(80, Math.round(35 + crawlRatio * 45));
    }
    if (stage === 'checking_domain') return 25;
    return 10;
  };

  const percent = calculatePercent();

  return (
    <div className="w-full max-w-3xl mx-auto my-8 bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/90 shadow-xl shadow-orange-950/5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF5500]">
            Live Server Crawl in Progress
          </span>
          <h3 className="text-lg sm:text-xl font-black text-neutral-900 mt-0.5 truncate max-w-lg">
            {targetUrl}
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-3.5 py-1.5 rounded-xl border border-orange-200/70 text-xs font-bold text-[#FF5500]">
          <Loader2 className="w-4 h-4 animate-spin text-[#FF5500]" />
          <span>{percent}% Complete</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-6">
        <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF5500] to-orange-400 transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 5 Distinct Audit States Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isPassed = currentStageIndex > idx;
          const isActive = currentStageIndex === idx;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                isActive
                  ? 'border-[#FF5500] bg-orange-50/50 text-neutral-900 shadow-xs ring-1 ring-[#FF5500]/20'
                  : isPassed
                  ? 'border-neutral-200 bg-neutral-50/70 text-neutral-800'
                  : 'border-neutral-100 bg-white text-neutral-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-[#FF5500] text-white animate-pulse'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {isPassed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px] font-bold">
                  {isPassed ? 'Done' : isActive ? 'Active' : 'Pending'}
                </span>
              </div>
              <p className="text-xs font-bold leading-tight text-neutral-900 truncate">
                {step.label}
              </p>
              <p className="text-[10px] text-neutral-500 leading-tight mt-0.5 hidden sm:block">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Real-time Current Action Message */}
      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/70 text-xs font-mono text-neutral-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
          <span className="font-bold text-neutral-900">
            {stageMessage || 'Processing live crawl pipeline...'}
          </span>
        </div>
        {currentUrl && (
          <p className="text-neutral-500 truncate pl-4.5 mt-1 font-sans text-xs">
            Current Action: <span className="text-neutral-900 font-semibold font-mono">{currentUrl}</span>
          </p>
        )}
      </div>
    </div>
  );
};
