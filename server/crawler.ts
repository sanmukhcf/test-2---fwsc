import { parse } from 'node-html-parser';
import {
  ImageAudit,
  LinkAudit,
  PageAudit,
  ReachabilityCheck,
  RedirectHop,
  RobotsTxtAudit,
  SitemapXmlAudit
} from '../src/types.js';
import { isPrivateOrReservedIp } from './security.js';

const USER_AGENT =
  'Mozilla/5.0 (compatible; FWSC-Bot/1.0; +https://digivirus.in; digiVirus SEO Audit Engine)';

export async function checkReachability(initialUrl: string): Promise<ReachabilityCheck> {
  const redirectChain: RedirectHop[] = [];
  let currentUrl = initialUrl;
  const maxRedirects = 6;
  const startTime = Date.now();

  for (let i = 0; i <= maxRedirects; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        redirect: 'manual',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const status = response.status;
      const statusText = response.statusText;

      // Handle redirects: 301, 302, 303, 307, 308
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.get('location');
        redirectChain.push({
          url: currentUrl,
          status,
          location: location || undefined
        });

        if (!location) {
          return {
            isReachable: false,
            httpStatus: status,
            statusText: `Redirect without Location header`,
            responseTimeMs: Date.now() - startTime,
            redirectChain,
            finalUrl: currentUrl,
            errorType: 'UNKNOWN',
            errorMessage: 'Server sent a redirect code without a destination Location header.'
          };
        }

        const nextUrl = new URL(location, currentUrl).toString();

        // Check if redirected to private IP
        try {
          const parsedNext = new URL(nextUrl);
          if (isPrivateOrReservedIp(parsedNext.hostname)) {
            return {
              isReachable: false,
              httpStatus: status,
              statusText: 'Redirect to private host blocked',
              responseTimeMs: Date.now() - startTime,
              redirectChain,
              finalUrl: nextUrl,
              errorType: 'PRIVATE_IP',
              errorMessage: 'Security violation: Redirect target resolves to a private network.'
            };
          }
        } catch {}

        currentUrl = nextUrl;
        continue;
      }

      const responseTimeMs = Date.now() - startTime;

      // 200 OK or 2xx
      if (status >= 200 && status < 300) {
        return {
          isReachable: true,
          httpStatus: status,
          statusText: statusText || 'OK',
          responseTimeMs,
          redirectChain,
          finalUrl: currentUrl,
          errorType: 'NONE'
        };
      }

      // 403 Forbidden
      if (status === 403) {
        return {
          isReachable: false,
          httpStatus: 403,
          statusText: 'Access Forbidden / Blocked',
          responseTimeMs,
          redirectChain,
          finalUrl: currentUrl,
          errorType: 'BLOCKED_403',
          errorMessage:
            'Website exists, but access was blocked (HTTP 403). The server or web application firewall (Cloudflare/WAF) rejected the crawler.'
        };
      }

      // 404 Not Found
      if (status === 404) {
        return {
          isReachable: false,
          httpStatus: 404,
          statusText: 'Page Not Found',
          responseTimeMs,
          redirectChain,
          finalUrl: currentUrl,
          errorType: 'NOT_FOUND_404',
          errorMessage:
            'Domain exists, but the requested page returned HTTP 404 Not Found. Please verify the URL path.'
        };
      }

      // 429 Too Many Requests
      if (status === 429) {
        return {
          isReachable: false,
          httpStatus: 429,
          statusText: 'Rate Limited',
          responseTimeMs,
          redirectChain,
          finalUrl: currentUrl,
          errorType: 'RATE_LIMITED_429',
          errorMessage:
            'Website exists, but the server is rate-limiting crawler requests (HTTP 429 Too Many Requests).'
        };
      }

      // 500, 502, 503, 504 Server Error
      if (status >= 500 && status <= 599) {
        return {
          isReachable: false,
          httpStatus: status,
          statusText: `Server Error (${status})`,
          responseTimeMs,
          redirectChain,
          finalUrl: currentUrl,
          errorType: 'SERVER_ERROR_5XX',
          errorMessage: `Website server returned error HTTP ${status} (${statusText || 'Internal Server Error'}). The target web server is experiencing issues.`
        };
      }

      // Other 4xx or unexpected code
      return {
        isReachable: false,
        httpStatus: status,
        statusText: statusText || `HTTP ${status}`,
        responseTimeMs,
        redirectChain,
        finalUrl: currentUrl,
        errorType: 'UNKNOWN',
        errorMessage: `Website returned status HTTP ${status} (${statusText}).`
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return {
        isReachable: false,
        httpStatus: isTimeout ? 408 : 0,
        statusText: isTimeout ? 'Request Timeout' : 'Connection Failed',
        responseTimeMs: Date.now() - startTime,
        redirectChain,
        finalUrl: currentUrl,
        errorType: isTimeout ? 'TIMEOUT' : 'CONNECTION_REFUSED',
        errorMessage: isTimeout
          ? 'Website could not be reached: Request timed out after 9 seconds.'
          : `Failed to connect to web server: ${err.message || 'Connection refused or reset'}.`
      };
    }
  }

  return {
    isReachable: false,
    httpStatus: 310,
    statusText: 'Too many redirects',
    responseTimeMs: Date.now() - startTime,
    redirectChain,
    finalUrl: currentUrl,
    errorType: 'UNKNOWN',
    errorMessage: 'Website generated too many redirect loops.'
  };
}

export async function crawlSinglePage(pageUrl: string, rootOrigin: string): Promise<PageAudit> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500);

  let status = 0;
  let statusText = '';
  let contentType = '';
  let contentLengthBytes = 0;
  let html = '';
  let finalUrl = pageUrl;
  let hasHsts = false;

  const urlObj = new URL(pageUrl);
  const isHttps = urlObj.protocol === 'https:';

  try {
    const res = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    status = res.status;
    statusText = res.statusText;
    contentType = res.headers.get('content-type') || '';
    hasHsts = !!res.headers.get('strict-transport-security');
    finalUrl = res.url || pageUrl;

    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      const buffer = await res.arrayBuffer();
      contentLengthBytes = buffer.byteLength;
      // Decode up to 2MB to keep memory lightweight
      const decoder = new TextDecoder('utf-8');
      html = decoder.decode(buffer.slice(0, 2 * 1024 * 1024));
    } else {
      const text = await res.text();
      contentLengthBytes = Buffer.byteLength(text, 'utf8');
      html = text;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    status = isTimeout ? 408 : 520;
    statusText = isTimeout ? 'Request Timeout' : 'Crawl Fetch Failed';
  }

  const responseTimeMs = Date.now() - startTime;
  const path = urlObj.pathname;

  // If non-200 or no HTML, return minimal page audit
  if (status !== 200 || !html) {
    return {
      url: finalUrl,
      path,
      status,
      statusText,
      responseTimeMs,
      contentType,
      contentLengthBytes,
      isHttps,
      title: '',
      titleLength: 0,
      titleStatus: 'missing',
      description: '',
      descriptionLength: 0,
      descriptionStatus: 'missing',
      h1List: [],
      h1Count: 0,
      h1Status: 'missing',
      h2List: [],
      h2Count: 0,
      canonicalUrl: null,
      canonicalStatus: 'missing',
      wordCount: 0,
      readingTimeMinutes: 0,
      textToHtmlRatio: 0,
      images: [],
      totalImages: 0,
      missingAltCount: 0,
      internalLinks: [],
      externalLinks: [],
      internalLinkCount: 0,
      externalLinkCount: 0,
      metaRobots: null,
      isNoindex: false,
      isNofollow: false,
      xRobotsTag: null,
      hasViewport: false,
      charset: null,
      hasHsts,
      hasFavicon: false,
      lang: null
    };
  }

  // Parse HTML
  const root = parse(html);

  // Title
  const titleEl = root.querySelector('title');
  const title = (titleEl?.text || '').trim().replace(/\s+/g, ' ');
  const titleLength = title.length;
  let titleStatus: 'good' | 'too_short' | 'too_long' | 'missing' = 'good';
  if (titleLength === 0) titleStatus = 'missing';
  else if (titleLength < 30) titleStatus = 'too_short';
  else if (titleLength > 60) titleStatus = 'too_long';

  // Description
  const descEl =
    root.querySelector('meta[name="description" i]') ||
    root.querySelector('meta[property="og:description" i]');
  const description = (descEl?.getAttribute('content') || '').trim().replace(/\s+/g, ' ');
  const descriptionLength = description.length;
  let descriptionStatus: 'good' | 'too_short' | 'too_long' | 'missing' = 'good';
  if (descriptionLength === 0) descriptionStatus = 'missing';
  else if (descriptionLength < 70) descriptionStatus = 'too_short';
  else if (descriptionLength > 160) descriptionStatus = 'too_long';

  // Headings
  const h1Els = root.querySelectorAll('h1');
  const h1List = h1Els.map(el => (el.text || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
  const h1Count = h1List.length;
  let h1Status: 'good' | 'missing' | 'multiple' = 'good';
  if (h1Count === 0) h1Status = 'missing';
  else if (h1Count > 1) h1Status = 'multiple';

  const h2Els = root.querySelectorAll('h2');
  const h2List = h2Els.map(el => (el.text || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 15);
  const h2Count = h2Els.length;

  // Canonical
  const canonicalEl = root.querySelector('link[rel="canonical" i]');
  const rawCanonical = canonicalEl?.getAttribute('href') || null;
  let canonicalUrl: string | null = null;
  let canonicalStatus: 'self' | 'different' | 'missing' = 'missing';

  if (rawCanonical) {
    try {
      canonicalUrl = new URL(rawCanonical, finalUrl).toString();
      const normFinal = finalUrl.replace(/\/$/, '').toLowerCase();
      const normCanon = canonicalUrl.replace(/\/$/, '').toLowerCase();
      canonicalStatus = normFinal === normCanon ? 'self' : 'different';
    } catch {
      canonicalUrl = rawCanonical;
      canonicalStatus = 'different';
    }
  }

  // Viewport
  const viewportEl = root.querySelector('meta[name="viewport" i]');
  const hasViewport = !!viewportEl;

  // Charset
  const charsetEl = root.querySelector('meta[charset]') || root.querySelector('meta[http-equiv="Content-Type" i]');
  const charset = charsetEl?.getAttribute('charset') || 'utf-8';

  // Meta Robots
  const robotsMetaEl = root.querySelector('meta[name="robots" i]');
  const metaRobots = robotsMetaEl?.getAttribute('content') || null;
  const isNoindex = metaRobots ? /noindex/i.test(metaRobots) : false;
  const isNofollow = metaRobots ? /nofollow/i.test(metaRobots) : false;

  // Favicon
  const faviconEl = root.querySelector('link[rel*="icon" i]');
  const hasFavicon = !!faviconEl;

  // Language
  const htmlEl = root.querySelector('html');
  const lang = htmlEl?.getAttribute('lang') || null;

  // OpenGraph / Twitter
  const ogTitle = root.querySelector('meta[property="og:title" i]')?.getAttribute('content') || undefined;
  const ogDescription = root.querySelector('meta[property="og:description" i]')?.getAttribute('content') || undefined;
  const ogImage = root.querySelector('meta[property="og:image" i]')?.getAttribute('content') || undefined;
  const twitterCard = root.querySelector('meta[name="twitter:card" i]')?.getAttribute('content') || undefined;

  // Body content word count & text ratio
  // Clone root or clean body tags
  const bodyEl = root.querySelector('body');
  let bodyText = '';
  if (bodyEl) {
    // Remove scripts, styles, svg
    const scripts = bodyEl.querySelectorAll('script, style, noscript, svg');
    scripts.forEach(s => s.remove());
    bodyText = bodyEl.text.replace(/\s+/g, ' ').trim();
  }

  const words = bodyText.split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const textToHtmlRatio = html.length > 0 ? Math.round((bodyText.length / html.length) * 100) : 0;

  // Images
  const imgEls = root.querySelectorAll('img');
  const images: ImageAudit[] = [];
  let missingAltCount = 0;

  for (const img of imgEls) {
    const src = img.getAttribute('src') || '';
    const alt = (img.getAttribute('alt') || '').trim();
    const hasAlt = img.hasAttribute('alt') && alt.length > 0;
    if (!hasAlt) missingAltCount++;

    let fullSrc = src;
    let isExternal = false;
    try {
      const u = new URL(src, finalUrl);
      fullSrc = u.toString();
      isExternal = u.origin !== rootOrigin;
    } catch {}

    if (src) {
      images.push({
        src: fullSrc,
        alt,
        hasAlt,
        isExternal
      });
    }
  }

  // Links
  const anchorEls = root.querySelectorAll('a[href]');
  const internalLinks: LinkAudit[] = [];
  const externalLinks: LinkAudit[] = [];
  const seenInternal = new Set<string>();

  for (const a of anchorEls) {
    const rawHref = a.getAttribute('href')?.trim() || '';
    if (
      !rawHref ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref === '#'
    ) {
      continue;
    }

    const text = (a.text || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const rel = a.getAttribute('rel') || undefined;
    const target = a.getAttribute('target') || undefined;

    try {
      const fullUrl = new URL(rawHref, finalUrl);
      if (fullUrl.protocol !== 'http:' && fullUrl.protocol !== 'https:') {
        continue;
      }

      const isSameHost = fullUrl.origin === rootOrigin;
      if (isSameHost) {
        // Internal link
        const cleanHref = fullUrl.toString();
        if (!seenInternal.has(cleanHref)) {
          seenInternal.add(cleanHref);
          internalLinks.push({
            href: cleanHref,
            text: text || '(No anchor text)',
            isInternal: true,
            isAnchor: rawHref.includes('#'),
            rel,
            target
          });
        }
      } else {
        // External link
        externalLinks.push({
          href: fullUrl.toString(),
          text: text || '(No anchor text)',
          isInternal: false,
          isAnchor: false,
          rel,
          target
        });
      }
    } catch {}
  }

  return {
    url: finalUrl,
    path,
    status,
    statusText,
    responseTimeMs,
    contentType,
    contentLengthBytes,
    isHttps,
    title,
    titleLength,
    titleStatus,
    description,
    descriptionLength,
    descriptionStatus,
    h1List,
    h1Count,
    h1Status,
    h2List,
    h2Count,
    canonicalUrl,
    canonicalStatus,
    wordCount,
    readingTimeMinutes,
    textToHtmlRatio,
    images: images.slice(0, 30),
    totalImages: imgEls.length,
    missingAltCount,
    internalLinks: internalLinks.slice(0, 50),
    externalLinks: externalLinks.slice(0, 30),
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    metaRobots,
    isNoindex,
    isNofollow,
    xRobotsTag: null,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    hasViewport,
    charset,
    hasHsts,
    hasFavicon,
    lang
  };
}

export async function checkRobotsTxt(origin: string): Promise<RobotsTxtAudit> {
  const robotsUrl = `${origin}/robots.txt`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const text = await res.text();
      const lines = text.split('\n');
      const sitemaps: string[] = [];
      let disallowAll = false;
      let disallowCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^sitemap:\s*/i.test(trimmed)) {
          const sUrl = trimmed.replace(/^sitemap:\s*/i, '').trim();
          if (sUrl) sitemaps.push(sUrl);
        } else if (/^disallow:\s*\/\s*$/i.test(trimmed)) {
          disallowAll = true;
        } else if (/^disallow:/i.test(trimmed)) {
          disallowCount++;
        }
      }

      return {
        exists: true,
        status: 200,
        url: robotsUrl,
        contentSnippet: text.slice(0, 500),
        sitemapsFound: sitemaps,
        disallowAll,
        rulesSummary: `Found ${lines.length} lines, ${sitemaps.length} sitemaps declared, ${disallowCount} disallow rules.`
      };
    }

    return {
      exists: false,
      status: res.status,
      url: robotsUrl,
      contentSnippet: '',
      sitemapsFound: [],
      disallowAll: false,
      rulesSummary: `HTTP ${res.status} when requesting /robots.txt`
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      exists: false,
      status: 0,
      url: robotsUrl,
      contentSnippet: '',
      sitemapsFound: [],
      disallowAll: false,
      rulesSummary: `Could not fetch robots.txt: ${err.message || 'Timeout/Network error'}`
    };
  }
}

export async function checkSitemapXml(origin: string, declaredSitemaps: string[]): Promise<SitemapXmlAudit> {
  const candidateUrls: string[] = [];
  if (declaredSitemaps && declaredSitemaps.length > 0) {
    candidateUrls.push(...declaredSitemaps);
  }
  candidateUrls.push(`${origin}/sitemap.xml`);
  candidateUrls.push(`${origin}/sitemap_index.xml`);

  for (const sitemapUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(sitemapUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 200) {
        const text = await res.text();
        const isXml = text.includes('<?xml') || text.includes('<urlset') || text.includes('<sitemapindex');
        if (isXml) {
          // Extract URLs using regex to avoid heavy xml parsers
          const locMatches = text.match(/<loc>(.*?)<\/loc>/gi) || [];
          const urlsSample = locMatches
            .slice(0, 10)
            .map(m => m.replace(/<\/?loc>/gi, '').trim());

          return {
            exists: true,
            status: 200,
            url: sitemapUrl,
            urlCount: locMatches.length,
            urlsSample,
            isXml: true
          };
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }
  }

  return {
    exists: false,
    status: 404,
    url: `${origin}/sitemap.xml`,
    urlCount: 0,
    urlsSample: [],
    isXml: false
  };
}
