// Vercel Serverless Function entry point
import express from 'express';
import crypto from 'crypto';
import { validateTargetUrl } from '../server/security.js';
import { checkReachability, crawlSinglePage, checkRobotsTxt, checkSitemapXml } from '../server/crawler.js';
import { analyzeCrawlData } from '../server/analyzer.js';
import { jobStore } from '../server/jobStore.js';
import { AuditJob, AuditStartRequest } from '../src/types.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FWSC Crawler Engine', platform: 'Vercel Serverless' });
});

app.get('/api/audit/recent', (req, res) => {
  res.json({ success: true, sites: jobStore.getRecentSites() });
});

app.post('/api/audit/start', async (req, res) => {
  try {
    const { url, maxPages = 5 } = req.body as AuditStartRequest;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ success: false, errorType: 'INVALID_URL', message: 'Please provide a valid URL.' });
    }

    const requestedPages = Math.min(50, Math.max(1, Number(maxPages) || 5));
    const validation = await validateTargetUrl(url);
    if (!validation.isValid) {
      return res.status(200).json({
        success: false,
        errorType: validation.errorType || 'NXDOMAIN',
        message: validation.errorMessage || 'Website Not Found'
      });
    }

    const reachability = await checkReachability(validation.cleanUrl);
    reachability.resolvedIp = validation.ip;

    if (!reachability.isReachable) {
      return res.status(200).json({
        success: false,
        errorType: reachability.errorType,
        message: reachability.errorMessage || `Website unreachable (${reachability.statusText})`,
        reachability
      });
    }

    const jobId = crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finalUrlObj = new URL(reachability.finalUrl);

    const newJob: AuditJob = {
      id: jobId,
      targetUrl: validation.cleanUrl,
      inputUrl: url,
      finalUrl: reachability.finalUrl,
      hostname: finalUrlObj.hostname,
      maxPages: requestedPages,
      status: 'crawling',
      reachability,
      progress: {
        crawledPages: 0,
        targetPages: requestedPages,
        currentUrl: reachability.finalUrl,
        stage: 'Starting crawl'
      },
      pages: [],
      issues: [],
      scoreBreakdown: { overall: 0, technical: 0, onPage: 0, content: 0, links: 0 },
      stats: {
        totalCrawled: 0,
        avgResponseTimeMs: 0,
        totalImages: 0,
        totalMissingAlt: 0,
        totalInternalLinks: 0,
        totalExternalLinks: 0,
        criticalIssuesCount: 0,
        warningIssuesCount: 0,
        noticeIssuesCount: 0,
        passedChecksCount: 0
      },
      createdAt: Date.now()
    };

    jobStore.setJob(newJob);
    jobStore.initJobQueue(jobId, reachability.finalUrl);

    return res.json({
      success: true,
      jobId,
      finalUrl: reachability.finalUrl,
      hostname: finalUrlObj.hostname,
      reachability,
      maxPages: requestedPages
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, errorType: 'UNKNOWN', message: err.message || 'Serverless error' });
  }
});

app.post('/api/audit/batch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = jobStore.getJob(id);
    if (!job) {
      return res.status(404).json({ success: false, errorType: 'NOT_FOUND_404', message: 'Audit job not found or expired.' });
    }

    if (job.status === 'completed') {
      return res.json({ success: true, jobId: job.id, status: 'completed', isComplete: true, job });
    }

    const origin = new URL(job.finalUrl).origin;
    if (!job.robotsTxt) {
      try {
        const robots = await checkRobotsTxt(origin);
        job.robotsTxt = robots;
        const sitemap = await checkSitemapXml(origin, robots.sitemapsFound);
        job.sitemapXml = sitemap;
      } catch {}
    }

    const batchSize = 2;
    let crawledInThisBatch = 0;

    while (crawledInThisBatch < batchSize && job.pages.length < job.maxPages) {
      const nextUrl = jobStore.popNextFromQueue(job.id);
      if (!nextUrl) break;

      job.progress.currentUrl = nextUrl;
      const pageAudit = await crawlSinglePage(nextUrl, origin);
      job.pages.push(pageAudit);
      crawledInThisBatch++;

      if (pageAudit.status === 200 && pageAudit.internalLinks.length > 0) {
        const newInternalHrefs = pageAudit.internalLinks
          .map(l => l.href)
          .filter(h => !h.includes('#') && !h.includes('?'));
        jobStore.addUrlsToQueue(job.id, newInternalHrefs, job.maxPages);
      }
    }

    job.progress.crawledPages = job.pages.length;
    const queueData = jobStore.getJobQueue(job.id);
    const isQueueEmpty = !queueData || queueData.queue.length === 0;
    const hasReachedMax = job.pages.length >= job.maxPages;

    if (hasReachedMax || isQueueEmpty) {
      job.status = 'analyzing';
      const analysis = analyzeCrawlData(job.pages, job.robotsTxt, job.sitemapXml);
      job.issues = analysis.issues;
      job.scoreBreakdown = analysis.scoreBreakdown;
      job.stats = analysis.stats;
      job.status = 'completed';
      job.completedAt = Date.now();

      jobStore.addRecentSite({
        domain: job.hostname,
        url: job.finalUrl,
        score: job.scoreBreakdown.overall,
        crawledPages: job.pages.length,
        criticalIssues: job.stats.criticalIssuesCount,
        warningIssues: job.stats.warningIssuesCount,
        timestamp: Date.now()
      });

      return res.json({ success: true, jobId: job.id, status: 'completed', isComplete: true, job });
    }

    return res.json({
      success: true,
      jobId: job.id,
      status: 'crawling',
      isComplete: false,
      progress: job.progress,
      crawledCount: job.pages.length,
      targetCount: job.maxPages
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, errorType: 'UNKNOWN', message: err.message });
  }
});

app.get('/api/audit/status/:id', (req, res) => {
  const job = jobStore.getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, job });
});

export default app;
