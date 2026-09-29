import {
  AuditIssue,
  PageAudit,
  PageIssueItem,
  PageType,
  RobotsTxtAudit,
  ScoreBreakdown,
  SemanticCheck,
  SitemapXmlAudit,
  SiteContext
} from '../src/types.js';

export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'UNKNOWN';
export type CheckCategory = 'technical' | 'onPage' | 'content' | 'links' | 'performance';

export interface SeoCheck {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  maxPoints: number;
  earnedPoints: number;
  evidence: string;
  recommendation?: string;
  issueSeverity: 'critical' | 'warning' | 'notice' | 'passed';
  impactedPages: { url: string; detail?: string }[];
}

export interface DuplicatePair {
  url1: string;
  url2: string;
  similarity: number;
  severity: 'high' | 'moderate' | 'low';
}

/**
 * Computes Jaccard word set similarity between two text strings using 3-word shingles
 * to identify meaningful phrase duplication while avoiding single-word collisions.
 */
function computeShingleSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const words1 = text1
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  const words2 = text2
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (words1.length < 10 || words2.length < 10) return 0;

  // Build 2-word shingles for stable phrase matching
  const shingles1 = new Set<string>();
  for (let i = 0; i < words1.length - 1; i++) {
    shingles1.add(`${words1[i]}_${words1[i + 1]}`);
  }

  const shingles2 = new Set<string>();
  for (let i = 0; i < words2.length - 1; i++) {
    shingles2.add(`${words2[i]}_${words2[i + 1]}`);
  }

  if (shingles1.size === 0 || shingles2.size === 0) return 0;

  let intersection = 0;
  for (const s of shingles1) {
    if (shingles2.has(s)) intersection++;
  }

  const union = shingles1.size + shingles2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Step 1 of Analysis: Compare eligible crawled pages to detect internal duplicate/similar content
 * BEFORE calculating any page or site scores (Solves Problem 15 & Problem 16).
 */
export function detectInternalDuplicateContent(pages: PageAudit[]): DuplicatePair[] {
  const duplicatePairs: DuplicatePair[] = [];
  const eligiblePages = pages.filter(
    p => p.status >= 200 && p.status < 300 && (p.wordCount >= 40 || (p.normalizedContent?.length || 0) >= 120)
  );

  // Clear previous duplicate flags
  for (const p of pages) {
    p.isDuplicateContent = false;
    p.duplicateWithUrl = undefined;
    p.duplicateSimilarity = undefined;
  }

  for (let i = 0; i < eligiblePages.length; i++) {
    for (let j = i + 1; j < eligiblePages.length; j++) {
      const p1 = eligiblePages[i];
      const p2 = eligiblePages[j];

      // Use normalizedContent if available, falling back to bodySnippet
      const text1 = p1.normalizedContent || p1.bodySnippet || '';
      const text2 = p2.normalizedContent || p2.bodySnippet || '';

      const sim = computeShingleSimilarity(text1, text2);
      const similarityPercent = Math.round(sim * 100);

      // Severity bands for duplication (Problem 16)
      if (similarityPercent >= 50) {
        let severity: 'high' | 'moderate' | 'low' = 'low';
        if (similarityPercent >= 85) {
          severity = 'high';
        } else if (similarityPercent >= 70) {
          severity = 'moderate';
        }

        // Attach highest similarity found to pages
        if (!p1.duplicateSimilarity || similarityPercent > p1.duplicateSimilarity) {
          p1.isDuplicateContent = true;
          p1.duplicateWithUrl = p2.url;
          p1.duplicateSimilarity = similarityPercent;
        }

        if (!p2.duplicateSimilarity || similarityPercent > p2.duplicateSimilarity) {
          p2.isDuplicateContent = true;
          p2.duplicateWithUrl = p1.url;
          p2.duplicateSimilarity = similarityPercent;
        }

        duplicatePairs.push({
          url1: p1.url,
          url2: p2.url,
          similarity: similarityPercent,
          severity
        });
      }
    }
  }

  return duplicatePairs;
}

/**
 * Calculates page-level SEO Health Score and breakdown deterministically from evidence.
 *
 * Uses the authoritative 5-category 100-point model:
 * - Technical SEO = 25 max
 * - On-Page SEO = 30 max
 * - Content & Semantic Relevance = 25 max
 * - Internal Linking = 10 max
 * - Performance & UX = 10 max
 * TOTAL = 100 max
 */
export function calculateSinglePageScore(
  page: PageAudit,
  siteTopic?: string,
  isUniqueTitle?: boolean,
  isUniqueDesc?: boolean
): { score: number; breakdown: ScoreBreakdown; issues: PageIssueItem[] } {
  const issues: PageIssueItem[] = [];
  const pageType: PageType = page.pageType || 'other';

  // If page failed with HTTP error, award 0 on all categories
  if (page.status < 200 || page.status >= 400) {
    issues.push({
      category: 'critical',
      title: `HTTP ${page.status} Error`,
      evidence: `Server responded with HTTP ${page.status} (${page.statusText || 'Error'}).`,
      recommendation: 'Fix or redirect broken URLs with 301 redirects.'
    });

    const zeroBreakdown: ScoreBreakdown = {
      overall: 0,
      technical: 0,
      onPage: 0,
      content: 0,
      links: 0,
      performance: 0
    };
    return { score: 0, breakdown: zeroBreakdown, issues };
  }

  // ==========================================
  // 1. TECHNICAL SEO (25 Max Points)
  // ==========================================
  let techPoints = 0;

  // 1.1 HTTP Status Code (6 pts)
  if (page.status >= 200 && page.status < 300) {
    techPoints += 6.0;
    issues.push({
      category: 'passed',
      title: 'HTTP 200 OK Status',
      evidence: `Server responded with HTTP ${page.status} ${page.statusText || 'OK'}.`
    });
  } else if (page.status >= 300 && page.status < 400) {
    techPoints += 3.0;
    issues.push({
      category: 'notice',
      title: `HTTP ${page.status} Redirect`,
      evidence: `Page redirected with HTTP ${page.status}.`
    });
  }

  // 1.2 HTTPS & SSL Protocol (5 pts)
  if (page.isHttps) {
    techPoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Secure HTTPS Protocol',
      evidence: 'Page is delivered securely over SSL/TLS encryption.'
    });
  } else {
    issues.push({
      category: 'critical',
      title: 'Insecure HTTP Connection',
      evidence: 'Page is served over unencrypted http:// protocol.',
      recommendation: 'Install an SSL certificate and redirect all HTTP traffic to HTTPS.'
    });
  }

  // 1.3 Canonical Tag (4 pts) - Problem 13: Severity bands
  if (page.canonicalUrl && page.canonicalStatus === 'self') {
    techPoints += 4.0;
    issues.push({
      category: 'passed',
      title: 'Self-Referencing Canonical URL',
      evidence: `Canonical tag specifies ${page.canonicalUrl}.`
    });
  } else if (page.canonicalUrl && page.canonicalStatus === 'different') {
    techPoints += 3.2;
    issues.push({
      category: 'notice',
      title: 'Cross-URL Canonical Tag',
      evidence: `Canonical points to alternate URL: ${page.canonicalUrl}.`
    });
  } else {
    // Missing canonical is a mild notice, not a major catastrophe
    techPoints += 2.0;
    issues.push({
      category: 'notice',
      title: 'Missing Canonical Tag',
      evidence: 'No <link rel="canonical"> tag was specified on this page.',
      recommendation: 'Add a self-referencing canonical tag to prevent duplicate URL parameters.'
    });
  }

  // 1.4 Mobile Responsive Viewport (4 pts) - Problem 14
  if (page.hasViewport) {
    techPoints += 4.0;
    issues.push({
      category: 'passed',
      title: 'Mobile Responsive Viewport Active',
      evidence: 'Mobile viewport meta tag is properly declared.'
    });
  } else {
    issues.push({
      category: 'warning',
      title: 'Missing Mobile Viewport Meta Tag',
      evidence: 'No <meta name="viewport"> tag found in HTML head.',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.'
    });
  }

  // 1.5 Structured Data / Schema.org (3 pts)
  if (page.schemaOrg?.hasSchema) {
    techPoints += 3.0;
    issues.push({
      category: 'passed',
      title: 'Structured Data Detected',
      evidence: `Schema.org types found: ${page.schemaOrg.types.join(', ')}.`
    });
  } else {
    techPoints += 1.5;
    issues.push({
      category: 'notice',
      title: 'No Structured Data (Schema.org)',
      evidence: 'No JSON-LD or Microdata schema detected on this page.',
      recommendation: 'Add Schema.org JSON-LD to qualify for Google rich search results.'
    });
  }

  // 1.6 Indexation Directives & Favicon (3 pts)
  let directivePoints = 3.0;
  if (page.isNoindex) {
    directivePoints = 0.5;
    issues.push({
      category: 'warning',
      title: 'Noindex Directive Active',
      evidence: 'Page contains "noindex" meta robots tag preventing search indexing.',
      recommendation: 'Remove noindex directive if this page is intended for public organic search.'
    });
  } else {
    issues.push({
      category: 'passed',
      title: 'Indexable by Search Engines',
      evidence: 'No blocking noindex robots directives found.'
    });
  }
  techPoints += directivePoints;
  techPoints = Math.max(0, Math.min(25, techPoints));

  // ==========================================
  // 2. ON-PAGE SEO (30 Max Points)
  // ==========================================
  let onPagePoints = 0;

  // 2.1 Title Tag Presence & Severity Bands (8 pts) - Problem 3 & Problem 7
  const title = (page.title || '').trim();
  const titleLen = page.titleLength || title.length;
  const isGenericTitle = /^(home|untitled|page|index|welcome|default)$/i.test(title);

  if (!title) {
    issues.push({
      category: 'critical',
      title: 'Missing Title Tag',
      evidence: 'No <title> tag found in HTML head.',
      recommendation: 'Add a unique, descriptive <title> tag between 30 and 65 characters.'
    });
  } else if (isGenericTitle) {
    onPagePoints += 1.5;
    issues.push({
      category: 'warning',
      title: 'Generic Placeholder Title',
      evidence: `Detected generic title: "${title}".`,
      recommendation: 'Replace generic title with specific keywords reflecting page content.'
    });
  } else if (titleLen >= 30 && titleLen <= 65) {
    onPagePoints += 8.0;
    issues.push({
      category: 'passed',
      title: 'Optimal Title Tag Length',
      evidence: `Title is ${titleLen} characters: "${title.slice(0, 50)}${title.length > 50 ? '...' : ''}".`
    });
  } else if (titleLen >= 20 && titleLen < 30) {
    onPagePoints += 5.5;
    issues.push({
      category: 'notice',
      title: 'Title Tag is Moderately Short',
      evidence: `Title is ${titleLen} characters (recommended: 30-65 chars): "${title}".`,
      recommendation: 'Expand title slightly to incorporate primary service or topic keywords.'
    });
  } else if (titleLen >= 66 && titleLen <= 75) {
    onPagePoints += 6.5;
    issues.push({
      category: 'notice',
      title: 'Title Tag is Slightly Long',
      evidence: `Title is ${titleLen} characters (recommended: 30-65 chars): "${title.slice(0, 55)}...".`,
      recommendation: 'Condense title slightly to prevent truncation in search result snippets.'
    });
  } else if (titleLen >= 76 && titleLen <= 90) {
    onPagePoints += 4.5;
    issues.push({
      category: 'warning',
      title: 'Title Tag is Long',
      evidence: `Title is ${titleLen} characters (> 75 chars): "${title.slice(0, 60)}...".`,
      recommendation: 'Trim title to under 65 characters so it displays cleanly in SERPs.'
    });
  } else if (titleLen > 90) {
    onPagePoints += 3.0;
    issues.push({
      category: 'warning',
      title: 'Title Tag is Excessively Long',
      evidence: `Title is ${titleLen} characters (> 90 chars).`,
      recommendation: 'Shorten title tag to 30-65 characters.'
    });
  } else {
    // 1 - 19 chars: critically short
    onPagePoints += 2.5;
    issues.push({
      category: 'warning',
      title: 'Title Tag is Very Short',
      evidence: `Title is only ${titleLen} characters: "${title}".`,
      recommendation: 'Expand title with relevant keywords describing the page topic.'
    });
  }

  // 2.2 Meta Description Presence & Severity Bands (7 pts) - Problem 3 & Problem 8
  const desc = (page.description || '').trim();
  const descLen = page.descriptionLength || desc.length;

  if (!desc) {
    issues.push({
      category: 'warning',
      title: 'Missing Meta Description',
      evidence: 'No <meta name="description"> tag was found in the HTML head.',
      recommendation: 'Add a compelling meta description between 70 and 165 characters.'
    });
  } else if (descLen >= 70 && descLen <= 165) {
    onPagePoints += 7.0;
    issues.push({
      category: 'passed',
      title: 'Optimal Meta Description Length',
      evidence: `Description is ${descLen} characters: "${desc.slice(0, 55)}...".`
    });
  } else if (descLen >= 50 && descLen < 70) {
    onPagePoints += 4.5;
    issues.push({
      category: 'notice',
      title: 'Meta Description is Moderately Short',
      evidence: `Description is ${descLen} characters (recommended: 70-165 chars).`,
      recommendation: 'Expand description to 70-165 characters with clear value proposition.'
    });
  } else if (descLen >= 166 && descLen <= 190) {
    // Problem 8: 166-char description is near optimal, not a failure!
    onPagePoints += 5.8;
    issues.push({
      category: 'notice',
      title: 'Meta Description is Slightly Long',
      evidence: `Description is ${descLen} characters (recommended: 70-165 chars).`,
      recommendation: 'Trim description slightly to keep preview text within search snippet limits.'
    });
  } else if (descLen > 190 && descLen <= 240) {
    onPagePoints += 4.0;
    issues.push({
      category: 'notice',
      title: 'Meta Description is Long',
      evidence: `Description is ${descLen} characters (> 190 chars).`,
      recommendation: 'Condense description to under 165 characters.'
    });
  } else if (descLen > 240) {
    onPagePoints += 2.5;
    issues.push({
      category: 'warning',
      title: 'Meta Description is Excessively Long',
      evidence: `Description is ${descLen} characters (> 240 chars).`,
      recommendation: 'Shorten description to 70-165 characters to prevent truncation.'
    });
  } else {
    // 1 - 49 chars: critically short
    onPagePoints += 2.0;
    issues.push({
      category: 'warning',
      title: 'Meta Description is Very Short',
      evidence: `Description is only ${descLen} characters.`,
      recommendation: 'Provide a complete summary between 70 and 165 characters.'
    });
  }

  // 2.3 Primary H1 Heading (6 pts) - Problem 9
  if (page.h1Count === 1) {
    onPagePoints += 6.0;
    issues.push({
      category: 'passed',
      title: 'Single Main H1 Tag',
      evidence: `Primary <h1> found: "${page.h1List[0]?.slice(0, 50)}".`
    });
  } else if (page.h1Count === 2) {
    // Problem 9: 2 H1 is a warning, not catastrophic!
    onPagePoints += 4.2;
    issues.push({
      category: 'warning',
      title: 'Multiple H1 Tags (2 found)',
      evidence: `Found 2 <h1> elements: "${page.h1List[0]?.slice(0, 30)}", "${page.h1List[1]?.slice(0, 30)}".`,
      recommendation: 'Consolidate multiple H1s into one primary <h1> and use <h2> for subsections.'
    });
  } else if (page.h1Count > 2) {
    onPagePoints += 2.5;
    issues.push({
      category: 'warning',
      title: `Multiple H1 Tags (${page.h1Count} found)`,
      evidence: `Found ${page.h1Count} <h1> elements on the page.`,
      recommendation: 'Consolidate multiple H1s into a single primary <h1>.'
    });
  } else {
    issues.push({
      category: 'critical',
      title: 'Missing H1 Heading Tag',
      evidence: 'No <h1> heading was found on this page.',
      recommendation: 'Add a single primary <h1> heading summarizing the page topic.'
    });
  }

  // 2.4 Subheadings (H2/H3) & Hierarchy (5 pts) - Problem 4 & Problem 10
  if (pageType === 'contact') {
    // Contact pages legitimately do not require deep H2 subheadings
    onPagePoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Heading Structure Appropriate for Contact Page',
      evidence: `Contact page has concise heading structure (${page.h2Count} H2 subheadings).`
    });
  } else if (page.h2Count > 0) {
    onPagePoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Subheadings (H2) Present',
      evidence: `Found ${page.h2Count} <h2> subheading(s) organizing page content.`
    });
  } else if (page.wordCount < 120) {
    // Short page with zero H2
    onPagePoints += 4.0;
  } else if (page.wordCount >= 250) {
    onPagePoints += 2.0;
    issues.push({
      category: 'warning',
      title: 'Missing H2 Subheadings on Substantive Content',
      evidence: `Page contains ${page.wordCount} words but lacks <h2> subheadings.`,
      recommendation: 'Add <h2> subheadings to divide in-depth content into readable sections.'
    });
  } else {
    onPagePoints += 3.0;
  }

  // 2.5 Title & Meta Uniqueness (4 pts)
  if (isUniqueTitle !== false && isUniqueDesc !== false) {
    onPagePoints += 4.0;
    issues.push({
      category: 'passed',
      title: 'Unique Title and Description',
      evidence: 'Page title and meta description are distinct from other pages.'
    });
  } else if (isUniqueTitle === false && isUniqueDesc === false) {
    onPagePoints += 0.5;
    issues.push({
      category: 'warning',
      title: 'Duplicate Title & Meta Description',
      evidence: 'Both title tag and meta description are shared with other pages on the site.',
      recommendation: 'Write unique title and meta description tags tailored to this specific page.'
    });
  } else {
    onPagePoints += 2.0;
    issues.push({
      category: 'warning',
      title: isUniqueTitle === false ? 'Duplicate Title Tag' : 'Duplicate Meta Description',
      evidence: isUniqueTitle === false ? 'Title tag is identical to another page.' : 'Meta description is identical to another page.',
      recommendation: 'Make title and meta description unique to this page.'
    });
  }

  onPagePoints = Math.max(0, Math.min(30, onPagePoints));

  // ==========================================
  // 3. CONTENT & SEMANTIC RELEVANCE (25 Max Points)
  // ==========================================
  let contentPoints = 0;

  // 3.1 Content Depth & Word Count by Page Type (8 pts) - Problem 4 & Problem 11
  const words = page.wordCount || 0;
  let wordOptimal = 180;
  let wordWarning = 90;
  let wordThin = 50;

  if (pageType === 'contact') {
    wordOptimal = 40;
    wordWarning = 25;
    wordThin = 15;
  } else if (pageType === 'blog') {
    wordOptimal = 350;
    wordWarning = 200;
    wordThin = 100;
  } else if (pageType === 'service' || pageType === 'product') {
    wordOptimal = 180;
    wordWarning = 100;
    wordThin = 50;
  } else if (pageType === 'homepage') {
    wordOptimal = 150;
    wordWarning = 80;
    wordThin = 40;
  }

  if (words >= wordOptimal) {
    contentPoints += 8.0;
    issues.push({
      category: 'passed',
      title: `Substantive Content Depth (${words} words)`,
      evidence: `Contains ${words.toLocaleString()} visible words (meets expected depth for ${pageType} page).`
    });
  } else if (words >= wordWarning) {
    contentPoints += 5.5;
    issues.push({
      category: 'notice',
      title: 'Moderate Content Volume',
      evidence: `Contains ${words} words (recommended: ${wordOptimal}+ words for ${pageType} page).`,
      recommendation: 'Expand content with helpful details answering search user questions.'
    });
  } else if (words >= wordThin) {
    contentPoints += 3.0;
    issues.push({
      category: 'warning',
      title: 'Low Content Volume',
      evidence: `Page has only ${words} words of visible text.`,
      recommendation: 'Provide more informative copy to avoid thin content penalties.'
    });
  } else {
    contentPoints += 1.0;
    issues.push({
      category: 'warning',
      title: 'Very Thin Content',
      evidence: `Page has only ${words} visible words.`,
      recommendation: 'Add substantive, helpful content tailored to the topic.'
    });
  }

  // 3.2 Image Accessibility & Alt Attribute (6 pts) - Problem 12
  if (page.totalImages === 0) {
    // Problem 12: Image presence is not expected, neutral full points
    contentPoints += 6.0;
    issues.push({
      category: 'passed',
      title: 'Image Alt Check',
      evidence: 'No images detected on this page.'
    });
  } else {
    // Count truly missing alt (where alt attribute is absent)
    const trulyMissingAlt = page.missingAltCount || 0;
    const validCount = page.totalImages - trulyMissingAlt;
    const validRatio = validCount / page.totalImages;

    if (trulyMissingAlt === 0) {
      contentPoints += 6.0;
      issues.push({
        category: 'passed',
        title: 'All Images Have Alt Attributes',
        evidence: `All ${page.totalImages} images declare alt attributes (including decorative tags).`
      });
    } else if (validRatio >= 0.8) {
      contentPoints += 4.5;
      issues.push({
        category: 'notice',
        title: 'Minority of Images Missing Alt Text',
        evidence: `${trulyMissingAlt} of ${page.totalImages} images lack an alt attribute.`,
        recommendation: 'Add descriptive alt text to informative images.'
      });
    } else if (validRatio >= 0.5) {
      contentPoints += 2.5;
      issues.push({
        category: 'warning',
        title: 'Many Images Missing Alt Text',
        evidence: `${trulyMissingAlt} of ${page.totalImages} images lack alt attributes.`,
        recommendation: 'Add alt attributes to images for accessibility and image search.'
      });
    } else {
      contentPoints += 1.0;
      issues.push({
        category: 'warning',
        title: 'Most Images Missing Alt Text',
        evidence: `${trulyMissingAlt} of ${page.totalImages} images lack alt attributes.`,
        recommendation: 'Add alt attributes to all informative images.'
      });
    }
  }

  // 3.3 Topical Alignment & Semantic Relevance (6 pts) - Problem 5 & Problem 6
  const semanticFindings = page.semanticFindings || [];
  const semanticFails = semanticFindings.filter(f => f.status === 'FAIL');
  const semanticWarns = semanticFindings.filter(f => f.status === 'WARNING');

  if (semanticFails.length > 0) {
    contentPoints += 2.0;
    issues.push({
      category: 'warning',
      title: 'Topical Relevance Issue',
      evidence: semanticFails[0].evidence || 'Mismatch between page headings and body terms.',
      recommendation: semanticFails[0].reason || 'Align page headings directly with body content.'
    });
  } else if (semanticWarns.length > 0) {
    contentPoints += 4.0;
    issues.push({
      category: 'notice',
      title: 'Topical Relevance Needs Improvement',
      evidence: semanticWarns[0].evidence || 'Heading and content terms could be better focused.',
      recommendation: semanticWarns[0].reason || 'Ensure primary keywords are reinforced in body copy.'
    });
  } else {
    contentPoints += 6.0;
    issues.push({
      category: 'passed',
      title: 'Topical Alignment & Semantic Coherence',
      evidence: 'Page title, primary heading, and body copy maintain strong thematic alignment.'
    });
  }

  // 3.4 Internal Content Originality (5 pts) - Problem 15 & Problem 16
  if (!page.isDuplicateContent) {
    contentPoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Unique Page Content',
      evidence: 'Page body copy is distinct with zero internal duplication detected.'
    });
  } else {
    const sim = page.duplicateSimilarity || 0;
    if (sim >= 85) {
      contentPoints += 0.5;
      issues.push({
        category: 'warning',
        title: `High Internal Content Duplication (${sim}% match)`,
        evidence: `Body copy has ${sim}% similarity with ${page.duplicateWithUrl}.`,
        recommendation: 'Differentiate content or consolidate overlapping pages with 301 redirects.'
      });
    } else if (sim >= 70) {
      contentPoints += 2.5;
      issues.push({
        category: 'warning',
        title: `Moderate Content Duplication (${sim}% match)`,
        evidence: `Shares ${sim}% similarity with ${page.duplicateWithUrl}.`,
        recommendation: 'Provide more unique details specific to this page topic.'
      });
    } else {
      contentPoints += 3.8;
      issues.push({
        category: 'notice',
        title: `Minor Content Similarity (${sim}% match)`,
        evidence: `Shares ${sim}% similarity with ${page.duplicateWithUrl}.`
      });
    }
  }

  contentPoints = Math.max(0, Math.min(25, contentPoints));

  // ==========================================
  // 4. INTERNAL LINKING (10 Max Points)
  // ==========================================
  let linksPoints = 0;

  // 4.1 Internal Link Connectivity (5 pts) - Problem 17
  const internalLinks = page.internalLinkCount || page.internalLinks?.length || 0;
  if (internalLinks >= 3) {
    linksPoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Healthy Internal Link Connectivity',
      evidence: `Contains ${internalLinks} internal links navigating to other pages on the website.`
    });
  } else if (internalLinks >= 1) {
    linksPoints += 3.5;
    issues.push({
      category: 'notice',
      title: 'Few Internal Links',
      evidence: `Contains ${internalLinks} internal link(s).`,
      recommendation: 'Add contextual links to related services, products, or contact pages.'
    });
  } else {
    linksPoints += 1.0;
    issues.push({
      category: 'warning',
      title: 'No Internal Links (Orphan Risk)',
      evidence: 'Page contains zero internal links to other pages on the site.',
      recommendation: 'Add internal navigation links to connect this page to the site architecture.'
    });
  }

  // 4.2 Broken Internal Links (3 pts)
  const brokenLinks = page.brokenInternalLinks || [];
  if (brokenLinks.length === 0) {
    linksPoints += 3.0;
    issues.push({
      category: 'passed',
      title: 'No Broken Internal Links',
      evidence: 'All tested internal link targets resolved successfully.'
    });
  } else if (brokenLinks.length === 1) {
    linksPoints += 1.5;
    issues.push({
      category: 'warning',
      title: 'Broken Internal Link Detected',
      evidence: `Found 1 broken internal link: ${brokenLinks[0]}.`,
      recommendation: 'Update or remove broken internal link destination.'
    });
  } else {
    issues.push({
      category: 'critical',
      title: `Multiple Broken Internal Links (${brokenLinks.length})`,
      evidence: `Broken links: ${brokenLinks.slice(0, 2).join(', ')}.`,
      recommendation: 'Fix or redirect broken internal link destinations.'
    });
  }

  // 4.3 Anchor Text Quality (2 pts)
  const genericAnchors = page.internalLinks?.filter(l => l.isGenericAnchor) || [];
  if (genericAnchors.length === 0) {
    linksPoints += 2.0;
    issues.push({
      category: 'passed',
      title: 'Descriptive Anchor Text',
      evidence: 'Internal links use descriptive keyword anchor text.'
    });
  } else {
    linksPoints += 1.0;
    issues.push({
      category: 'notice',
      title: 'Generic Anchor Text Phrases',
      evidence: `${genericAnchors.length} internal links use generic anchor text (e.g. "click here").`,
      recommendation: 'Use descriptive, keyword-rich anchor text instead of generic phrases.'
    });
  }

  linksPoints = Math.max(0, Math.min(10, linksPoints));

  // ==========================================
  // 5. PERFORMANCE & UX (10 Max Points)
  // ==========================================
  let perfPoints = 0;

  // 5.1 Response Time / TTFB (6 pts) - Problem 18
  const latency = page.responseTimeMs || 0;
  if (latency < 500) {
    perfPoints += 6.0;
    issues.push({
      category: 'passed',
      title: 'Fast Response Latency (< 500ms)',
      evidence: `Server responded in ${latency}ms.`
    });
  } else if (latency < 1000) {
    perfPoints += 5.0;
    issues.push({
      category: 'passed',
      title: 'Good Response Latency (< 1000ms)',
      evidence: `Server responded in ${latency}ms.`
    });
  } else if (latency < 2000) {
    perfPoints += 3.5;
    issues.push({
      category: 'notice',
      title: 'Moderate Response Latency (1-2s)',
      evidence: `Server responded in ${latency}ms (recommended < 1000ms).`,
      recommendation: 'Enable caching and optimize server response time.'
    });
  } else if (latency < 3500) {
    perfPoints += 2.0;
    issues.push({
      category: 'warning',
      title: 'Slow Server Response (2-3.5s)',
      evidence: `Server took ${latency}ms to respond.`,
      recommendation: 'Investigate server response bottlenecks and optimize database queries.'
    });
  } else {
    perfPoints += 0.5;
    issues.push({
      category: 'warning',
      title: 'Very Slow Server Response (> 3.5s)',
      evidence: `Server took ${latency}ms to respond.`,
      recommendation: 'Implement server caching, CDN, and backend optimizations.'
    });
  }

  // 5.2 Payload Size (2 pts)
  const sizeKb = Math.round((page.contentLengthBytes || 0) / 1024);
  if (sizeKb < 250) {
    perfPoints += 2.0;
    issues.push({
      category: 'passed',
      title: 'Efficient HTML Payload Size',
      evidence: `HTML document size is ${sizeKb}KB.`
    });
  } else if (sizeKb < 750) {
    perfPoints += 1.4;
    issues.push({
      category: 'notice',
      title: 'Moderate HTML Payload Size',
      evidence: `HTML document size is ${sizeKb}KB.`,
      recommendation: 'Minify HTML and remove unnecessary inline scripts.'
    });
  } else {
    perfPoints += 0.8;
    issues.push({
      category: 'warning',
      title: 'Large HTML Payload Size',
      evidence: `HTML document size is ${sizeKb}KB (> 750KB).`,
      recommendation: 'Minify HTML and defer large inline assets.'
    });
  }

  // 5.3 URL Cleanliness (2 pts)
  let isCleanUrl = true;
  try {
    const u = new URL(page.url);
    if (/[A-Z]/.test(u.pathname)) {
      isCleanUrl = false;
    }
  } catch {}

  if (isCleanUrl) {
    perfPoints += 2.0;
    issues.push({
      category: 'passed',
      title: 'Clean Lowercase URL Structure',
      evidence: 'URL uses standard lowercase characters with clean path slugs.'
    });
  } else {
    perfPoints += 1.0;
    issues.push({
      category: 'notice',
      title: 'Uppercase Characters in URL Path',
      evidence: `URL contains uppercase characters: "${page.path}".`,
      recommendation: 'Standardize URLs to lowercase and implement 301 redirects.'
    });
  }

  perfPoints = Math.max(0, Math.min(10, perfPoints));

  // Compute Total Page Score (Sum of 5 categories, max 100)
  const rawTotal = techPoints + onPagePoints + contentPoints + linksPoints + perfPoints;
  const pageScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  const breakdown: ScoreBreakdown = {
    overall: pageScore,
    technical: Math.round(techPoints),
    onPage: Math.round(onPagePoints),
    content: Math.round(contentPoints),
    links: Math.round(linksPoints),
    performance: Math.round(perfPoints)
  };

  return {
    score: pageScore,
    breakdown,
    issues
  };
}

/**
 * Authoritative evidence-based SEO Analysis and Scoring Engine.
 *
 * Weighting (Category Model):
 * - Technical SEO: 25 points
 * - On-Page SEO: 30 points
 * - Content & Semantic Relevance: 25 points
 * - Internal Linking: 10 points
 * - Performance & UX: 10 points
 * TOTAL: 100 points
 */
export function analyzeCrawlData(
  pages: PageAudit[],
  robotsTxt?: RobotsTxtAudit,
  sitemapXml?: SitemapXmlAudit,
  siteContext?: SiteContext
): {
  issues: AuditIssue[];
  scoreBreakdown: ScoreBreakdown;
  checks: SeoCheck[];
  stats: {
    totalCrawled: number;
    totalDiscovered: number;
    pagesAnalyzed: number;
    pagesFailed: number;
    pagesSkipped: number;
    totalChecks: number;
    totalPasses: number;
    totalWarnings: number;
    totalFailures: number;
    totalUnknowns: number;
    avgPageScore: number;
    avgResponseTimeMs: number;
    totalImages: number;
    totalMissingAlt: number;
    totalInternalLinks: number;
    totalExternalLinks: number;
    criticalIssuesCount: number;
    warningIssuesCount: number;
    noticeIssuesCount: number;
    passedChecksCount: number;
    duplicateContentPagesCount: number;
    schemaPagesCount: number;
  };
} {
  if (!pages || pages.length === 0) {
    return {
      issues: [],
      scoreBreakdown: { overall: 0, technical: 0, onPage: 0, content: 0, links: 0, performance: 0 },
      checks: [],
      stats: {
        totalCrawled: 0,
        totalDiscovered: 0,
        pagesAnalyzed: 0,
        pagesFailed: 0,
        pagesSkipped: 0,
        totalChecks: 0,
        totalPasses: 0,
        totalWarnings: 0,
        totalFailures: 0,
        totalUnknowns: 0,
        avgPageScore: 0,
        avgResponseTimeMs: 0,
        totalImages: 0,
        totalMissingAlt: 0,
        totalInternalLinks: 0,
        totalExternalLinks: 0,
        criticalIssuesCount: 0,
        warningIssuesCount: 0,
        noticeIssuesCount: 0,
        passedChecksCount: 0,
        duplicateContentPagesCount: 0,
        schemaPagesCount: 0
      }
    };
  }

  // ==========================================
  // STEP 1: DETECT DUPLICATE CONTENT FIRST (Problem 15 & Problem 16)
  // ==========================================
  const duplicatePairs = detectInternalDuplicateContent(pages);

  // Build title & description frequency maps to determine sitewide uniqueness
  const titleCountMap = new Map<string, number>();
  const descCountMap = new Map<string, number>();

  for (const page of pages) {
    const t = (page.title || '').trim().toLowerCase();
    if (t) {
      titleCountMap.set(t, (titleCountMap.get(t) || 0) + 1);
    }
    const d = (page.description || '').trim().toLowerCase();
    if (d) {
      descCountMap.set(d, (descCountMap.get(d) || 0) + 1);
    }
  }

  // ==========================================
  // STEP 2: CALCULATE INDIVIDUAL PAGE SCORES WITH EVIDENCE ATTACHED
  // ==========================================
  for (const page of pages) {
    const t = (page.title || '').trim().toLowerCase();
    const d = (page.description || '').trim().toLowerCase();
    const isUniqueTitle = t ? (titleCountMap.get(t) || 0) === 1 : true;
    const isUniqueDesc = d ? (descCountMap.get(d) || 0) === 1 : true;

    const pageResult = calculateSinglePageScore(
      page,
      siteContext?.businessTopic,
      isUniqueTitle,
      isUniqueDesc
    );

    page.pageScore = pageResult.score;
    page.pageScoreBreakdown = pageResult.breakdown;
    page.pageIssues = pageResult.issues;
  }

  // ==========================================
  // STEP 3: AGGREGATE EVIDENCE ACROSS ANALYZED PAGES
  // ==========================================
  let totalResponseTime = 0;
  let totalImages = 0;
  let totalMissingAlt = 0;
  let totalInternalLinks = 0;
  let totalExternalLinks = 0;
  let pagesAnalyzed = 0;
  let pagesFailed = 0;

  const non200Pages: { url: string; detail: string }[] = [];
  const nonHttpsPages: { url: string; detail: string }[] = [];
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
  const thinContentPages: { url: string; detail: string }[] = [];
  const missingAltPages: { url: string; detail: string }[] = [];
  const schemaPresentPages: { url: string; detail: string }[] = [];
  const brokenLinksFound: { url: string; detail: string }[] = [];
  const lowInternalLinkPages: { url: string; detail: string }[] = [];

  for (const page of pages) {
    totalResponseTime += page.responseTimeMs;
    totalImages += page.totalImages;
    totalMissingAlt += page.missingAltCount;
    totalInternalLinks += page.internalLinkCount;
    totalExternalLinks += page.externalLinkCount;

    if (page.status >= 200 && page.status < 300) {
      pagesAnalyzed++;
    } else {
      pagesFailed++;
      non200Pages.push({
        url: page.url,
        detail: `HTTP ${page.status} (${page.statusText || 'Error'})`
      });
    }

    if (!page.isHttps) {
      nonHttpsPages.push({ url: page.url, detail: 'Insecure http:// protocol' });
    }

    if (!page.title) {
      missingTitlePages.push({ url: page.url, detail: 'Missing title tag' });
    } else if (page.titleLength < 30) {
      shortTitlePages.push({ url: page.url, detail: `${page.titleLength} chars: "${page.title}"` });
    } else if (page.titleLength > 65) {
      longTitlePages.push({ url: page.url, detail: `${page.titleLength} chars: "${page.title.slice(0, 45)}..."` });
    }

    if (!page.description) {
      missingDescPages.push({ url: page.url, detail: 'Missing meta description' });
    } else if (page.descriptionLength < 70) {
      shortDescPages.push({ url: page.url, detail: `${page.descriptionLength} chars` });
    } else if (page.descriptionLength > 165) {
      longDescPages.push({ url: page.url, detail: `${page.descriptionLength} chars` });
    }

    if (page.h1Count === 0) {
      missingH1Pages.push({ url: page.url, detail: 'Zero <h1> tags found' });
    } else if (page.h1Count > 1) {
      multipleH1Pages.push({ url: page.url, detail: `${page.h1Count} <h1> tags found` });
    }

    if (!page.canonicalUrl) {
      missingCanonicalPages.push({ url: page.url, detail: 'No canonical URL tag' });
    }

    if (!page.hasViewport) {
      missingViewportPages.push({ url: page.url, detail: 'Missing viewport meta tag' });
    }

    // Page-type aware content threshold
    const pType = page.pageType || 'other';
    const minWords = pType === 'contact' ? 40 : pType === 'blog' ? 300 : pType === 'homepage' ? 120 : 150;
    if (page.status >= 200 && page.status < 300 && page.wordCount < minWords) {
      thinContentPages.push({
        url: page.url,
        detail: `${page.wordCount} words (minimum recommended: ${minWords}+ for ${pType} page)`
      });
    }

    if (page.missingAltCount > 0) {
      missingAltPages.push({
        url: page.url,
        detail: `${page.missingAltCount} of ${page.totalImages} images missing alt attribute`
      });
    }

    if (page.schemaOrg?.hasSchema) {
      schemaPresentPages.push({
        url: page.url,
        detail: `Schema types: ${page.schemaOrg.types.join(', ')}`
      });
    }

    if (page.brokenInternalLinks && page.brokenInternalLinks.length > 0) {
      for (const b of page.brokenInternalLinks) {
        brokenLinksFound.push({ url: page.url, detail: `Broken target: ${b}` });
      }
    }

    if (page.internalLinkCount < 2 && page.path !== '/' && page.path !== '') {
      lowInternalLinkPages.push({
        url: page.url,
        detail: `${page.internalLinkCount} internal link(s)`
      });
    }
  }

  // Duplicate titles and descriptions across pages
  const duplicateTitles: { url: string; detail: string }[] = [];
  for (const [titleStr, count] of titleCountMap.entries()) {
    if (count > 1) {
      const matchingPages = pages.filter(p => (p.title || '').trim().toLowerCase() === titleStr);
      for (const p of matchingPages) {
        duplicateTitles.push({
          url: p.url,
          detail: `Shared across ${count} pages: "${titleStr.slice(0, 45)}..."`
        });
      }
    }
  }

  const duplicateDescs: { url: string; detail: string }[] = [];
  for (const [descStr, count] of descCountMap.entries()) {
    if (count > 1) {
      const matchingPages = pages.filter(p => (p.description || '').trim().toLowerCase() === descStr);
      for (const p of matchingPages) {
        duplicateDescs.push({
          url: p.url,
          detail: `Shared across ${count} pages: "${descStr.slice(0, 40)}..."`
        });
      }
    }
  }

  // ==========================================
  // STEP 4: AUTHORITATIVE CHECKS & SCORING (100 TOTAL POINTS)
  // ==========================================
  const checks: SeoCheck[] = [];

  // ------------------------------------------
  // CATEGORY 1: TECHNICAL SEO (25 Max Points)
  // ------------------------------------------

  // Check 1.1: HTTP Status Codes & Error Rate (6.0 pts)
  const httpStatusRatio = pages.length > 0 ? (pages.length - non200Pages.length) / pages.length : 0;
  const httpEarned = Math.round(httpStatusRatio * 6.0 * 10) / 10;
  checks.push({
    id: 'tech-status-code',
    name: 'HTTP Status Codes & Error Rate',
    category: 'technical',
    status: non200Pages.length === 0 ? 'PASS' : non200Pages.length / pages.length > 0.3 ? 'FAIL' : 'WARNING',
    maxPoints: 6.0,
    earnedPoints: httpEarned,
    evidence: non200Pages.length === 0
      ? `All ${pages.length} crawled URLs returned HTTP 200 OK.`
      : `${non200Pages.length} of ${pages.length} URLs returned HTTP error responses (${non200Pages.map(p => p.detail).slice(0, 3).join(', ')}).`,
    recommendation: non200Pages.length > 0 ? 'Fix or redirect broken URLs with 301 redirects.' : undefined,
    issueSeverity: non200Pages.length === 0 ? 'passed' : non200Pages.length / pages.length > 0.3 ? 'critical' : 'warning',
    impactedPages: non200Pages.length > 0 ? non200Pages : pages.map(p => ({ url: p.url, detail: 'HTTP 200 OK' }))
  });

  // Check 1.2: HTTPS & SSL Protocol Security (5.0 pts)
  const httpsRatio = pages.length > 0 ? (pages.length - nonHttpsPages.length) / pages.length : 0;
  const httpsEarned = Math.round(httpsRatio * 5.0 * 10) / 10;
  checks.push({
    id: 'tech-https',
    name: 'HTTPS & SSL Protocol Security',
    category: 'technical',
    status: nonHttpsPages.length === 0 ? 'PASS' : nonHttpsPages.length === pages.length ? 'FAIL' : 'WARNING',
    maxPoints: 5.0,
    earnedPoints: httpsEarned,
    evidence: nonHttpsPages.length === 0
      ? `100% of crawled URLs (${pages.length}/${pages.length}) are delivered over secure HTTPS.`
      : `${nonHttpsPages.length} of ${pages.length} URLs are served over unencrypted HTTP.`,
    recommendation: nonHttpsPages.length > 0 ? 'Install an SSL certificate and redirect all HTTP traffic to HTTPS.' : undefined,
    issueSeverity: nonHttpsPages.length === 0 ? 'passed' : nonHttpsPages.length === pages.length ? 'critical' : 'warning',
    impactedPages: nonHttpsPages.length > 0 ? nonHttpsPages : pages.map(p => ({ url: p.url, detail: 'Secure HTTPS' }))
  });

  // Check 1.3: Canonical Tag Integrity (4.0 pts) - Problem 13: Severity bands
  const missingCanonicalRatio = pages.length > 0 ? missingCanonicalPages.length / pages.length : 0;
  let canonicalEarned = 4.0;
  let canonicalStatus: CheckStatus = 'PASS';
  let canonicalSeverity: 'passed' | 'notice' | 'warning' | 'critical' = 'passed';

  if (missingCanonicalRatio === 0) {
    canonicalEarned = 4.0;
    canonicalStatus = 'PASS';
    canonicalSeverity = 'passed';
  } else if (missingCanonicalRatio <= 0.3) {
    canonicalEarned = 3.2;
    canonicalStatus = 'WARNING';
    canonicalSeverity = 'notice';
  } else if (missingCanonicalRatio <= 0.7) {
    canonicalEarned = 2.4;
    canonicalStatus = 'WARNING';
    canonicalSeverity = 'notice';
  } else {
    canonicalEarned = 1.6;
    canonicalStatus = 'WARNING';
    canonicalSeverity = 'warning';
  }
  checks.push({
    id: 'tech-canonical',
    name: 'Canonical Tag Integrity',
    category: 'technical',
    status: canonicalStatus,
    maxPoints: 4.0,
    earnedPoints: canonicalEarned,
    evidence: missingCanonicalPages.length === 0
      ? `All ${pages.length} crawled pages declare canonical URLs.`
      : `${missingCanonicalPages.length} of ${pages.length} pages lack a <link rel="canonical"> tag.`,
    recommendation: missingCanonicalPages.length > 0 ? 'Implement self-referencing canonical tags on indexable pages.' : undefined,
    issueSeverity: canonicalSeverity,
    impactedPages: missingCanonicalPages.length > 0 ? missingCanonicalPages : pages.map(p => ({ url: p.url, detail: `Canonical: ${p.canonicalUrl}` }))
  });

  // Check 1.4: Mobile Responsive Viewport (4.0 pts) - Problem 14
  const viewportRatio = pages.length > 0 ? (pages.length - missingViewportPages.length) / pages.length : 0;
  const viewportEarned = Math.round(viewportRatio * 4.0 * 10) / 10;
  checks.push({
    id: 'tech-viewport',
    name: 'Mobile Responsive Viewport',
    category: 'technical',
    status: missingViewportPages.length === 0 ? 'PASS' : missingViewportPages.length === pages.length ? 'FAIL' : 'WARNING',
    maxPoints: 4.0,
    earnedPoints: viewportEarned,
    evidence: missingViewportPages.length === 0
      ? `All ${pages.length} pages declare mobile-responsive viewport meta tags.`
      : `${missingViewportPages.length} of ${pages.length} pages lack a mobile viewport meta tag.`,
    recommendation: missingViewportPages.length > 0 ? 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to document head.' : undefined,
    issueSeverity: missingViewportPages.length === 0 ? 'passed' : 'warning',
    impactedPages: missingViewportPages.length > 0 ? missingViewportPages : pages.map(p => ({ url: p.url, detail: 'Mobile viewport active' }))
  });

  // Check 1.5: Robots.txt Directives & Accessibility (3.0 pts)
  let robotsEarned = 3.0;
  let robotsStatus: CheckStatus = 'PASS';
  let robotsSeverity: 'passed' | 'warning' | 'critical' = 'passed';
  let robotsEvidence = `Robots.txt is active and allows search engine crawling.`;

  if (robotsTxt?.disallowAll) {
    robotsEarned = 0.0;
    robotsStatus = 'FAIL';
    robotsSeverity = 'critical';
    robotsEvidence = `Robots.txt contains "Disallow: /", blocking all search engines from indexing the site.`;
  } else if (robotsTxt && robotsTxt.exists) {
    robotsEarned = 3.0;
    robotsStatus = 'PASS';
    robotsSeverity = 'passed';
    robotsEvidence = `Robots.txt is active at ${robotsTxt.url} with ${robotsTxt.sitemapsFound.length} referenced sitemaps.`;
  } else {
    robotsEarned = 1.5;
    robotsStatus = 'WARNING';
    robotsSeverity = 'warning';
    robotsEvidence = `No robots.txt file found at /robots.txt (HTTP ${robotsTxt?.status || 404}).`;
  }
  checks.push({
    id: 'tech-robots',
    name: 'Robots.txt Directives & Accessibility',
    category: 'technical',
    status: robotsStatus,
    maxPoints: 3.0,
    earnedPoints: robotsEarned,
    evidence: robotsEvidence,
    recommendation: robotsStatus !== 'PASS' ? 'Configure a robots.txt file to guide search bots and declare XML sitemaps.' : undefined,
    issueSeverity: robotsSeverity,
    impactedPages: [{ url: robotsTxt?.url || '/robots.txt', detail: robotsEvidence }]
  });

  // Check 1.6: XML Sitemap Coverage (3.0 pts)
  let sitemapEarned = 3.0;
  let sitemapStatus: CheckStatus = 'PASS';
  let sitemapSeverity: 'passed' | 'warning' = 'passed';
  let sitemapEvidence = `XML sitemap found with URLs.`;

  if (sitemapXml && sitemapXml.exists) {
    sitemapEarned = 3.0;
    sitemapStatus = 'PASS';
    sitemapSeverity = 'passed';
    sitemapEvidence = `XML sitemap is accessible at ${sitemapXml.url} with ${sitemapXml.urlCount} listed URLs.`;
  } else {
    sitemapEarned = 1.5;
    sitemapStatus = 'WARNING';
    sitemapSeverity = 'warning';
    sitemapEvidence = `No XML sitemap found at /sitemap.xml or referenced in robots.txt (HTTP ${sitemapXml?.status || 404}).`;
  }
  checks.push({
    id: 'tech-sitemap',
    name: 'XML Sitemap Accessibility & URL Coverage',
    category: 'technical',
    status: sitemapStatus,
    maxPoints: 3.0,
    earnedPoints: sitemapEarned,
    evidence: sitemapEvidence,
    recommendation: sitemapStatus !== 'PASS' ? 'Create an XML sitemap and submit it to Google Search Console.' : undefined,
    issueSeverity: sitemapSeverity,
    impactedPages: [{ url: sitemapXml?.url || '/sitemap.xml', detail: sitemapEvidence }]
  });

  // ------------------------------------------
  // CATEGORY 2: ON-PAGE SEO (30 Max Points)
  // ------------------------------------------

  // Check 2.1: Title Tag Presence, Length & Quality (8.0 pts) - Problem 3 & Problem 7
  let titleEarnedSum = 0;
  for (const p of pages) {
    const t = (p.title || '').trim();
    const len = p.titleLength || t.length;
    const isGeneric = /^(home|untitled|page|index|welcome|default)$/i.test(t);
    if (!t) titleEarnedSum += 0;
    else if (isGeneric) titleEarnedSum += 1.5;
    else if (len >= 30 && len <= 65) titleEarnedSum += 8.0;
    else if (len >= 20 && len < 30) titleEarnedSum += 5.5;
    else if (len >= 66 && len <= 75) titleEarnedSum += 6.5;
    else if (len >= 76 && len <= 90) titleEarnedSum += 4.5;
    else if (len > 90) titleEarnedSum += 3.0;
    else titleEarnedSum += 2.5; // 1-19
  }
  const titleEarnedAvg = pages.length > 0 ? Math.round((titleEarnedSum / pages.length) * 10) / 10 : 0;
  const titleStatus: CheckStatus = missingTitlePages.length > 0 ? (missingTitlePages.length === pages.length ? 'FAIL' : 'WARNING') : (shortTitlePages.length + longTitlePages.length > 0 ? 'WARNING' : 'PASS');
  checks.push({
    id: 'onpage-title',
    name: 'Title Tag Presence & Length Optimization',
    category: 'onPage',
    status: titleStatus,
    maxPoints: 8.0,
    earnedPoints: titleEarnedAvg,
    evidence: missingTitlePages.length === 0
      ? `All ${pages.length} pages include title tags (${shortTitlePages.length} short, ${longTitlePages.length} long).`
      : `${missingTitlePages.length} of ${pages.length} pages completely lack a title tag.`,
    recommendation: missingTitlePages.length > 0 || shortTitlePages.length + longTitlePages.length > 0 ? 'Ensure all pages feature descriptive 30-65 character title tags.' : undefined,
    issueSeverity: missingTitlePages.length > 0 ? 'critical' : shortTitlePages.length + longTitlePages.length > 0 ? 'notice' : 'passed',
    impactedPages: missingTitlePages.length > 0 ? missingTitlePages : [...shortTitlePages, ...longTitlePages]
  });

  // Check 2.2: Meta Description Presence & Length (7.0 pts) - Problem 3 & Problem 8
  let descEarnedSum = 0;
  for (const p of pages) {
    const d = (p.description || '').trim();
    const len = p.descriptionLength || d.length;
    if (!d) descEarnedSum += 0;
    else if (len >= 70 && len <= 165) descEarnedSum += 7.0;
    else if (len >= 50 && len < 70) descEarnedSum += 4.5;
    else if (len >= 166 && len <= 190) descEarnedSum += 5.8; // Problem 8
    else if (len > 190 && len <= 240) descEarnedSum += 4.0;
    else if (len > 240) descEarnedSum += 2.5;
    else descEarnedSum += 2.0; // 1-49
  }
  const descEarnedAvg = pages.length > 0 ? Math.round((descEarnedSum / pages.length) * 10) / 10 : 0;
  const descStatus: CheckStatus = missingDescPages.length === 0 && shortDescPages.length === 0 && longDescPages.length === 0 ? 'PASS' : missingDescPages.length / pages.length > 0.4 ? 'FAIL' : 'WARNING';
  checks.push({
    id: 'onpage-meta-desc',
    name: 'Meta Description Presence & Length Optimization',
    category: 'onPage',
    status: descStatus,
    maxPoints: 7.0,
    earnedPoints: descEarnedAvg,
    evidence: missingDescPages.length === 0
      ? `All ${pages.length} pages declare meta descriptions (${shortDescPages.length} short, ${longDescPages.length} long).`
      : `${missingDescPages.length} of ${pages.length} pages are missing a meta description.`,
    recommendation: missingDescPages.length > 0 ? 'Add compelling meta descriptions between 70 and 165 characters to all pages.' : undefined,
    issueSeverity: missingDescPages.length / pages.length > 0.4 ? 'warning' : missingDescPages.length > 0 ? 'notice' : 'passed',
    impactedPages: missingDescPages.length > 0 ? missingDescPages : [...shortDescPages, ...longDescPages]
  });

  // Check 2.3: Primary H1 Heading Tag (6.0 pts) - Problem 9
  let h1EarnedSum = 0;
  for (const p of pages) {
    if (p.h1Count === 1) h1EarnedSum += 6.0;
    else if (p.h1Count === 2) h1EarnedSum += 4.2; // Problem 9: warning, not catastrophic
    else if (p.h1Count > 2) h1EarnedSum += 2.5;
    else h1EarnedSum += 0.0;
  }
  const h1EarnedAvg = pages.length > 0 ? Math.round((h1EarnedSum / pages.length) * 10) / 10 : 0;
  const h1Status: CheckStatus = missingH1Pages.length > 0 ? 'FAIL' : multipleH1Pages.length > 0 ? 'WARNING' : 'PASS';
  checks.push({
    id: 'onpage-h1',
    name: 'Primary H1 Heading Tag Structure',
    category: 'onPage',
    status: h1Status,
    maxPoints: 6.0,
    earnedPoints: h1EarnedAvg,
    evidence: missingH1Pages.length === 0 && multipleH1Pages.length === 0
      ? `Every crawled page contains exactly one main <h1> heading tag.`
      : missingH1Pages.length > 0
      ? `${missingH1Pages.length} of ${pages.length} pages have zero <h1> headings.`
      : `${multipleH1Pages.length} of ${pages.length} pages have multiple <h1> headings.`,
    recommendation: missingH1Pages.length > 0 ? 'Add a single primary <h1> heading to every page.' : multipleH1Pages.length > 0 ? 'Consolidate multiple H1s into one primary <h1> and use <h2> for subsections.' : undefined,
    issueSeverity: missingH1Pages.length > 0 ? 'critical' : multipleH1Pages.length > 0 ? 'warning' : 'passed',
    impactedPages: missingH1Pages.length > 0 ? missingH1Pages : multipleH1Pages.length > 0 ? multipleH1Pages : pages.map(p => ({ url: p.url, detail: `H1: "${p.h1List[0]?.slice(0, 40)}"` }))
  });

  // Check 2.4: Heading Hierarchy & Subheadings (H2/H3) (5.0 pts) - Problem 4 & Problem 10
  let h2EarnedSum = 0;
  for (const p of pages) {
    if (p.pageType === 'contact') h2EarnedSum += 5.0; // Problem 4
    else if (p.h2Count > 0) h2EarnedSum += 5.0;
    else if (p.wordCount < 120) h2EarnedSum += 4.0;
    else if (p.wordCount >= 250) h2EarnedSum += 2.0;
    else h2EarnedSum += 3.0;
  }
  const h2EarnedAvg = pages.length > 0 ? Math.round((h2EarnedSum / pages.length) * 10) / 10 : 0;
  const substantiveMissingH2 = pages.filter(p => p.pageType !== 'contact' && p.wordCount >= 250 && p.h2Count === 0);
  checks.push({
    id: 'onpage-heading-hierarchy',
    name: 'Heading Hierarchy & Subheadings (H2/H3)',
    category: 'onPage',
    status: substantiveMissingH2.length === 0 ? 'PASS' : 'WARNING',
    maxPoints: 5.0,
    earnedPoints: h2EarnedAvg,
    evidence: substantiveMissingH2.length === 0
      ? `Heading hierarchy is structured across pages with appropriate <h2> subheadings.`
      : `${substantiveMissingH2.length} substantive page(s) lack <h2> subheadings.`,
    recommendation: substantiveMissingH2.length > 0 ? 'Add <h2> subheadings to divide in-depth sections into readable topics.' : undefined,
    issueSeverity: substantiveMissingH2.length === 0 ? 'passed' : 'warning',
    impactedPages: substantiveMissingH2.length > 0 ? substantiveMissingH2.map(p => ({ url: p.url, detail: `${p.wordCount} words, 0 H2s` })) : pages.map(p => ({ url: p.url, detail: `${p.h2Count} H2 headings` }))
  });

  // Check 2.5: Sitewide Title & Meta Description Uniqueness (4.0 pts)
  const dupTotal = duplicateTitles.length + duplicateDescs.length;
  let uniqueEarned = 4.0;
  if (dupTotal > 0) {
    const penalty = Math.min(3.5, dupTotal * 0.4);
    uniqueEarned = Math.round((4.0 - penalty) * 10) / 10;
  }
  checks.push({
    id: 'onpage-uniqueness',
    name: 'Title & Meta Description Sitewide Uniqueness',
    category: 'onPage',
    status: dupTotal === 0 ? 'PASS' : 'WARNING',
    maxPoints: 4.0,
    earnedPoints: uniqueEarned,
    evidence: dupTotal === 0
      ? `All crawled page titles and meta descriptions are distinct.`
      : `Found ${duplicateTitles.length} shared titles and ${duplicateDescs.length} shared meta descriptions.`,
    recommendation: dupTotal > 0 ? 'Ensure each page has unique title and description tags tailored to its content.' : undefined,
    issueSeverity: dupTotal === 0 ? 'passed' : 'warning',
    impactedPages: dupTotal > 0 ? [...duplicateTitles, ...duplicateDescs] : pages.map(p => ({ url: p.url, detail: 'Unique title and description' }))
  });

  // ------------------------------------------
  // CATEGORY 3: CONTENT & SEMANTIC RELEVANCE (25 Max Points)
  // ------------------------------------------

  // Check 3.1: Content Depth & Substance by Page Type (8.0 pts) - Problem 4 & Problem 11
  let contentEarnedSum = 0;
  for (const p of pages) {
    const w = p.wordCount || 0;
    const pt = p.pageType || 'other';
    let opt = 180, warn = 90, thin = 50;
    if (pt === 'contact') { opt = 40; warn = 25; thin = 15; }
    else if (pt === 'blog') { opt = 350; warn = 200; thin = 100; }
    else if (pt === 'service' || pt === 'product') { opt = 180; warn = 100; thin = 50; }
    else if (pt === 'homepage') { opt = 150; warn = 80; thin = 40; }

    if (w >= opt) contentEarnedSum += 8.0;
    else if (w >= warn) contentEarnedSum += 5.5;
    else if (w >= thin) contentEarnedSum += 3.0;
    else contentEarnedSum += 1.0;
  }
  const contentEarnedAvg = pages.length > 0 ? Math.round((contentEarnedSum / pages.length) * 10) / 10 : 0;
  const thinRatio = pages.length > 0 ? thinContentPages.length / pages.length : 0;
  checks.push({
    id: 'content-substance',
    name: 'Content Depth & Substance by Page Type',
    category: 'content',
    status: thinContentPages.length === 0 ? 'PASS' : thinRatio > 0.4 ? 'FAIL' : 'WARNING',
    maxPoints: 8.0,
    earnedPoints: contentEarnedAvg,
    evidence: thinContentPages.length === 0
      ? `All ${pages.length} crawled pages meet content volume thresholds for their respective page types.`
      : `${thinContentPages.length} of ${pages.length} pages have thin content below expected depth.`,
    recommendation: thinContentPages.length > 0 ? 'Expand thin pages with comprehensive copy answering search intent.' : undefined,
    issueSeverity: thinContentPages.length === 0 ? 'passed' : thinRatio > 0.4 ? 'critical' : 'warning',
    impactedPages: thinContentPages.length > 0 ? thinContentPages : pages.map(p => ({ url: p.url, detail: `${p.wordCount} words (${p.pageType} page)` }))
  });

  // Check 3.2: Image Accessibility & Descriptive Alt Text (6.0 pts) - Problem 12
  let imgEarned = 6.0;
  let imgStatus: CheckStatus = 'PASS';
  let imgSeverity: 'passed' | 'notice' | 'warning' | 'critical' = 'passed';
  let imgEvidence = 'All images have alt attributes.';

  if (totalImages === 0) {
    imgEarned = 6.0;
    imgStatus = 'PASS';
    imgSeverity = 'passed';
    imgEvidence = 'No images detected on crawled pages (neutral accessibility evaluation).';
  } else {
    const validCount = totalImages - totalMissingAlt;
    const validRatio = validCount / totalImages;
    imgEarned = Math.round(validRatio * 6.0 * 10) / 10;

    if (totalMissingAlt === 0) {
      imgStatus = 'PASS';
      imgSeverity = 'passed';
      imgEvidence = `All ${totalImages} detected images declare alt attributes (100% valid coverage).`;
    } else if (validRatio >= 0.8) {
      imgStatus = 'WARNING';
      imgSeverity = 'notice';
      imgEvidence = `${totalMissingAlt} of ${totalImages} images lack an alt attribute (${Math.round((1 - validRatio) * 100)}% missing alt).`;
    } else {
      imgStatus = validRatio < 0.5 ? 'FAIL' : 'WARNING';
      imgSeverity = validRatio < 0.5 ? 'critical' : 'warning';
      imgEvidence = `${totalMissingAlt} of ${totalImages} images lack alt attributes.`;
    }
  }
  checks.push({
    id: 'content-image-alt',
    name: 'Image Accessibility & Alt Attribute Coverage',
    category: 'content',
    status: imgStatus,
    maxPoints: 6.0,
    earnedPoints: imgEarned,
    evidence: imgEvidence,
    recommendation: totalMissingAlt > 0 ? 'Add descriptive alt text to informative images for accessibility and image search.' : undefined,
    issueSeverity: imgSeverity,
    impactedPages: missingAltPages.length > 0 ? missingAltPages : pages.map(p => ({ url: p.url, detail: `${p.totalImages} images` }))
  });

  // Check 3.3: Topical Alignment & Semantic Relevance (6.0 pts) - Problem 5 & Problem 6
  const allSemanticFindings = pages.flatMap(p => p.semanticFindings || []);
  const semanticFails = allSemanticFindings.filter(f => f.status === 'FAIL');
  const semanticWarns = allSemanticFindings.filter(f => f.status === 'WARNING');
  const detectedTopic = siteContext?.businessTopic || 'UNKNOWN';

  let topicEarned = 6.0;
  let topicStatus: CheckStatus = 'PASS';
  let topicSeverity: 'passed' | 'warning' = 'passed';
  let topicEvidence = `Page content and headings demonstrate coherent alignment with detected topic: "${detectedTopic}".`;

  if (detectedTopic === 'UNKNOWN' && missingTitlePages.length === pages.length && missingH1Pages.length === pages.length) {
    topicEarned = 1.0;
    topicStatus = 'FAIL';
    topicSeverity = 'warning';
    topicEvidence = 'Cannot establish topic relevance because title tags and H1 headings are completely absent.';
  } else if (semanticFails.length > 0) {
    const penalty = Math.min(4.0, semanticFails.length * 1.5);
    topicEarned = Math.round((6.0 - penalty) * 10) / 10;
    topicStatus = 'WARNING';
    topicSeverity = 'warning';
    topicEvidence = `Topical relevance discrepancies found on ${semanticFails.length} check(s): ${semanticFails[0].evidence || semanticFails[0].reason}.`;
  } else if (semanticWarns.length > 0) {
    const penalty = Math.min(2.5, semanticWarns.length * 0.8);
    topicEarned = Math.round((6.0 - penalty) * 10) / 10;
    topicStatus = 'WARNING';
    topicSeverity = 'warning';
    topicEvidence = `Topical focus can be strengthened on ${semanticWarns.length} check(s).`;
  }
  checks.push({
    id: 'content-topic-relevance',
    name: 'Topical Alignment & Semantic Relevance',
    category: 'content',
    status: topicStatus,
    maxPoints: 6.0,
    earnedPoints: topicEarned,
    evidence: topicEvidence,
    recommendation: topicStatus !== 'PASS' ? 'Align page headings, titles, and body copy directly with page search intent.' : undefined,
    issueSeverity: topicSeverity,
    impactedPages: semanticFails.length > 0 || semanticWarns.length > 0
      ? pages.filter(p => p.semanticFindings?.some(f => f.status === 'FAIL' || f.status === 'WARNING')).map(p => ({ url: p.url, detail: 'Topic alignment needs improvement' }))
      : pages.map(p => ({ url: p.url, detail: `Topic: ${detectedTopic}` }))
  });

  // Check 3.4: Internal Content Originality (5.0 pts) - Problem 15 & Problem 16
  let originalityEarned = 5.0;
  let originalityStatus: CheckStatus = 'PASS';
  let originalitySeverity: 'passed' | 'warning' = 'passed';
  let originalityEvidence = 'All crawled pages contain distinct body copy with zero internal duplication detected.';

  if (duplicatePairs.length > 0) {
    const highPairs = duplicatePairs.filter(d => d.severity === 'high');
    const modPairs = duplicatePairs.filter(d => d.severity === 'moderate');

    if (highPairs.length > 0) {
      originalityEarned = Math.max(1.0, 5.0 - (highPairs.length * 1.5 + modPairs.length * 0.8));
      originalityStatus = 'WARNING';
      originalitySeverity = 'warning';
      originalityEvidence = `High internal content duplication detected between ${highPairs.length} pair(s) of pages (e.g. ${highPairs[0].url1} and ${highPairs[0].url2} share ${highPairs[0].similarity}% similar text).`;
    } else {
      originalityEarned = Math.max(2.5, 5.0 - modPairs.length * 0.8);
      originalityStatus = 'WARNING';
      originalitySeverity = 'warning';
      originalityEvidence = `Moderate internal content similarity detected between ${modPairs.length} pair(s) of pages.`;
    }
    originalityEarned = Math.round(originalityEarned * 10) / 10;
  }
  checks.push({
    id: 'content-originality',
    name: 'Internal Content Originality',
    category: 'content',
    status: originalityStatus,
    maxPoints: 5.0,
    earnedPoints: originalityEarned,
    evidence: originalityEvidence,
    recommendation: duplicatePairs.length > 0 ? 'Differentiate duplicate pages or consolidate them with 301 redirects or canonical tags.' : undefined,
    issueSeverity: originalitySeverity,
    impactedPages: duplicatePairs.length > 0
      ? duplicatePairs.map(d => ({ url: d.url1, detail: `${d.similarity}% similarity with ${d.url2}` }))
      : pages.map(p => ({ url: p.url, detail: 'Unique page content' }))
  });

  // ------------------------------------------
  // CATEGORY 4: INTERNAL LINKING (10 Max Points)
  // ------------------------------------------

  // Check 4.1: Internal Link Connectivity & Depth (5.0 pts) - Problem 17
  let linksEarnedSum = 0;
  for (const p of pages) {
    const l = p.internalLinkCount || p.internalLinks?.length || 0;
    if (l >= 3) linksEarnedSum += 5.0;
    else if (l >= 1) linksEarnedSum += 3.5;
    else linksEarnedSum += 1.0;
  }
  const linksEarnedAvg = pages.length > 0 ? Math.round((linksEarnedSum / pages.length) * 10) / 10 : 0;
  checks.push({
    id: 'links-connectivity',
    name: 'Internal Link Connectivity & Depth',
    category: 'links',
    status: lowInternalLinkPages.length === 0 ? 'PASS' : 'WARNING',
    maxPoints: 5.0,
    earnedPoints: linksEarnedAvg,
    evidence: lowInternalLinkPages.length === 0
      ? `Internal linking structure connects all pages effectively (average of ${Math.round(totalInternalLinks / (pages.length || 1))} internal links per page).`
      : `${lowInternalLinkPages.length} of ${pages.length} pages have fewer than 2 internal links.`,
    recommendation: lowInternalLinkPages.length > 0 ? 'Add contextual internal links connecting related pages to distribute link equity.' : undefined,
    issueSeverity: lowInternalLinkPages.length === 0 ? 'passed' : 'warning',
    impactedPages: lowInternalLinkPages.length > 0 ? lowInternalLinkPages : pages.map(p => ({ url: p.url, detail: `${p.internalLinkCount} internal links` }))
  });

  // Check 4.2: Broken Internal Links Verification (3.0 pts)
  let brokenEarned = 3.0;
  let brokenStatus: CheckStatus = 'PASS';
  let brokenSeverity: 'passed' | 'warning' | 'critical' = 'passed';

  if (brokenLinksFound.length === 0) {
    brokenEarned = 3.0;
    brokenStatus = 'PASS';
    brokenSeverity = 'passed';
  } else if (brokenLinksFound.length <= 2) {
    brokenEarned = 1.5;
    brokenStatus = 'WARNING';
    brokenSeverity = 'warning';
  } else {
    brokenEarned = 0.0;
    brokenStatus = 'FAIL';
    brokenSeverity = 'critical';
  }
  checks.push({
    id: 'links-broken',
    name: 'Broken Internal Links Verification',
    category: 'links',
    status: brokenStatus,
    maxPoints: 3.0,
    earnedPoints: brokenEarned,
    evidence: brokenLinksFound.length === 0
      ? 'All tested internal link targets resolved with clean HTTP 200 OK responses with zero broken links.'
      : `Found ${brokenLinksFound.length} broken internal link target(s): ${brokenLinksFound.slice(0, 2).map(b => b.detail).join('; ')}.`,
    recommendation: brokenLinksFound.length > 0 ? 'Update or remove broken internal links to prevent 404 crawl waste.' : undefined,
    issueSeverity: brokenSeverity,
    impactedPages: brokenLinksFound.length > 0 ? brokenLinksFound : pages.map(p => ({ url: p.url, detail: 'Clean internal links' }))
  });

  // Check 4.3: Anchor Text Quality (2.0 pts)
  const genericAnchorPages = pages.filter(p => p.internalLinks?.some(l => l.isGenericAnchor));
  let anchorEarned = 2.0;
  if (genericAnchorPages.length > 0) {
    const penalty = Math.min(1.2, genericAnchorPages.length * 0.3);
    anchorEarned = Math.round((2.0 - penalty) * 10) / 10;
  }
  checks.push({
    id: 'links-anchor-quality',
    name: 'Anchor Text Quality',
    category: 'links',
    status: genericAnchorPages.length === 0 ? 'PASS' : 'WARNING',
    maxPoints: 2.0,
    earnedPoints: anchorEarned,
    evidence: genericAnchorPages.length === 0
      ? 'Internal links use descriptive anchor text.'
      : `${genericAnchorPages.length} page(s) contain internal links with generic anchor text (e.g. "click here").`,
    recommendation: genericAnchorPages.length > 0 ? 'Replace generic anchor text with descriptive keyword phrases.' : undefined,
    issueSeverity: genericAnchorPages.length === 0 ? 'passed' : 'notice',
    impactedPages: genericAnchorPages.length > 0 ? genericAnchorPages.map(p => ({ url: p.url, detail: 'Generic anchor text' })) : pages.map(p => ({ url: p.url, detail: 'Descriptive anchor text' }))
  });

  // ------------------------------------------
  // CATEGORY 5: PERFORMANCE & UX (10 Max Points) - Problem 18
  // ------------------------------------------

  // Check 5.1: Server Response Latency / TTFB (6.0 pts)
  let perfEarnedSum = 0;
  for (const p of pages) {
    const lat = p.responseTimeMs || 0;
    if (lat < 500) perfEarnedSum += 6.0;
    else if (lat < 1000) perfEarnedSum += 5.0;
    else if (lat < 2000) perfEarnedSum += 3.5;
    else if (lat < 3500) perfEarnedSum += 2.0;
    else perfEarnedSum += 0.5;
  }
  const perfEarnedAvg = pages.length > 0 ? Math.round((perfEarnedSum / pages.length) * 10) / 10 : 0;
  const avgLatency = Math.round(totalResponseTime / (pages.length || 1));
  const slowPages = pages.filter(p => p.responseTimeMs > 2000);
  checks.push({
    id: 'perf-response-time',
    name: 'Server Response Latency (TTFB)',
    category: 'performance',
    status: slowPages.length === 0 ? 'PASS' : slowPages.length / pages.length > 0.4 ? 'FAIL' : 'WARNING',
    maxPoints: 6.0,
    earnedPoints: perfEarnedAvg,
    evidence: `Average server response latency is ${avgLatency}ms (${slowPages.length} page(s) > 2000ms).`,
    recommendation: slowPages.length > 0 ? 'Optimize server response time, database queries, and enable full-page caching.' : undefined,
    issueSeverity: slowPages.length === 0 ? 'passed' : slowPages.length / pages.length > 0.4 ? 'warning' : 'notice',
    impactedPages: slowPages.length > 0 ? slowPages.map(p => ({ url: p.url, detail: `${p.responseTimeMs}ms` })) : pages.map(p => ({ url: p.url, detail: `${p.responseTimeMs}ms` }))
  });

  // Check 5.2: Redirect Hop Efficiency (2.0 pts)
  const redirectedPages = pages.filter(p => p.path !== '/' && p.url.includes('redirect'));
  checks.push({
    id: 'perf-redirects',
    name: 'Redirect Efficiency & Hop Count',
    category: 'performance',
    status: redirectedPages.length === 0 ? 'PASS' : 'WARNING',
    maxPoints: 2.0,
    earnedPoints: redirectedPages.length === 0 ? 2.0 : 1.2,
    evidence: redirectedPages.length === 0
      ? 'Clean URL resolutions without unnecessary intermediate redirect hops.'
      : `${redirectedPages.length} page(s) involved multiple redirect hops.`,
    recommendation: redirectedPages.length > 0 ? 'Direct internal links straight to final canonical destination URLs.' : undefined,
    issueSeverity: redirectedPages.length === 0 ? 'passed' : 'notice',
    impactedPages: redirectedPages.length > 0 ? redirectedPages.map(p => ({ url: p.url, detail: 'Redirect hop detected' })) : pages.map(p => ({ url: p.url, detail: 'Direct URL resolution' }))
  });

  // Check 5.3: HTML Payload Size & URL Cleanliness (2.0 pts)
  const uppercasePages = pages.filter(p => {
    try { return /[A-Z]/.test(new URL(p.url).pathname); } catch { return false; }
  });
  let payloadEarned = 2.0;
  if (uppercasePages.length > 0) {
    payloadEarned = 1.2;
  }
  checks.push({
    id: 'perf-url-cleanliness',
    name: 'Clean URL Structure & Payload Efficiency',
    category: 'performance',
    status: uppercasePages.length === 0 ? 'PASS' : 'WARNING',
    maxPoints: 2.0,
    earnedPoints: payloadEarned,
    evidence: uppercasePages.length === 0
      ? 'All crawled URLs adhere to standard lowercase slug conventions.'
      : `${uppercasePages.length} page URL(s) contain uppercase characters.`,
    recommendation: uppercasePages.length > 0 ? 'Standardize all URLs to lowercase characters and implement 301 redirects.' : undefined,
    issueSeverity: uppercasePages.length === 0 ? 'passed' : 'notice',
    impactedPages: uppercasePages.length > 0 ? uppercasePages.map(p => ({ url: p.url, detail: 'Uppercase URL path' })) : pages.map(p => ({ url: p.url, detail: 'Clean lowercase URL' }))
  });

  // ==========================================
  // STEP 5: CALCULATE FINAL CATEGORY & SITE SCORES
  // ==========================================
  // If zero pages were analyzed (all returned 4xx/5xx errors),
  // on-page, content, links, and page-level technical checks cannot be awarded
  // because error pages cannot be indexed by search engines.
  if (pagesAnalyzed === 0) {
    for (const c of checks) {
      if (c.category !== 'technical') {
        c.earnedPoints = 0;
        c.status = 'FAIL';
        c.issueSeverity = 'critical';
        c.evidence = `Crawl failed to access any usable pages (all ${pages.length} returned error status codes).`;
      } else if (c.id === 'tech-canonical' || c.id === 'tech-viewport') {
        c.earnedPoints = 0;
        c.status = 'FAIL';
        c.issueSeverity = 'critical';
        c.evidence = `Cannot verify ${c.name.toLowerCase()} because pages returned HTTP error status codes.`;
      }
    }
  }

  const technicalChecks = checks.filter(c => c.category === 'technical');
  const onPageChecks = checks.filter(c => c.category === 'onPage');
  const contentChecks = checks.filter(c => c.category === 'content');
  const linksChecks = checks.filter(c => c.category === 'links');
  const performanceChecks = checks.filter(c => c.category === 'performance');

  const technicalPoints = Math.max(0, Math.min(25, technicalChecks.reduce((sum, c) => sum + c.earnedPoints, 0)));
  const onPagePoints = Math.max(0, Math.min(30, onPageChecks.reduce((sum, c) => sum + c.earnedPoints, 0)));
  const contentPoints = Math.max(0, Math.min(25, contentChecks.reduce((sum, c) => sum + c.earnedPoints, 0)));
  const linksPoints = Math.max(0, Math.min(10, linksChecks.reduce((sum, c) => sum + c.earnedPoints, 0)));
  const performancePoints = Math.max(0, Math.min(10, performanceChecks.reduce((sum, c) => sum + c.earnedPoints, 0)));

  const rawOverall = technicalPoints + onPagePoints + contentPoints + linksPoints + performancePoints;
  const finalOverallScore = Math.max(0, Math.min(100, Math.round(rawOverall)));

  // Category percentage for UI breakdown cards (scaled to 100%)
  const scoreBreakdown: ScoreBreakdown = {
    overall: finalOverallScore,
    technical: Math.round((technicalPoints / 25) * 100),
    onPage: Math.round((onPagePoints / 30) * 100),
    content: Math.round((contentPoints / 25) * 100),
    links: Math.round((linksPoints / 10) * 100),
    performance: Math.round((performancePoints / 10) * 100)
  };

  // ==========================================
  // STEP 6: CONVERT CHECKS TO AUDIT ISSUES FOR UI
  // ==========================================
  const issues: AuditIssue[] = checks.map(c => ({
    id: c.id,
    category: c.issueSeverity,
    title: c.name,
    description: c.evidence,
    evidence: c.evidence,
    recommendation: c.recommendation || 'Keep maintaining this healthy SEO standard across all newly published pages.',
    impactedPages: c.impactedPages,
    impactScore: Math.round(c.maxPoints - c.earnedPoints),
    checkType: c.category
  }));

  // Sort issues: critical first, then warning, notice, passed
  const severityOrder = { critical: 0, warning: 1, notice: 2, passed: 3 };
  issues.sort((a, b) => severityOrder[a.category] - severityOrder[b.category]);

  const criticalIssuesCount = issues.filter(i => i.category === 'critical').length;
  const warningIssuesCount = issues.filter(i => i.category === 'warning').length;
  const noticeIssuesCount = issues.filter(i => i.category === 'notice').length;
  const passedChecksCount = issues.filter(i => i.category === 'passed').length;

  const totalChecksCount = checks.length;
  const totalPassesCount = checks.filter(c => c.status === 'PASS').length;
  const totalWarningsCount = checks.filter(c => c.status === 'WARNING').length;
  const totalFailuresCount = checks.filter(c => c.status === 'FAIL').length;
  const totalUnknownsCount = checks.filter(c => c.status === 'UNKNOWN').length;

  const avgPageScore = pagesAnalyzed > 0
    ? Math.round(pages.reduce((sum, p) => sum + (p.pageScore || 0), 0) / pages.length)
    : 0;

  return {
    issues,
    scoreBreakdown,
    checks,
    stats: {
      totalCrawled: pages.length,
      totalDiscovered: pages.length,
      pagesAnalyzed,
      pagesFailed,
      pagesSkipped: 0,
      totalChecks: totalChecksCount,
      totalPasses: totalPassesCount,
      totalWarnings: totalWarningsCount,
      totalFailures: totalFailuresCount,
      totalUnknowns: totalUnknownsCount,
      avgPageScore,
      avgResponseTimeMs: avgLatency,
      totalImages,
      totalMissingAlt,
      totalInternalLinks,
      totalExternalLinks,
      criticalIssuesCount,
      warningIssuesCount,
      noticeIssuesCount,
      passedChecksCount,
      duplicateContentPagesCount: duplicatePairs.length * 2,
      schemaPagesCount: schemaPresentPages.length
    }
  };
}
