import React from 'react';
import { AuditStatus } from '../types';
import { Check, Loader2, Globe, ShieldCheck, Compass, Sparkles } from 'lucide-react';

interface AuditProgressProps {
  status: AuditStatus;
  targetUrl: string;
  crawledPages: number;
  targetPages: number;
  currentUrl?: string;
  stageMessage?: string;
}

export const AuditProgress: React.FC<AuditProgressProps> = ({
  status,
  targetUrl,
  crawledPages,
  targetPages,
  currentUrl,
  stageMessage
}) => {
  const steps = [
    {
      id: 'validating',
      label: 'Validating URL & DNS',
      icon: Globe,
      isActive: status === 'validating',
      isPassed: ['checking_reachability', 'crawling', 'analyzing', 'completed'].includes(status)
    },
    {
      id: 'checking_reachability',
      label: 'Checking Reachability',
      icon: ShieldCheck,
      isActive: status === 'checking_reachability',
      isPassed: ['crawling', 'analyzing', 'completed'].includes(status)
    },
    {
      id: 'crawling',
      label: `Crawling Pages (${crawledPages}/${targetPages})`,
      icon: Compass,
      isActive: status === 'crawling',
      isPassed: ['analyzing', 'completed'].includes(status)
    },
    {
      id: 'analyzing',
      label: 'Analyzing SEO Signals',
      icon: Sparkles,
      isActive: status === 'analyzing',
      isPassed: status === 'completed'
    }
  ];

  const percent =
    status === 'completed'
      ? 100
      : status === 'analyzing'
      ? 90
      : status === 'crawling'
      ? Math.min(85, Math.round((crawledPages / targetPages) * 75) + 15)
      : status === 'checking_reachability'
      ? 20
      : 10;

  return (
    <div className="w-full max-w-3xl mx-auto my-8 bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-xl shadow-orange-950/5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF5500]">
            Live Server Crawl in Progress
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mt-0.5 truncate max-w-lg">
            {targetUrl}
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200/60 text-xs font-bold text-[#FF5500]">
          <Loader2 className="w-4 h-4 animate-spin text-[#FF5500]" />
          <span>{percent}% Complete</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-6">
        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF5500] to-orange-400 transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                step.isActive
                  ? 'border-[#FF5500] bg-orange-50/40 text-neutral-900 shadow-xs'
                  : step.isPassed
                  ? 'border-neutral-200 bg-neutral-50/70 text-neutral-700'
                  : 'border-neutral-100 bg-white text-neutral-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.isPassed
                      ? 'bg-emerald-500 text-white'
                      : step.isActive
                      ? 'bg-[#FF5500] text-white animate-pulse'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {step.isPassed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-bold">
                  {step.isPassed ? 'Done' : step.isActive ? 'Active' : 'Pending'}
                </span>
              </div>
              <p className="text-xs font-semibold leading-tight line-clamp-2">{step.label}</p>
            </div>
          );
        })}
      </div>

      {/* Real-time Sub-Status / Active URL */}
      <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/70 text-xs font-mono text-neutral-600">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
          <span className="font-semibold text-neutral-800">
            {stageMessage || 'Processing crawl queue...'}
          </span>
        </div>
        {currentUrl && (
          <p className="text-neutral-500 truncate pl-4">
            Target: <span className="text-neutral-800 font-medium">{currentUrl}</span>
          </p>
        )}
      </div>
    </div>
  );
};
