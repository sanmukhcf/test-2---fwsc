import { AuditIssue, PageAudit, RobotsTxtAudit, ScoreBreakdown, SitemapXmlAudit } from '../src/types.js';

export function analyzeCrawlData(
  pages: PageAudit[],
  robotsTxt?: RobotsTxtAudit,
  sitemapXml?: SitemapXmlAudit
): {
  issues: AuditIssue[];
  scoreBreakdown: ScoreBreakdown;
  stats: {
    totalCrawled: number;
    avgResponseTimeMs: number;
    totalImages: number;
    totalMissingAlt: number;
    totalInternalLinks: number;
    totalExternalLinks: number;
    criticalIssuesCount: number;
    warningIssuesCount: number;
    noticeIssuesCount: number;
    passedChecksCount: number;
  };
} {
  const issues: AuditIssue[] = [];

  if (!pages || pages.length === 0) {
    return {
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
      }
    };
  }

  // Helper sets for duplicates
  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();

  let totalResponseTime = 0;
  let totalImages = 0;
  let totalMissingAlt = 0;
  let totalInternalLinks = 0;
  let totalExternalLinks = 0;

  // Track specific issues
  const non200Pages: { url: string; detail: string }[] = [];
  const nonHttpsPages: { url: string; detail: string }[] = [];
  const slowPages: { url: string; detail: string }[] = [];
  const missingTitlePages: { url: string; detail: string }[] = [];
  const shortTitlePages: { url: string; detail: string }[] = [];
  const longTitlePages: { url: string; detail: string }[] = [];
  const missingDescPages: { url: string; detail: string }[] = [];
  const shortDescPages: { url: string; detail: string }[] = [];
  const longDescPages: { url: string; detail: string }[] = [];
  const missingH1Pages: { url: string; detail: string }[] = [];
  const multipleH1Pages: { url: string; detail: string }[] = [];
  const missingCanonicalPages: { url: string; detail: string }[] = [];
  const missingViewportPages: { url: string; detail: string }[] = [];
  const noindexPages: { url: string; detail: string }[] = [];
  const thinContentPages: { url: string; detail: string }[] = [];
  const missingAltPages: { url: string; detail: string }[] = [];
  const uppercaseUrlPages: { url: string; detail: string }[] = [];
  const brokenLinksFound: { url: string; detail: string }[] = [];

  for (const page of pages) {
    totalResponseTime += page.responseTimeMs;
    totalImages += page.totalImages;
    totalMissingAlt += page.missingAltCount;
    totalInternalLinks += page.internalLinkCount;
    totalExternalLinks += page.externalLinkCount;

    // HTTP Status Check
    if (page.status >= 400) {
      non200Pages.push({ url: page.url, detail: `HTTP ${page.status}: ${page.statusText}` });
    }

    // HTTPS Check
    if (!page.isHttps) {
      nonHttpsPages.push({ url: page.url, detail: 'Served over insecure HTTP protocol' });
    }

    // Response time check (> 1500ms is slow, > 3000ms is very slow)
    if (page.responseTimeMs > 2000) {
      slowPages.push({ url: page.url, detail: `Response time: ${page.responseTimeMs}ms` });
    }

    // Title Checks
    if (!page.title || page.title.trim().length === 0) {
      missingTitlePages.push({ url: page.url, detail: 'No <title> tag found on page' });
    } else {
      const len = page.title.trim().length;
      if (len < 30) {
        shortTitlePages.push({ url: page.url, detail: `Title is only ${len} chars: "${page.title}"` });
      } else if (len > 60) {
        longTitlePages.push({ url: page.url, detail: `Title is ${len} chars (recommended < 60): "${page.title.slice(0, 45)}..."` });
      }

      const cleanTitle = page.title.trim().toLowerCase();
      const existing = titleMap.get(cleanTitle) || [];
      existing.push(page.url);
      titleMap.set(cleanTitle, existing);
    }

    // Meta Description Checks
    if (!page.description || page.description.trim().length === 0) {
      missingDescPages.push({ url: page.url, detail: 'No meta description tag found' });
    } else {
      const len = page.description.trim().length;
      if (len < 70) {
        shortDescPages.push({ url: page.url, detail: `Meta description is short (${len} chars)` });
      } else if (len > 160) {
        longDescPages.push({ url: page.url, detail: `Meta description is long (${len} chars, max 160 recommended)` });
      }

      const cleanDesc = page.description.trim().toLowerCase();
      const existing = descMap.get(cleanDesc) || [];
      existing.push(page.url);
      descMap.set(cleanDesc, existing);
    }

    // Headings Checks
    if (page.h1Count === 0) {
      missingH1Pages.push({ url: page.url, detail: 'Missing primary <h1> heading tag' });
    } else if (page.h1Count > 1) {
      multipleH1Pages.push({ url: page.url, detail: `Found ${page.h1Count} <h1> tags on single page` });
    }

    // Canonical Tag Check
    if (!page.canonicalUrl) {
      missingCanonicalPages.push({ url: page.url, detail: 'No rel="canonical" link specified' });
    }

    // Viewport tag for mobile
    if (!page.hasViewport) {
      missingViewportPages.push({ url: page.url, detail: 'Missing viewport meta tag for mobile responsiveness' });
    }

    // Noindex check
    if (page.isNoindex) {
      noindexPages.push({ url: page.url, detail: `Meta robots: "${page.metaRobots || page.xRobotsTag}"` });
    }

    // Thin content (< 200 words on non-error pages)
    if (page.status === 200 && page.wordCount < 200) {
      thinContentPages.push({ url: page.url, detail: `Only ${page.wordCount} words detected` });
    }

    // Image alt attributes
    if (page.missingAltCount > 0) {
      missingAltPages.push({
        url: page.url,
        detail: `${page.missingAltCount} out of ${page.totalImages} images missing alt text`
      });
    }

    // URL structure check (check for uppercase or spaces in path)
    try {
      const pUrl = new URL(page.url);
      if (/[A-Z]/.test(pUrl.pathname)) {
        uppercaseUrlPages.push({ url: page.url, detail: 'URL path contains uppercase characters' });
      }
    } catch {}

    // Check for internal links with broken status if tested
    for (const link of page.internalLinks) {
      if (link.status && link.status >= 400) {
        brokenLinksFound.push({
          url: page.url,
          detail: `Broken link to ${link.href} (HTTP ${link.status})`
        });
      }
    }
  }

  // Duplicate Titles
  const duplicateTitles: { url: string; detail: string }[] = [];
  for (const [title, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      for (const u of urls) {
        duplicateTitles.push({
          url: u,
          detail: `Duplicate title shared across ${urls.length} pages: "${title.slice(0, 40)}..."`
        });
      }
    }
  }

  // Duplicate Descriptions
  const duplicateDescs: { url: string; detail: string }[] = [];
  for (const [desc, urls] of descMap.entries()) {
    if (urls.length > 1) {
      for (const u of urls) {
        duplicateDescs.push({
          url: u,
          detail: `Duplicate description shared across ${urls.length} pages`
        });
      }
    }
  }

  // BUILD ISSUES LIST

  // 1. CRITICAL ISSUES
  if (non200Pages.length > 0) {
    issues.push({
      id: 'crit-http-status',
      category: 'critical',
      title: 'Broken Pages / HTTP Client or Server Errors',
      description: `${non200Pages.length} crawled page(s) returned an HTTP error code (4xx or 5xx). Search engines cannot index broken pages.`,
      recommendation: 'Fix or redirect broken URLs with 301 redirects to maintain crawl efficiency and preserve link equity.',
      impactedPages: non200Pages,
      impactScore: 12
    });
  }

  if (missingTitlePages.length > 0) {
    issues.push({
      id: 'crit-missing-titles',
      category: 'critical',
      title: 'Pages Missing Title Tag',
      description: `${missingTitlePages.length} page(s) completely lack a <title> tag. The title tag is one of the most critical on-page ranking signals.`,
      recommendation: 'Add a descriptive, unique title between 30 and 60 characters to every page.',
      impactedPages: missingTitlePages,
      impactScore: 10
    });
  }

  if (nonHttpsPages.length > 0) {
    issues.push({
      id: 'crit-insecure-http',
      category: 'critical',
      title: 'Insecure Pages (Missing HTTPS / SSL)',
      description: `${nonHttpsPages.length} page(s) are served over unencrypted HTTP. HTTPS is an essential Google ranking signal and browser security prerequisite.`,
      recommendation: 'Enforce HTTPS sitewide and configure 301 redirects from HTTP to HTTPS with HSTS enabled.',
      impactedPages: nonHttpsPages,
      impactScore: 10
    });
  }

  if (robotsTxt && robotsTxt.disallowAll) {
    issues.push({
      id: 'crit-robots-disallow-all',
      category: 'critical',
      title: 'Robots.txt Blocks Entire Site',
      description: 'Your robots.txt file contains "Disallow: /", which blocks search engine crawlers from indexing your website content.',
      recommendation: 'Update your robots.txt to permit indexing of public pages, reserving Disallow rules strictly for private admin routes.',
      impactedPages: [{ url: robotsTxt.url, detail: 'Disallow: / directive active' }],
      impactScore: 15
    });
  }

  if (missingViewportPages.length > 0) {
    issues.push({
      id: 'crit-missing-viewport',
      category: 'critical',
      title: 'Missing Mobile Viewport Tag',
      description: `${missingViewportPages.length} page(s) lack a <meta name="viewport"> tag. Google uses mobile-first indexing, and pages without a viewport fail mobile-friendliness.`,
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside the <head> tag.',
      impactedPages: missingViewportPages,
      impactScore: 8
    });
  }

  if (brokenLinksFound.length > 0) {
    issues.push({
      id: 'crit-broken-links',
      category: 'critical',
      title: 'Broken Internal Links Detected',
      description: `Discovered ${brokenLinksFound.length} internal links that lead to broken or inaccessible endpoints.`,
      recommendation: 'Update or remove broken internal links to prevent wasting crawler budget and frustrating visitors.',
      impactedPages: brokenLinksFound,
      impactScore: 8
    });
  }

  // 2. WARNING ISSUES
  if (missingH1Pages.length > 0) {
    issues.push({
      id: 'warn-missing-h1',
      category: 'warning',
      title: 'Pages Missing Primary H1 Heading',
      description: `${missingH1Pages.length} page(s) do not have an <h1> tag. The <h1> heading provides important topic context to search engines.`,
      recommendation: 'Include exactly one clear, topic-focused <h1> heading on every page.',
      impactedPages: missingH1Pages,
      impactScore: 5
    });
  }

  if (multipleH1Pages.length > 0) {
    issues.push({
      id: 'warn-multiple-h1',
      category: 'warning',
      title: 'Multiple H1 Headings on Single Page',
      description: `${multipleH1Pages.length} page(s) contain more than one <h1> heading. While HTML5 permits this, standard SEO best practices favor a single main H1.`,
      recommendation: 'Reserve <h1> for the primary page topic and use <h2> through <h6> for sub-sections.',
      impactedPages: multipleH1Pages,
      impactScore: 3
    });
  }

  if (missingDescPages.length > 0) {
    issues.push({
      id: 'warn-missing-desc',
      category: 'warning',
      title: 'Pages Missing Meta Description',
      description: `${missingDescPages.length} page(s) do not provide a meta description. Search engines will generate snippets from random body text.`,
      recommendation: 'Add a compelling meta description between 70 and 160 characters to optimize click-through rates from search results.',
      impactedPages: missingDescPages,
      impactScore: 5
    });
  }

  if (duplicateTitles.length > 0) {
    issues.push({
      id: 'warn-duplicate-titles',
      category: 'warning',
      title: 'Duplicate Title Tags Found',
      description: `${duplicateTitles.length} page(s) share identical title tags. Duplicate titles cause keyword cannibalization and reduce search visibility.`,
      recommendation: 'Ensure each page has an entirely distinct and specific title tag.',
      impactedPages: duplicateTitles,
      impactScore: 5
    });
  }

  if (duplicateDescs.length > 0) {
    issues.push({
      id: 'warn-duplicate-descs',
      category: 'warning',
      title: 'Duplicate Meta Descriptions Found',
      description: `${duplicateDescs.length} page(s) share identical meta descriptions across different URLs.`,
      recommendation: 'Write tailored meta descriptions reflecting the unique content of each page.',
      impactedPages: duplicateDescs,
      impactScore: 4
    });
  }

  if (missingAltPages.length > 0) {
    issues.push({
      id: 'warn-missing-alt',
      category: 'warning',
      title: 'Images Missing Alt Text Attributes',
      description: `${totalMissingAlt} image(s) across ${missingAltPages.length} page(s) lack descriptive alt text. Alt text is essential for image search ranking and web accessibility.`,
      recommendation: 'Add descriptive alt text to all informative images, and empty alt="" for decorative graphics.',
      impactedPages: missingAltPages,
      impactScore: 4
    });
  }

  if (missingCanonicalPages.length > 0) {
    issues.push({
      id: 'warn-missing-canonical',
      category: 'warning',
      title: 'Missing Rel=Canonical Tags',
      description: `${missingCanonicalPages.length} page(s) lack a canonical link tag. Canonicals protect against duplicate content penalties.`,
      recommendation: 'Add self-referencing rel="canonical" tags to indicate preferred URLs to search engines.',
      impactedPages: missingCanonicalPages,
      impactScore: 4
    });
  }

  if (robotsTxt && !robotsTxt.exists) {
    issues.push({
      id: 'warn-missing-robots',
      category: 'warning',
      title: 'Robots.txt File Not Found',
      description: 'Could not detect a robots.txt file at the domain root (/robots.txt).',
      recommendation: 'Create a robots.txt file to guide search crawlers and link to your XML sitemap.',
      impactedPages: [{ url: robotsTxt.url, detail: `HTTP ${robotsTxt.status}` }],
      impactScore: 3
    });
  }

  if (sitemapXml && !sitemapXml.exists) {
    issues.push({
      id: 'warn-missing-sitemap',
      category: 'warning',
      title: 'XML Sitemap Not Detected',
      description: 'Could not find a standard XML sitemap at /sitemap.xml or referenced in robots.txt.',
      recommendation: 'Generate a sitemap.xml listing all canonical URLs and submit it to Google Search Console.',
      impactedPages: [{ url: sitemapXml.url, detail: `HTTP ${sitemapXml.status}` }],
      impactScore: 4
    });
  }

  if (slowPages.length > 0) {
    issues.push({
      id: 'warn-slow-response',
      category: 'warning',
      title: 'Slow Server Response Time (> 2000ms)',
      description: `${slowPages.length} page(s) took over 2 seconds to respond. Server response time directly impacts Core Web Vitals (TTFB) and crawl speed.`,
      recommendation: 'Implement server caching, optimize database queries, or use a CDN (Cloudflare, Vercel Edge).',
      impactedPages: slowPages,
      impactScore: 4
    });
  }

  if (thinContentPages.length > 0) {
    issues.push({
      id: 'warn-thin-content',
      category: 'warning',
      title: 'Low Word Count / Thin Content',
      description: `${thinContentPages.length} page(s) contain fewer than 200 words. Search engines generally rank comprehensive, in-depth content higher.`,
      recommendation: 'Expand content with substantive, helpful answers that satisfy search user intent.',
      impactedPages: thinContentPages,
      impactScore: 3
    });
  }

  // 3. NOTICE ISSUES
  if (shortTitlePages.length > 0) {
    issues.push({
      id: 'notice-short-titles',
      category: 'notice',
      title: 'Title Tag is Too Short (< 30 characters)',
      description: `${shortTitlePages.length} page(s) have very brief title tags that may not fully utilize search result real estate.`,
      recommendation: 'Expand title to 30-60 characters incorporating primary keywords and brand name.',
      impactedPages: shortTitlePages,
      impactScore: 1
    });
  }

  if (longTitlePages.length > 0) {
    issues.push({
      id: 'notice-long-titles',
      category: 'notice',
      title: 'Title Tag is Too Long (> 60 characters)',
      description: `${longTitlePages.length} page(s) have title tags exceeding 60 characters, which may be truncated in search snippets.`,
      recommendation: 'Condense title to under 60 characters so it displays cleanly in SERPs.',
      impactedPages: longTitlePages,
      impactScore: 1
    });
  }

  if (shortDescPages.length > 0) {
    issues.push({
      id: 'notice-short-descs',
      category: 'notice',
      title: 'Meta Description is Brief (< 70 characters)',
      description: `${shortDescPages.length} page(s) have short meta descriptions.`,
      recommendation: 'Aim for 70 to 160 characters with clear call-to-actions.',
      impactedPages: shortDescPages,
      impactScore: 1
    });
  }

  if (longDescPages.length > 0) {
    issues.push({
      id: 'notice-long-descs',
      category: 'notice',
      title: 'Meta Description is Long (> 160 characters)',
      description: `${longDescPages.length} page(s) exceed 160 characters in their meta description.`,
      recommendation: 'Trim meta descriptions to 150-160 characters to avoid snippet truncation.',
      impactedPages: longDescPages,
      impactScore: 1
    });
  }

  if (uppercaseUrlPages.length > 0) {
    issues.push({
      id: 'notice-uppercase-urls',
      category: 'notice',
      title: 'Uppercase Characters in URL Path',
      description: `${uppercaseUrlPages.length} page(s) have uppercase characters in their URL structure. URLs are case-sensitive on Linux servers.`,
      recommendation: 'Enforce lowercase URLs sitewide with 301 redirects to avoid duplicate URL variations.',
      impactedPages: uppercaseUrlPages,
      impactScore: 1
    });
  }

  if (noindexPages.length > 0) {
    issues.push({
      id: 'notice-noindex-tags',
      category: 'notice',
      title: 'Pages Marked With "noindex" Directive',
      description: `${noindexPages.length} page(s) instruct search engines not to index their content. Confirm this is intentional.`,
      recommendation: 'Verify that public landing pages are not accidentally blocked from search results.',
      impactedPages: noindexPages,
      impactScore: 1
    });
  }

  // 4. PASSED CHECKS
  if (nonHttpsPages.length === 0) {
    issues.push({
      id: 'pass-https',
      category: 'passed',
      title: 'HTTPS & SSL Protocol Enforced',
      description: 'All crawled pages are securely delivered over HTTPS encryption.',
      recommendation: 'Maintain active SSL certificates and HSTS security headers.',
      impactedPages: pages.map(p => ({ url: p.url, detail: 'Secure HTTPS' }))
    });
  }

  if (non200Pages.length === 0) {
    issues.push({
      id: 'pass-http-status',
      category: 'passed',
      title: 'HTTP 200 OK Status on All Pages',
      description: 'All crawled pages returned clean 200 OK status codes with zero 4xx/5xx errors.',
      recommendation: 'Continue monitoring for broken links periodically.',
      impactedPages: pages.map(p => ({ url: p.url, detail: 'Status 200 OK' }))
    });
  }

  if (missingTitlePages.length === 0) {
    issues.push({
      id: 'pass-titles-present',
      category: 'passed',
      title: 'Title Tags Present on All Pages',
      description: 'Every crawled page contains a primary title tag.',
      recommendation: 'Ensure titles remain targeted and updated as content evolves.',
      impactedPages: pages.map(p => ({ url: p.url, detail: `Title: "${p.title.slice(0, 30)}..."` }))
    });
  }

  if (missingH1Pages.length === 0 && multipleH1Pages.length === 0) {
    issues.push({
      id: 'pass-h1-hierarchy',
      category: 'passed',
      title: 'Optimal H1 Heading Structure',
      description: 'Every crawled page has exactly one main <h1> heading tag.',
      recommendation: 'Maintain structured heading hierarchies (H1 -> H2 -> H3).',
      impactedPages: pages.map(p => ({ url: p.url, detail: `H1: "${p.h1List[0]?.slice(0, 30)}..."` }))
    });
  }

  if (robotsTxt && robotsTxt.exists && !robotsTxt.disallowAll) {
    issues.push({
      id: 'pass-robots-txt',
      category: 'passed',
      title: 'Valid Robots.txt Configuration',
      description: 'Robots.txt is active and allows search engines to crawl public pages.',
      recommendation: 'Review periodically to ensure new site sections are properly configured.',
      impactedPages: [{ url: robotsTxt.url, detail: 'robots.txt active' }]
    });
  }

  if (sitemapXml && sitemapXml.exists) {
    issues.push({
      id: 'pass-sitemap-xml',
      category: 'passed',
      title: 'XML Sitemap Available',
      description: `XML sitemap is accessible at ${sitemapXml.url}${sitemapXml.urlCount ? ` with ${sitemapXml.urlCount} URLs` : ''}.`,
      recommendation: 'Keep sitemap synchronized automatically as new content is published.',
      impactedPages: [{ url: sitemapXml.url, detail: 'Valid XML sitemap' }]
    });
  }

  if (missingViewportPages.length === 0) {
    issues.push({
      id: 'pass-viewport',
      category: 'passed',
      title: 'Mobile Viewport Configured',
      description: 'All crawled pages declare a responsive viewport for mobile devices.',
      recommendation: 'Ensure touch targets and responsive layouts remain verified.',
      impactedPages: pages.map(p => ({ url: p.url, detail: 'Viewport configured' }))
    });
  }

  if (missingAltPages.length === 0 && totalImages > 0) {
    issues.push({
      id: 'pass-image-alt',
      category: 'passed',
      title: 'Complete Image Alt Text Coverage',
      description: 'All detected images include descriptive alt text attributes.',
      recommendation: 'Continue adding alt text to any newly uploaded images.',
      impactedPages: pages.map(p => ({ url: p.url, detail: `${p.totalImages} images with alt text` }))
    });
  }

  // MATHEMATICAL SCORE CALCULATION
  // Category weights: Technical (30%), OnPage (30%), Content (20%), Links (20%)
  let techDeductions = 0;
  let onPageDeductions = 0;
  let contentDeductions = 0;
  let linksDeductions = 0;

  for (const issue of issues) {
    if (issue.category === 'passed') continue;

    const penalty = issue.category === 'critical' ? (issue.impactScore || 10) : issue.category === 'warning' ? (issue.impactScore || 5) : (issue.impactScore || 2);

    if (
      issue.id.includes('http') ||
      issue.id.includes('https') ||
      issue.id.includes('robots') ||
      issue.id.includes('sitemap') ||
      issue.id.includes('viewport') ||
      issue.id.includes('slow')
    ) {
      techDeductions += penalty;
    } else if (
      issue.id.includes('title') ||
      issue.id.includes('desc') ||
      issue.id.includes('h1') ||
      issue.id.includes('canonical') ||
      issue.id.includes('noindex')
    ) {
      onPageDeductions += penalty;
    } else if (
      issue.id.includes('content') ||
      issue.id.includes('alt')
    ) {
      contentDeductions += penalty;
    } else if (
      issue.id.includes('links') ||
      issue.id.includes('url')
    ) {
      linksDeductions += penalty;
    }
  }

  const technicalScore = Math.max(0, Math.min(100, Math.round(100 - techDeductions)));
  const onPageScore = Math.max(0, Math.min(100, Math.round(100 - onPageDeductions)));
  const contentScore = Math.max(0, Math.min(100, Math.round(100 - contentDeductions)));
  const linksScore = Math.max(0, Math.min(100, Math.round(100 - linksDeductions)));

  // Weighted overall score
  const overall = Math.max(0, Math.min(100, Math.round(
    technicalScore * 0.30 +
    onPageScore * 0.30 +
    contentScore * 0.20 +
    linksScore * 0.20
  )));

  const criticalIssuesCount = issues.filter(i => i.category === 'critical').length;
  const warningIssuesCount = issues.filter(i => i.category === 'warning').length;
  const noticeIssuesCount = issues.filter(i => i.category === 'notice').length;
  const passedChecksCount = issues.filter(i => i.category === 'passed').length;

  return {
    issues,
    scoreBreakdown: {
      overall,
      technical: technicalScore,
      onPage: onPageScore,
      content: contentScore,
      links: linksScore
    },
    stats: {
      totalCrawled: pages.length,
      avgResponseTimeMs: pages.length > 0 ? Math.round(totalResponseTime / pages.length) : 0,
      totalImages,
      totalMissingAlt,
      totalInternalLinks,
      totalExternalLinks,
      criticalIssuesCount,
      warningIssuesCount,
      noticeIssuesCount,
      passedChecksCount
    }
  };
}
