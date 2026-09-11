import React, { useState } from 'react';
import { PageAudit } from '../../types';
import { Search, ArrowUpDown, ExternalLink, Eye, Image as ImageIcon, Link2 } from 'lucide-react';

interface PagesSectionProps {
  pages: PageAudit[];
  onSelectPage: (page: PageAudit) => void;
}

export const PagesSection: React.FC<PagesSectionProps> = ({ pages, onSelectPage }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'url' | 'time' | 'words' | 'status'>('url');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredPages = pages
    .filter(p => {
      if (statusFilter !== 'all') {
        if (statusFilter === '200' && p.status !== 200) return false;
        if (statusFilter === 'errors' && p.status < 400) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.url.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'url') comp = a.url.localeCompare(b.url);
      else if (sortBy === 'time') comp = a.responseTimeMs - b.responseTimeMs;
      else if (sortBy === 'words') comp = a.wordCount - b.wordCount;
      else if (sortBy === 'status') comp = a.status - b.status;
      return sortOrder === 'asc' ? comp : -comp;
    });

  const toggleSort = (field: 'url' | 'time' | 'words' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{code} OK</span>;
    }
    if (code >= 300 && code < 400) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">{code} Redirect</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">{code} Error</span>;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search crawled URLs or titles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses ({pages.length})</option>
            <option value="200">HTTP 200 OK</option>
            <option value="errors">HTTP Errors (4xx/5xx)</option>
          </select>
        </div>

        <div className="text-xs text-neutral-500 font-medium">
          Showing <span className="font-bold text-neutral-900">{filteredPages.length}</span> of{' '}
          <span className="font-bold text-neutral-900">{pages.length}</span> crawled pages
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('url')}>
                  <div className="flex items-center gap-1">
                    <span>Page URL & Title</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('time')}>
                  <div className="flex items-center gap-1">
                    <span>Speed</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('words')}>
                  <div className="flex items-center gap-1">
                    <span>Words</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-3 px-3">H1 Headings</th>
                <th className="py-3 px-3">Images</th>
                <th className="py-3 px-3">Links</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPages.map((page, idx) => (
                <tr
                  key={page.url + idx}
                  className="hover:bg-orange-50/20 transition-colors"
                >
                  {/* URL & Title */}
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-bold text-neutral-900 truncate mb-0.5">
                      {page.title || (
                        <span className="text-red-500 italic font-normal">Missing title</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 truncate">
                      <span className="truncate">{page.path || '/'}</span>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-[#FF5500] shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {getStatusBadge(page.status)}
                  </td>

                  {/* Response Time */}
                  <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                    <span
                      className={`font-semibold ${
                        page.responseTimeMs < 800
                          ? 'text-emerald-700'
                          : page.responseTimeMs < 1800
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {page.responseTimeMs}ms
                    </span>
                  </td>

                  {/* Words */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className={`font-semibold ${page.wordCount < 200 ? 'text-amber-700' : 'text-neutral-800'}`}>
                      {page.wordCount.toLocaleString()}
                    </span>
                  </td>

                  {/* H1 */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {page.h1Count === 1 ? (
                      <span className="text-emerald-700 font-semibold">1 (OK)</span>
                    ) : page.h1Count === 0 ? (
                      <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">0 (Missing)</span>
                    ) : (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">{page.h1Count} (Multiple)</span>
                    )}
                  </td>

                  {/* Images */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-neutral-600">
                      <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{page.totalImages}</span>
                      {page.missingAltCount > 0 && (
                        <span className="text-amber-600 font-bold text-[10px] ml-1">
                          ({page.missingAltCount} no alt)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Links */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-neutral-600">
                      <Link2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{page.internalLinkCount} int / {page.externalLinkCount} ext</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectPage(page)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-[#FF5500] text-neutral-700 hover:text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
