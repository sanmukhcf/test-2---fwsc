import React from 'react';
import { AuditJob } from '../../types';
import {
  ShieldCheck,
  FileText,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  Server,
  ExternalLink
} from 'lucide-react';

interface TechnicalSectionProps {
  job: AuditJob;
}

export const TechnicalSection: React.FC<TechnicalSectionProps> = ({ job }) => {
  const isHttps = job.finalUrl.startsWith('https://');
  const robots = job.robotsTxt;
  const sitemap = job.sitemapXml;
  const pages = job.pages;

  const noindexPages = pages.filter(p => p.isNoindex);
  const missingCanonicalPages = pages.filter(p => !p.canonicalUrl);
  const missingViewportPages = pages.filter(p => !p.hasViewport);

  return (
    <div className="space-y-6">
      {/* Grid of Key Technical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HTTPS Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {isHttps ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Secure SSL
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                Insecure HTTP
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-neutral-900">HTTPS Encryption</h4>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            {isHttps
              ? 'Site is securely served over HTTPS protocol. All crawled pages use SSL/TLS encryption.'
              : 'Website is served over unencrypted HTTP. Search engines penalize insecure sites.'}
          </p>
        </div>

        {/* Robots.txt Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500] border border-orange-200">
              <FileText className="w-5 h-5" />
            </div>
            {robots?.exists ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Found (200 OK)
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Missing ({robots?.status || 404})
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-neutral-900">Robots.txt Directive</h4>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            {robots?.exists
              ? robots.disallowAll
                ? 'Robots.txt exists but Disallow: / blocks all search engines from indexing.'
                : 'Robots.txt exists and provides instructions for search crawlers.'
              : 'No robots.txt detected. Search engines will crawl without explicit instructions.'}
          </p>
        </div>

        {/* Sitemap.xml Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <MapPin className="w-5 h-5" />
            </div>
            {sitemap?.exists ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Detected
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Not Found
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-neutral-900">XML Sitemap</h4>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            {sitemap?.exists
              ? `XML sitemap found at ${sitemap.url}${sitemap.urlCount ? ` with ${sitemap.urlCount} URLs` : ''}.`
              : 'Could not detect an XML sitemap at /sitemap.xml or referenced in robots.txt.'}
          </p>
        </div>
      </div>

      {/* Robots.txt & Sitemap deep inspect boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Robots.txt Inspect */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF5500]" />
              Robots.txt Inspection
            </h4>
            {robots?.url && (
              <a
                href={robots.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#FF5500] hover:underline flex items-center gap-1 font-mono"
              >
                <span>/robots.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {robots?.exists && robots.contentSnippet ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500">{robots.rulesSummary}</p>
              <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {robots.contentSnippet}
              </pre>
            </div>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
              Robots.txt file was not accessible at the domain root.
            </div>
          )}
        </div>

        {/* Sitemap.xml Inspect */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FF5500]" />
              Sitemap.xml Inspection
            </h4>
            {sitemap?.url && (
              <a
                href={sitemap.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#FF5500] hover:underline flex items-center gap-1 font-mono"
              >
                <span>/sitemap.xml</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {sitemap?.exists && sitemap.urlsSample?.length ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 font-medium">
                Detected {sitemap.urlCount} URLs in sitemap index:
              </p>
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
                {sitemap.urlsSample.map((u, i) => (
                  <div key={i} className="truncate text-neutral-700">
                    &bull; {u}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
              No sitemap XML detected or referenced. Adding an XML sitemap speeds up crawler discovery.
            </div>
          )}
        </div>
      </div>

      {/* Indexability, Viewports, and Canonical Check Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-neutral-900">
          Indexability & Technical Signals
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-600">Noindex Directives</span>
              {noindexPages.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {noindexPages.length} pages
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {noindexPages.length > 0
                ? 'Blocked from search indexing by meta tag.'
                : 'All crawled pages permit search indexing.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-600">Rel=Canonical Tag</span>
              {missingCanonicalPages.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {pages.length - missingCanonicalPages.length} / {pages.length} configured
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {missingCanonicalPages.length > 0
                ? `${missingCanonicalPages.length} page(s) lack canonical URLs.`
                : 'All crawled pages have canonical links specified.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-600">Mobile Viewport</span>
              {missingViewportPages.length > 0 ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {pages.length - missingViewportPages.length} / {pages.length} configured
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {missingViewportPages.length > 0
                ? 'Missing viewport meta tags on some pages.'
                : 'Mobile-friendly viewport declared on all pages.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
