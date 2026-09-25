import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { validateTargetUrl } from './server/security.js';
import { checkReachability, crawlSinglePage, checkRobotsTxt, checkSitemapXml } from './server/crawler.js';
import { analyzeCrawlData } from './server/analyzer.js';
import { jobStore } from './server/jobStore.js';
import { userStore } from './server/userStore.js';
import { AuditJob, AuditStartRequest } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Auth helper middleware
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  return userStore.getUserByToken(authHeader);
}

// ==========================================
// AUTHENTICATION & USER ENDPOINTS
// ==========================================

// POST /api/auth/signup
app.post('/api/auth/signup', (req, res) => {
  try {
    const {
      fullName,
      websiteName,
      websiteUrl,
      city,
      mobileNumber,
      email,
      profession,
      username,
      password
    } = req.body || {};

    if (!fullName || !websiteName || !websiteUrl || !city || !mobileNumber || !email || !profession || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required. Please fill in every detail.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const result = userStore.register({
      fullName,
      websiteName,
      websiteUrl,
      city,
      mobileNumber,
      email,
      profession,
      username,
      password
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to create account.'
      });
    }

    return res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during account creation.'
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body || {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const result = userStore.login(usernameOrEmail, password);
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.error || 'Invalid credentials.'
      });
    }

    return res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during login.'
    });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    userStore.logout(authHeader);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  const { usernameOrEmail } = req.body || {};
  if (!usernameOrEmail) {
    return res.status(400).json({ success: false, message: 'Please enter your username or registered email.' });
  }
  const result = userStore.forgotPassword(usernameOrEmail);
  return res.json(result);
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req, res) => {
  const { usernameOrEmail, newPassword } = req.body || {};
  if (!usernameOrEmail || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Valid username/email and new password (min 6 characters) required.' });
  }
  const result = userStore.resetPassword(usernameOrEmail, newPassword);
  return res.json(result);
});

// GET /api/user/profile
app.get('/api/user/profile', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  return res.json({ success: true, user });
});

// GET /api/user/audits - Returns private audit records for current user only
app.get('/api/user/audits', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  const audits = userStore.getUserAudits(user.id);
  return res.json({ success: true, audits });
});

// GET /api/user/audits/:recordId - Get single private audit record with full report snapshot
app.get('/api/user/audits/:recordId', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }
  const record = userStore.getUserAuditById(user.id, req.params.recordId);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Audit record not found.' });
  }
  return res.json({ success: true, audit: record });
});

// ==========================================
// CRAWLER & AUDIT ENGINE ENDPOINTS
// ==========================================

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FWSC Free Website SEO Checker',
    creator: 'By Lab of digiVirus',
    time: new Date().toISOString()
  });
});

// GET /api/audit/recent - Return recently audited validated websites
app.get('/api/audit/recent', (req, res) => {
  const recent = jobStore.getRecentSites();
  res.json({ success: true, sites: recent });
});

// POST /api/audit/start - Step 1: Validate, check DNS & Reachability, create Job
app.post('/api/audit/start', async (req, res) => {
  try {
    const { url, maxPages, userId, websiteName } = req.body as AuditStartRequest;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({
        success: false,
        errorType: 'INVALID_URL',
        message: 'Please provide a valid website URL.'
      });
    }

    // Identify user if token or userId is supplied
    const authUser = getAuthUser(req);
    const resolvedUserId = authUser?.id || (userId && typeof userId === 'string' ? userId : undefined);

    // Automatic safe crawl limit (internal safety control, user does not configure page limits)
    // Default to 12 pages auto-discovery limit, max safety cap 25 pages
    const requestedPages = maxPages && Number(maxPages) > 0 ? Math.min(25, Number(maxPages)) : 12;

    // Step 1: URL & Security & DNS Check
    const validation = await validateTargetUrl(url);
    if (!validation.isValid) {
      return res.status(200).json({
        success: false,
        errorType: validation.errorType || 'NXDOMAIN',
        message: validation.errorMessage || 'Website Not Found'
      });
    }

    // Step 2: HTTP/HTTPS Reachability Check & Redirects
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

    // Reachable! Initialize Job
    const jobId = crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finalUrlObj = new URL(reachability.finalUrl);

    const newJob: AuditJob = {
      id: jobId,
      userId: resolvedUserId,
      websiteName: websiteName || finalUrlObj.hostname,
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
    console.error('Audit start error:', err);
    return res.status(500).json({
      success: false,
      errorType: 'UNKNOWN',
      message: `Internal crawler error: ${err.message || 'Unknown error'}`
    });
  }
});

// POST /api/audit/batch/:id - Step 2: Crawl small batch (1-2 pages) per request to prevent serverless timeouts
app.post('/api/audit/batch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = jobStore.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        errorType: 'NOT_FOUND_404',
        message: 'Audit job not found or expired.'
      });
    }

    if (job.status === 'completed') {
      return res.json({
        success: true,
        jobId: job.id,
        status: 'completed',
        isComplete: true,
        job
      });
    }

    if (job.status === 'failed') {
      return res.json({
        success: false,
        jobId: job.id,
        status: 'failed',
        isComplete: true,
        failureReason: job.failureReason,
        failureCode: job.failureCode
      });
    }

    const origin = new URL(job.finalUrl).origin;

    // Check robots.txt and sitemap.xml on first batch if not yet checked
    if (!job.robotsTxt) {
      try {
        const robots = await checkRobotsTxt(origin);
        job.robotsTxt = robots;
        const sitemap = await checkSitemapXml(origin, robots.sitemapsFound);
        job.sitemapXml = sitemap;
      } catch (e) {
        console.warn('Robots/sitemap check warning:', e);
      }
    }

    // Crawl 1 to 2 URLs in this batch
    const batchSize = 2;
    let crawledInThisBatch = 0;

    while (
      crawledInThisBatch < batchSize &&
      job.pages.length < job.maxPages
    ) {
      const nextUrl = jobStore.popNextFromQueue(job.id);
      if (!nextUrl) break; // Discovered queue exhausted!

      job.progress.currentUrl = nextUrl;
      job.progress.stage = `Crawling: ${new URL(nextUrl).pathname || '/'}`;

      const pageAudit = await crawlSinglePage(nextUrl, origin);
      job.pages.push(pageAudit);
      crawledInThisBatch++;

      // Collect newly discovered internal links to crawl
      if (pageAudit.status === 200 && pageAudit.internalLinks.length > 0) {
        const newInternalHrefs = pageAudit.internalLinks
          .map(l => l.href)
          .filter(href => !href.includes('#') && !href.includes('?')); // Prioritize clean path links

        jobStore.addUrlsToQueue(job.id, newInternalHrefs, job.maxPages);
      }
    }

    job.progress.crawledPages = job.pages.length;

    // Check if crawl is finished
    const queueData = jobStore.getJobQueue(job.id);
    const isQueueEmpty = !queueData || queueData.queue.length === 0;
    const hasReachedMax = job.pages.length >= job.maxPages;

    if (hasReachedMax || isQueueEmpty || job.pages.length >= job.maxPages) {
      // Crawl finished! Run real SEO analysis
      job.status = 'analyzing';
      job.progress.stage = 'Computing SEO audit and analyzing checks...';

      const analysis = analyzeCrawlData(job.pages, job.robotsTxt, job.sitemapXml);
      job.issues = analysis.issues;
      job.scoreBreakdown = analysis.scoreBreakdown;
      job.stats = analysis.stats;
      job.status = 'completed';
      job.completedAt = Date.now();
      job.progress.stage = 'Audit completed';

      // Save to recent sites (only successful, validated domains with real crawl data)
      jobStore.addRecentSite({
        domain: job.hostname,
        url: job.finalUrl,
        score: job.scoreBreakdown.overall,
        crawledPages: job.pages.length,
        criticalIssues: job.stats.criticalIssuesCount,
        warningIssues: job.stats.warningIssuesCount,
        timestamp: Date.now()
      });

      // Save to user private audit history if user exists
      if (job.userId) {
        try {
          userStore.addUserAudit(job.userId, {
            jobId: job.id,
            websiteName: job.websiteName || job.hostname,
            url: job.finalUrl,
            domain: job.hostname,
            timestamp: Date.now(),
            status: 'completed',
            score: job.scoreBreakdown.overall,
            criticalIssues: job.stats.criticalIssuesCount,
            warningIssues: job.stats.warningIssuesCount,
            noticeIssues: job.stats.noticeIssuesCount,
            passedChecks: job.stats.passedChecksCount,
            pagesCrawled: job.pages.length,
            jobSnapshot: job
          });
        } catch (e) {
          console.warn('Could not auto-save audit to user history:', e);
        }
      }

      return res.json({
        success: true,
        jobId: job.id,
        status: 'completed',
        isComplete: true,
        progress: job.progress,
        job
      });
    }

    // Still in progress
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
    console.error('Batch crawl error:', err);
    return res.status(500).json({
      success: false,
      errorType: 'UNKNOWN',
      message: `Batch crawl encountered an error: ${err.message || 'Unknown error'}`
    });
  }
});

// GET /api/audit/status/:id - Step 3: Check job status or fetch complete report
app.get('/api/audit/status/:id', (req, res) => {
  const { id } = req.params;
  const job = jobStore.getJob(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      errorType: 'NOT_FOUND_404',
      message: 'Audit job not found or expired.'
    });
  }

  res.json({
    success: true,
    job
  });
});

async function startServer() {
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FWSC server running on http://0.0.0.0:${PORT} - By Lab of digiVirus`);
  });
}

startServer();
