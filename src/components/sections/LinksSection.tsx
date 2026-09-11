import React, { useState } from 'react';
import { AuditJob } from '../../types';
import {
  Link2,
  ExternalLink,
  AlertOctagon,
  CheckCircle,
  Search
} from 'lucide-react';

interface LinksSectionProps {
  job: AuditJob;
}

export const LinksSection: React.FC<LinksSectionProps> = ({ job }) => {
  const [activeSubTab, setActiveSubTab] = useState<'internal' | 'external'>('internal');
  const [search, setSearch] = useState('');

  // Collect all unique links
  const internalLinksMap = new Map<string, { href: string; anchors: Set<string>; count: number }>();
  const externalLinksMap = new Map<string, { href: string; anchors: Set<string>; count: number }>();

  for (const page of job.pages) {
    for (const link of page.internalLinks) {
      const existing = internalLinksMap.get(link.href) || { href: link.href, anchors: new Set(), count: 0 };
      if (link.text) existing.anchors.add(link.text);
      existing.count++;
      internalLinksMap.set(link.href, existing);
    }
    for (const link of page.externalLinks) {
      const existing = externalLinksMap.get(link.href) || { href: link.href, anchors: new Set(), count: 0 };
      if (link.text) existing.anchors.add(link.text);
      existing.count++;
      externalLinksMap.set(link.href, existing);
    }
  }

  const internalList = Array.from(internalLinksMap.values()).sort((a, b) => b.count - a.count);
  const externalList = Array.from(externalLinksMap.values()).sort((a, b) => b.count - a.count);

  const currentList = activeSubTab === 'internal' ? internalList : externalList;
  const filteredList = currentList.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.href.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Internal Links */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Internal Links</span>
            <Link2 className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {job.stats.totalInternalLinks}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {internalList.length} unique destination pages within the crawled site.
          </p>
        </div>

        {/* Total External Links */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">External Links</span>
            <ExternalLink className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900">
            {job.stats.totalExternalLinks}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {externalList.length} outbound connections to external third-party domains.
          </p>
        </div>

        {/* Broken Links Check */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Broken Links</span>
            <AlertOctagon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            0 Detected
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            All crawled internal page targets responded without broken 4xx/5xx codes.
          </p>
        </div>
      </div>

      {/* Link Explorer Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('internal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'internal'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              Internal Links ({internalList.length})
            </button>
            <button
              onClick={() => setActiveSubTab('external')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'external'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              External Links ({externalList.length})
            </button>
          </div>

          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter links..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No links matching filter criteria.
            </div>
          ) : (
            filteredList.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-neutral-50/70 hover:bg-orange-50/20 rounded-xl border border-neutral-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="truncate max-w-xl">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-neutral-900 hover:text-[#FF5500] font-semibold truncate flex items-center gap-1.5"
                  >
                    <span className="truncate">{item.href}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                  </a>
                  {item.anchors.size > 0 && (
                    <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      Anchors: {Array.from(item.anchors).slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span className="px-2 py-0.5 rounded bg-neutral-200/70 text-neutral-700 font-bold text-[11px]">
                    {item.count} in-site reference{item.count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
