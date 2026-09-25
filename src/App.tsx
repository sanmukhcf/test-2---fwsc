import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { UrlInputBar } from './components/UrlInputBar';
import { RecentAudits } from './components/RecentAudits';
import { AuditProgress } from './components/AuditProgress';
import { AuditFailureView } from './components/AuditFailureView';
import { AuditDashboard } from './components/AuditDashboard';
import { SignupModal } from './components/SignupModal';
import { LoginModal } from './components/LoginModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { UserDashboard } from './components/UserDashboard';
import {
  AuditJob,
  AuditStatus,
  ReachabilityCheck,
  ReachabilityErrorType,
  RecentSite,
  UserProfile,
  UserAuditRecord
} from './types';
import { Zap, ShieldCheck, Activity, Cpu } from 'lucide-react';

const STORAGE_KEY_TOKEN = 'fwsc_auth_token';
const STORAGE_KEY_USER = 'fwsc_auth_user';

export default function App() {
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
    } catch {
      return null;
    }
  });

  // Navigation View: 'home' | 'dashboard' | 'audit_progress' | 'audit_report' | 'audit_failure'
  const [currentView, setCurrentView] = useState<
    'home' | 'dashboard' | 'audit_progress' | 'audit_report' | 'audit_failure'
  >('home');

  // Modals
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Queued audit URL (when guest clicks audit, they must sign up / log in first, then audit starts automatically)
  const [pendingAuditUrl, setPendingAuditUrl] = useState<string | null>(null);

  // Audit state
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('idle');
  const [activeJob, setActiveJob] = useState<AuditJob | null>(null);
  const [recentSites, setRecentSites] = useState<RecentSite[]>([]);
  const [targetUrl, setTargetUrl] = useState<string>('');

  const [progress, setProgress] = useState<{
    crawledPages: number;
    targetPages: number;
    currentUrl?: string;
    stageMessage?: string;
  }>({
    crawledPages: 0,
    targetPages: 10,
    currentUrl: '',
    stageMessage: 'Validating website...'
  });

  const [failureInfo, setFailureInfo] = useState<{
    url: string;
    errorType: ReachabilityErrorType;
    message: string;
    reachability?: ReachabilityCheck;
  } | null>(null);

  // Load recently audited validated sites
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

  // Verify auth session on load
  useEffect(() => {
    if (authToken) {
      fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then(res => res.text())
        .then(text => {
          try {
            const data = JSON.parse(text);
            if (data.success && data.user) {
              setUser(data.user);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
            } else {
              // Token invalid
              setUser(null);
              setAuthToken(null);
              localStorage.removeItem(STORAGE_KEY_TOKEN);
              localStorage.removeItem(STORAGE_KEY_USER);
            }
          } catch {}
        })
        .catch(() => {});
    }
  }, [authToken]);

  // Auth Handlers
  const handleAuthSuccess = (authUser: UserProfile, token: string) => {
    setUser(authUser);
    setAuthToken(token);
    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
    } catch {}

    setIsSignupOpen(false);
    setIsLoginOpen(false);
    setIsForgotPasswordOpen(false);

    // If an audit was queued before signing in/up, trigger it immediately
    if (pendingAuditUrl) {
      const queued = pendingAuditUrl;
      setPendingAuditUrl(null);
      executeAudit(queued, authUser.id, authUser.websiteName);
    } else {
      // Go to user dashboard
      setCurrentView('dashboard');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch {}
    }
    setUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {}
    setCurrentView('home');
    setAuditStatus('idle');
    setActiveJob(null);
    setFailureInfo(null);
  };

  // User initiates audit (Entry Flow)
  const handleRequestAudit = (urlToAudit: string) => {
    if (!user) {
      // Requirement 3: If not logged in -> show Signup -> create account -> automatically log in -> start requested audit
      setPendingAuditUrl(urlToAudit);
      setIsSignupOpen(true);
      return;
    }

    // Already logged in -> directly start the audit
    executeAudit(urlToAudit, user.id, user.websiteName);
  };

  // Real Crawler Execution Pipeline with 5 Distinct Audit States
  const executeAudit = async (urlToAudit: string, userId?: string, websiteName?: string) => {
    setTargetUrl(urlToAudit);
    setFailureInfo(null);
    setActiveJob(null);
    setCurrentView('audit_progress');

    // State 1: Validating Website
    setAuditStatus('validating_website');
    setProgress({
      crawledPages: 0,
      targetPages: 10,
      currentUrl: urlToAudit,
      stageMessage: 'Validating Website (Checking URL format & SSRF security)...'
    });

    try {
      // Step 1: Start audit job (verifies URL, DNS existence, reachability)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // State 2: Checking Domain
      setAuditStatus('checking_domain');
      setProgress(prev => ({
        ...prev,
        stageMessage: 'Checking Domain (Verifying DNS lookup & HTTP reachability)...'
      }));

      const startRes = await fetch('/api/audit/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: urlToAudit,
          userId,
          websiteName
        })
      });

      const startText = await startRes.text();
      let startData: any = {};
      try {
        startData = JSON.parse(startText);
      } catch {
        setAuditStatus('failed');
        setCurrentView('audit_failure');
        setFailureInfo({
          url: urlToAudit,
          errorType: 'UNKNOWN',
          message: 'Server returned an invalid non-JSON response during initialization.'
        });
        return;
      }

      if (!startData.success) {
        setAuditStatus('failed');
        setCurrentView('audit_failure');
        setFailureInfo({
          url: urlToAudit,
          errorType: startData.errorType || 'UNKNOWN',
          message: startData.message || 'Website verification failed.',
          reachability: startData.reachability
        });
        return;
      }

      const jobId = startData.jobId;

      // State 3: Crawling Web (Discovering internal pages with batch architecture)
      setAuditStatus('crawling_web');
      setProgress(prev => ({
        ...prev,
        stageMessage: `Domain verified (HTTP ${startData.reachability?.httpStatus || 200}). Discovering & crawling indexable pages...`
      }));

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
          setAuditStatus('failed');
          setCurrentView('audit_failure');
          setFailureInfo({
            url: urlToAudit,
            errorType: batchData.failureCode || 'UNKNOWN',
            message: batchData.failureReason || 'Crawl failed.'
          });
          return;
        }

        if (batchData.progress) {
          setProgress({
            crawledPages: batchData.progress.crawledPages || batchData.crawledCount || 0,
            targetPages: batchData.targetCount || 10,
            currentUrl: batchData.progress.currentUrl,
            stageMessage: batchData.progress.stage || 'Crawling site pages...'
          });
        }

        if (batchData.status === 'analyzing') {
          // State 4: Analyzing SEO
          setAuditStatus('analyzing_seo');
          setProgress(prev => ({
            ...prev,
            stageMessage: 'Analyzing SEO (Evaluating on-page, tech, content & links)...'
          }));
        }

        if (batchData.isComplete || batchData.status === 'completed') {
          // State 5: Saving Audit
          setAuditStatus('saving_audit');
          setProgress(prev => ({
            ...prev,
            stageMessage: 'Saving Audit (Archiving report to private history)...'
          }));

          await new Promise(r => setTimeout(r, 600));

          isComplete = true;
          setAuditStatus('completed');
          setActiveJob(batchData.job);
          setCurrentView('audit_report');
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
      setAuditStatus('failed');
      setCurrentView('audit_failure');
      setFailureInfo({
        url: urlToAudit,
        errorType: 'UNKNOWN',
        message: err.message || 'An unexpected error occurred while executing the crawler.'
      });
    }
  };

  const handleViewHistoricalReport = (record: UserAuditRecord) => {
    if (record.jobSnapshot) {
      setActiveJob(record.jobSnapshot);
      setCurrentView('audit_report');
    } else {
      // Re-run or fetch from server
      fetch(`/api/user/audits/${record.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then(r => r.text())
        .then(text => {
          try {
            const data = JSON.parse(text);
            if (data.success && data.audit?.jobSnapshot) {
              setActiveJob(data.audit.jobSnapshot);
              setCurrentView('audit_report');
            } else {
              // If snapshot missing, re-audit
              executeAudit(record.url, user?.id, user?.websiteName);
            }
          } catch {
            executeAudit(record.url, user?.id, user?.websiteName);
          }
        })
        .catch(() => {
          executeAudit(record.url, user?.id, user?.websiteName);
        });
    }
  };

  const handleResetToHome = () => {
    setCurrentView('home');
    setAuditStatus('idle');
    setActiveJob(null);
    setFailureInfo(null);
  };

  const isBusy =
    currentView === 'audit_progress' ||
    auditStatus === 'validating_website' ||
    auditStatus === 'checking_domain' ||
    auditStatus === 'crawling_web' ||
    auditStatus === 'analyzing_seo' ||
    auditStatus === 'saving_audit';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#111827] font-sans antialiased">
      {/* Global Header */}
      <Header
        user={user}
        currentView={currentView}
        onNavigate={view => {
          if (view === 'dashboard') {
            if (user) {
              setCurrentView('dashboard');
            } else {
              setIsLoginOpen(true);
            }
          } else {
            handleResetToHome();
          }
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenSignup={() => setIsSignupOpen(true)}
        onLogout={handleLogout}
        isAuditing={isBusy}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* VIEW 1: HOME LANDING PAGE */}
        {currentView === 'home' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-[#FF5500] uppercase tracking-wider">
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

            {/* Input Bar (No page limit UI - automatic page discovery) */}
            <UrlInputBar
              onStartAudit={handleRequestAudit}
              isLoading={isBusy}
              initialUrl={targetUrl}
            />

            {/* Value Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-6">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
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

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center mb-3">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">
                  Automatic Page Discovery
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  The crawler automatically discovers and audits internal indexable pages using safe serverless batches without hardcoded limits.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
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

            {/* Recently Audited Sites (Verified live domains only) */}
            <RecentAudits
              recentSites={recentSites}
              onSelectSite={url => handleRequestAudit(url)}
            />
          </div>
        )}

        {/* VIEW 2: USER DASHBOARD */}
        {currentView === 'dashboard' && user && authToken && (
          <UserDashboard
            user={user}
            authToken={authToken}
            onStartNewAudit={handleRequestAudit}
            onViewAuditReport={handleViewHistoricalReport}
            onLogout={handleLogout}
            isLoading={isBusy}
          />
        )}

        {/* VIEW 3: AUDIT PROGRESS (5 Distinct States) */}
        {currentView === 'audit_progress' && (
          <AuditProgress
            status={auditStatus}
            targetUrl={targetUrl}
            crawledPages={progress.crawledPages}
            targetPages={progress.targetPages}
            currentUrl={progress.currentUrl}
            stageMessage={progress.stageMessage}
          />
        )}

        {/* VIEW 4: AUDIT FAILURE VIEW */}
        {currentView === 'audit_failure' && failureInfo && (
          <AuditFailureView
            url={failureInfo.url}
            errorType={failureInfo.errorType}
            message={failureInfo.message}
            reachability={failureInfo.reachability}
            onTryAgain={handleResetToHome}
          />
        )}

        {/* VIEW 5: COMPLETED AUDIT DASHBOARD / REPORT */}
        {currentView === 'audit_report' && activeJob && (
          <AuditDashboard
            job={activeJob}
            onReAudit={() => handleRequestAudit(activeJob.targetUrl)}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Signup Modal */}
      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => {
          setIsSignupOpen(false);
          setPendingAuditUrl(null);
        }}
        onSwitchToLogin={() => {
          setIsSignupOpen(false);
          setIsLoginOpen(true);
        }}
        onSignupSuccess={handleAuthSuccess}
        initialWebsiteUrl={pendingAuditUrl || ''}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setPendingAuditUrl(null);
        }}
        onSwitchToSignup={() => {
          setIsLoginOpen(false);
          setIsSignupOpen(true);
        }}
        onOpenForgotPassword={() => {
          setIsLoginOpen(false);
          setIsForgotPasswordOpen(true);
        }}
        onLoginSuccess={handleAuthSuccess}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSwitchToLogin={() => {
          setIsForgotPasswordOpen(false);
          setIsLoginOpen(true);
        }}
      />
    </div>
  );
}
