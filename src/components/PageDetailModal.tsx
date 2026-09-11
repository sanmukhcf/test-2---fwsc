import React from 'react';
import { PageAudit } from '../types';
import {
  X,
  ExternalLink,
  FileCode,
  Image as ImageIcon,
  Link2,
  Heading,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Share2
} from 'lucide-react';

interface PageDetailModalProps {
  page: PageAudit | null;
  onClose: () => void;
}

export const PageDetailModal: React.FC<PageDetailModalProps> = ({ page, onClose }) => {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 flex items-start justify-between gap-3 bg-neutral-50/80">
          <div className="truncate">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                HTTP {page.status}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                {page.responseTimeMs}ms response
              </span>
              <span className="text-xs text-neutral-400">&bull;</span>
              <span className="text-xs font-semibold text-neutral-600">
                {page.wordCount} words
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 truncate">
              {page.title || page.url}
            </h3>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-[#FF5500] hover:underline flex items-center gap-1 mt-0.5 truncate"
            >
              <span className="truncate">{page.url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-700">
          {/* Section: Title & Meta Description */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Title & Meta Description
            </h4>

            {/* Title */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900">Page Title</span>
                <span className="text-neutral-500 font-mono">
                  {page.titleLength} chars (Recommended: 30-60)
                </span>
              </div>
              <p className="text-neutral-800 text-sm font-medium">
                {page.title || <span className="text-red-500 italic">Missing title tag</span>}
              </p>
            </div>

            {/* Meta Description */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900">Meta Description</span>
                <span className="text-neutral-500 font-mono">
                  {page.descriptionLength} chars (Recommended: 70-160)
                </span>
              </div>
              <p className="text-neutral-800 text-sm">
                {page.description || (
                  <span className="text-amber-500 italic">No meta description found</span>
                )}
              </p>
            </div>
          </div>

          {/* Section: Headings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Heading className="w-3.5 h-3.5 text-[#FF5500]" />
              Heading Structure
            </h4>

            {/* H1 */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="font-bold text-neutral-900 block mb-1">
                H1 Headings ({page.h1Count}):
              </span>
              {page.h1List.length === 0 ? (
                <span className="text-red-500 italic">No H1 heading found</span>
              ) : (
                <ul className="space-y-1">
                  {page.h1List.map((h1, i) => (
                    <li key={i} className="font-semibold text-neutral-800">
                      &bull; {h1}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* H2 */}
            {page.h2List.length > 0 && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">
                  H2 Headings ({page.h2Count}):
                </span>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {page.h2List.map((h2, i) => (
                    <li key={i} className="text-neutral-600">
                      &bull; {h2}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section: Canonical & Technical */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Canonical & Indexability
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-neutral-400 block">Canonical URL:</span>
                <span className="font-mono font-medium text-neutral-800 truncate block">
                  {page.canonicalUrl || 'None specified'}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-neutral-400 block">Meta Robots:</span>
                <span className="font-mono font-medium text-neutral-800">
                  {page.metaRobots || 'index, follow (default)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Images on this page */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FF5500]" />
              Images on Page ({page.totalImages}) &bull; {page.missingAltCount} Missing Alt
            </h4>
            {page.images.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {page.images.map((img, i) => (
                  <div
                    key={i}
                    className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono truncate max-w-sm">{img.src}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        img.hasAlt
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {img.hasAlt ? `alt="${img.alt}"` : 'Missing alt'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 italic">No image tags found on this page.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
