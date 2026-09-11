import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { UrlInputBar } from './components/UrlInputBar';
import { RecentAudits } from './components/RecentAudits';
import { AuditProgress } from './components/AuditProgress';
import { AuditFailureView } from './components/AuditFailureView';
import { AuditDashboard } from './components/AuditDashboard';
import { AuditJob, AuditStatus, ReachabilityCheck, ReachabilityErrorType, RecentSite } from './types';
import { Zap, ShieldCheck, Search, Activity, Cpu } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AuditStatus | 'idle'>('idle');
  const [activeJob, setActiveJob] = useState<AuditJob | null>(null);
  const [recentSites, setRecentSites] = useState<RecentSite[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [progress, setProgress] = useState<{
    crawledPages: number;
    targetPages: number;
    currentUrl?: string;
    stage?: string;
  }>({
    crawledPages: 0,
    targetPages: 5,
    currentUrl: '',
    stage: 'Initializing'
  });

  const [failureInfo, setFailureInfo] = useState<{
    url: string;
    errorType: ReachabilityErrorType;
    message: string;
    reachability?: ReachabilityCheck;
  } | null>(null);

  // Load recently checked and validated websites
  const loadRecentSites = async () => {
    try {
      const res = await fetch('/api/audit/recent');
      if (!res.ok) return;
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && Array.isArray(data.sites)) {
          setRecentSites(data.sites);
        }
      } catch {}
    } catch {}
  };

  useEffect(() => {
    loadRecentSites();
  }, []);

  const handleStartAudit = async (targetUrl: string, maxPages: number) => {
    setCurrentUrl(targetUrl);
    setFailureInfo(null);
    setActiveJob(null);
    setStatus('validating');
    setProgress({
      crawledPages: 0,
      targetPages: maxPages,
      currentUrl: targetUrl,
      stage: 'Validating domain and checking DNS records...'
    });

    try {
      // Step 1: Start audit job (verifies URL, DNS existence, and reachability)
      const startRes = await fetch('/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, maxPages })
      });

      const startText = await startRes.text();
      let startData: any = {};
      try {
        startData = JSON.parse(startText);
      } catch {
        setStatus('failed');
        setFailureInfo({
          url: targetUrl,
          errorType: 'UNKNOWN',
          message: 'Server returned an invalid non-JSON response during initialization.'
        });
        return;
      }

      if (!startData.success) {
        setStatus('failed');
        setFailureInfo({
          url: targetUrl,
          errorType: startData.errorType || 'UNKNOWN',
          message: startData.message || 'Audit initialization failed.',
          reachability: startData.reachability
        });
        return;
      }

      const jobId = startData.jobId;
      setStatus('crawling');
      setProgress(prev => ({
        ...prev,
        stage: `DNS & Reachability verified (HTTP ${startData.reachability?.httpStatus || 200}). Starting live crawler...`
      }));

      // Step 2: Batch Crawling loop (crawls small batches per request to ensure Vercel compatibility)
      let isComplete = false;
      let safetyCounter = 0;
      const maxBatches = 60;

      while (!isComplete && safetyCounter < maxBatches) {
        safetyCounter++;

        const batchRes = await fetch(`/api/audit/batch/${jobId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!batchRes.ok) {
          throw new Error(`Batch request failed with HTTP ${batchRes.status}`);
        }

        const batchText = await batchRes.text();
        let batchData: any = {};
        try {
          batchData = JSON.parse(batchText);
        } catch {
          throw new Error('Crawler received invalid batch response format.');
        }

        if (batchData.status === 'failed') {
          setStatus('failed');
          setFailureInfo({
            url: targetUrl,
            errorType: batchData.failureCode || 'UNKNOWN',
            message: batchData.failureReason || 'Crawl failed.'
          });
          return;
        }

        if (batchData.progress) {
          setProgress({
            crawledPages: batchData.progress.crawledPages || batchData.crawledCount || 0,
            targetPages: maxPages,
            currentUrl: batchData.progress.currentUrl,
            stage: batchData.progress.stage || 'Crawling site pages...'
          });
        }

        if (batchData.isComplete || batchData.status === 'completed') {
          isComplete = true;
          setStatus('completed');
          setActiveJob(batchData.job);
          await loadRecentSites();
          break;
        }

        // Brief delay between batches
        await new Promise(r => setTimeout(r, 200));
      }

      if (!isComplete) {
        throw new Error('Audit exceeded maximum batch limit.');
      }
    } catch (err: any) {
      console.error('Audit execution error:', err);
      setStatus('failed');
      setFailureInfo({
        url: targetUrl,
        errorType: 'UNKNOWN',
        message: err.message || 'An unexpected error occurred while executing the crawler.'
      });
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setActiveJob(null);
    setFailureInfo(null);
  };

  const isBusy = status === 'validating' || status === 'checking_reachability' || status === 'crawling' || status === 'analyzing';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#111827] font-sans antialiased">
      {/* Global Header */}
      <Header onNewAuditClick={handleReset} isAuditing={isBusy} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* State 1: IDLE / Initial Landing Bar */}
        {status === 'idle' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Hero Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#FF5500]" />
                Zero Mock Data &bull; Real Server-Side Crawler
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-[1.15]">
                Free Website SEO Checker
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                Audit any live website for technical SEO, on-page optimization, robots.txt, sitemaps, indexability, headings, meta tags, and internal link architecture.
              </p>
            </div>

            {/* Input Bar */}
            <UrlInputBar
              onStartAudit={handleStartAudit}
              isLoading={isBusy}
              initialUrl={currentUrl}
            />

            {/* Value Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-6">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">
                  Strict Domain & DNS Verification
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Real DNS lookup classifies live hosts, 301/302 redirects, and catches NXDOMAIN without fake scores or phantom audits.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center mb-3">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">
                  Batch Serverless Architecture
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Batched crawl execution ensures zero gateway timeouts on Vercel, Cloud Run, and container environments alike.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center mb-3">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">
                  In-House SEO Engine
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Engineered from scratch without third-party SEO APIs. Ground-truth HTML parsing directly from target web servers.
                </p>
              </div>
            </div>

            {/* Recently Audited Sites (Real sites only) */}
            <RecentAudits
              recentSites={recentSites}
              onSelectSite={url => handleStartAudit(url, 5)}
            />
          </div>
        )}

        {/* State 2: Progress (Validating, Checking, Crawling, Analyzing) */}
        {isBusy && (
          <AuditProgress
            status={status}
            targetUrl={currentUrl}
            crawledPages={progress.crawledPages}
            targetPages={progress.targetPages}
            currentUrl={progress.currentUrl}
            stageMessage={progress.stage}
          />
        )}

        {/* State 3: Failure View */}
        {status === 'failed' && failureInfo && (
          <AuditFailureView
            url={failureInfo.url}
            errorType={failureInfo.errorType}
            message={failureInfo.message}
            reachability={failureInfo.reachability}
            onTryAgain={handleReset}
          />
        )}

        {/* State 4: Completed Audit Report */}
        {status === 'completed' && activeJob && (
          <AuditDashboard
            job={activeJob}
            onReAudit={() => handleStartAudit(activeJob.targetUrl, activeJob.maxPages)}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
