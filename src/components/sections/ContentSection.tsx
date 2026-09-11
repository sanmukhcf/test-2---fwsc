import React from 'react';
import { AuditJob } from '../../types';
import {
  FileText,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface ContentSectionProps {
  job: AuditJob;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ job }) => {
  const pages = job.pages;

  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const avgWords = pages.length > 0 ? Math.round(totalWords / pages.length) : 0;
  const thinPages = pages.filter(p => p.status === 200 && p.wordCount < 200);

  const totalImages = job.stats.totalImages;
  const missingAlt = job.stats.totalMissingAlt;
  const altCoverage = totalImages > 0 ? Math.round(((totalImages - missingAlt) / totalImages) * 100) : 100;

  // Collect samples of images missing alt
  const missingAltSamples: { pageUrl: string; src: string }[] = [];
  for (const page of pages) {
    for (const img of page.images) {
      if (!img.hasAlt) {
        missingAltSamples.push({ pageUrl: page.url, src: img.src });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Content Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average Word Count */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Words</span>
            <FileText className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {avgWords.toLocaleString()}
            <span className="text-xs font-normal text-neutral-400 ml-1">words / page</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Total of {totalWords.toLocaleString()} body words indexed across {pages.length} pages.
          </p>
        </div>

        {/* Thin Content Flag */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Thin Content</span>
            {thinPages.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {thinPages.length}
            <span className="text-xs font-normal text-neutral-400 ml-1">page(s) &lt; 200 words</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {thinPages.length > 0
              ? 'Low word counts may fail search intent or trigger low-quality signals.'
              : 'All pages meet healthy content volume thresholds.'}
          </p>
        </div>

        {/* Image Alt Coverage */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Image Alt Coverage</span>
            <ImageIcon className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {altCoverage}%
            <span className="text-xs font-normal text-neutral-400 ml-1">
              ({totalImages - missingAlt}/{totalImages})
            </span>
          </div>
          <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                altCoverage >= 90 ? 'bg-emerald-500' : altCoverage >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${altCoverage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Thin Content Pages Breakdown */}
      {thinPages.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs">
          <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Thin Content Detected on {thinPages.length} Page(s)
          </h4>
          <div className="space-y-2">
            {thinPages.map((tp, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs"
              >
                <div className="truncate max-w-md">
                  <span className="font-bold text-neutral-900 block truncate">{tp.title || tp.url}</span>
                  <span className="font-mono text-neutral-500 truncate block">{tp.path}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-amber-900">{tp.wordCount} words</span>
                  <span className="text-neutral-400 block text-[10px]">~1 min read</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Alt Text Images List */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#FF5500]" />
              Image Accessibility & Alt Text
            </h4>
            <p className="text-xs text-neutral-500">
              Images lacking alt text fail WCAG accessibility and cannot rank in Google Image search.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-md text-neutral-700">
            {missingAlt} Missing Alt
          </span>
        </div>

        {missingAltSamples.length === 0 ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>All detected images include descriptive alt text attributes!</span>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {missingAltSamples.slice(0, 20).map((img, i) => (
              <div
                key={i}
                className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="truncate max-w-lg font-mono text-neutral-800">
                  <span className="text-red-500 font-bold mr-1">[Missing Alt]</span>
                  <span className="truncate">{img.src}</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono truncate shrink-0">
                  Found on: {new URL(img.pageUrl).pathname}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
