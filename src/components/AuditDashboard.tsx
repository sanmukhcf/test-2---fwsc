import React, { useState } from 'react';
import { AuditJob, PageAudit } from '../types';
import { DigiVirusLogo } from './DigiVirusLogo';
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Server,
  FileCode,
  Layers,
  Link2,
  RotateCcw,
  Download,
  Share2,
  Check,
  Globe,
  ExternalLink,
  Printer,
  Table
} from 'lucide-react';
import { OverviewSection } from './sections/OverviewSection';
import { IssuesSection } from './sections/IssuesSection';
import { PagesSection } from './sections/PagesSection';
import { TechnicalSection } from './sections/TechnicalSection';
import { OnPageSection } from './sections/OnPageSection';
import { ContentSection } from './sections/ContentSection';
import { LinksSection } from './sections/LinksSection';
import { PageDetailModal } from './PageDetailModal';

interface AuditDashboardProps {
  job: AuditJob;
  onReAudit: () => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ job, onReAudit }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'issues' | 'pages' | 'technical' | 'onpage' | 'content' | 'links'
  >('overview');
  const [selectedPage, setSelectedPage] = useState<PageAudit | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'issues',
      label: 'Issues',
      icon: AlertTriangle,
      badge: job.stats.criticalIssuesCount + job.stats.warningIssuesCount
    },
    { id: 'pages', label: 'Pages', icon: FileText, badge: job.pages.length },
    { id: 'technical', label: 'Technical SEO', icon: Server },
    { id: 'onpage', label: 'On-Page SEO', icon: FileCode },
    { id: 'content', label: 'Content', icon: Layers },
    { id: 'links', label: 'Links', icon: Link2 }
  ];

  const handleShareLink = () => {
    const shareUrl = window.location.href;
    const summary = `FWSC SEO Audit: ${job.finalUrl} (Score: ${job.scoreBreakdown.overall}/100)\nBy Lab of digiVirus\n${shareUrl}`;
    navigator.clipboard.writeText(summary);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = () => {
    // Triggers browser native Print-to-PDF
    window.print();
  };

  const handleDownloadCsv = () => {
    // Construct real CSV from crawled pages data
    const headers = [
      'URL',
      'HTTP Status',
      'Response Time (ms)',
      'Title',
      'Title Length',
      'Meta Description',
      'Description Length',
      'H1 Count',
      'H1 Text',
      'H2 Count',
      'Word Count',
      'Reading Time (min)',
      'Canonical URL',
      'Total Images',
      'Missing Alt Count',
      'Internal Links Count',
      'External Links Count',
      'HTTPS',
      'Noindex'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = job.pages.map(p => [
      escapeCsv(p.url),
      p.status,
      p.responseTimeMs,
      escapeCsv(p.title),
      p.titleLength,
      escapeCsv(p.description),
      p.descriptionLength,
      p.h1Count,
      escapeCsv(p.h1List ? p.h1List.join(' | ') : ''),
      p.h2Count,
      p.wordCount,
      p.readingTimeMinutes,
      escapeCsv(p.canonicalUrl || 'N/A'),
      p.totalImages,
      p.missingAltCount,
      p.internalLinkCount,
      p.externalLinkCount,
      p.isHttps ? 'YES' : 'NO',
      p.isNoindex ? 'YES' : 'NO'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fwsc-seo-report-${job.hostname}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF5500] shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                {job.hostname}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Audit Completed
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <a
                href={job.finalUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FF5500] flex items-center gap-1 font-mono"
              >
                <span>{job.finalUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>&bull;</span>
              <span>Crawled {job.pages.length} pages</span>
              <span>&bull;</span>
              <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
              <span>&bull;</span>
              <div className="inline-flex items-center gap-1.5">
                <DigiVirusLogo size="sm" showSubtitle={false} />
                <span className="font-semibold text-neutral-600">By Lab of digiVirus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: PDF, CSV, Share, Re-Audit */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Link */}
          <button
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-all cursor-pointer shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>Download PDF</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-all cursor-pointer shadow-2xs"
          >
            <Table className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Download CSV</span>
          </button>

          {/* Re-Audit */}
          <button
            onClick={onReAudit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-Audit Site</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-neutral-200 print:hidden">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#FF5500] text-[#FF5500] bg-white rounded-t-xl'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-orange-100 text-[#FF5500]'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div>
        {activeTab === 'overview' && (
          <OverviewSection
            job={job}
            onNavigateTab={tabId => setActiveTab(tabId as any)}
          />
        )}
        {activeTab === 'issues' && <IssuesSection issues={job.issues} />}
        {activeTab === 'pages' && (
          <PagesSection
            pages={job.pages}
            onSelectPage={page => setSelectedPage(page)}
          />
        )}
        {activeTab === 'technical' && <TechnicalSection job={job} />}
        {activeTab === 'onpage' && <OnPageSection job={job} />}
        {activeTab === 'content' && <ContentSection job={job} />}
        {activeTab === 'links' && <LinksSection job={job} />}
      </div>

      {/* Page Inspection Drawer/Modal */}
      <PageDetailModal
        page={selectedPage}
        onClose={() => setSelectedPage(null)}
      />
    </div>
  );
};
