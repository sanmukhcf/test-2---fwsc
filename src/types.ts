export type AuditStatus =
  | 'idle'
  | 'validating_website'
  | 'checking_domain'
  | 'crawling_web'
  | 'analyzing_seo'
  | 'saving_audit'
  | 'validating' // legacy compatibility
  | 'checking_reachability' // legacy compatibility
  | 'crawling' // legacy compatibility
  | 'analyzing' // legacy compatibility
  | 'completed'
  | 'failed';

export interface UserProfile {
  id: string;
  fullName: string;
  websiteName: string;
  websiteUrl: string;
  city: string;
  mobileNumber: string;
  email: string;
  profession: string;
  username: string;
  createdAt: number;
}

export interface UserAuditRecord {
  id: string;
  userId: string;
  jobId: string;
  websiteName: string;
  url: string;
  domain: string;
  timestamp: number;
  status: 'completed' | 'failed';
  score: number;
  criticalIssues: number;
  warningIssues: number;
  noticeIssues: number;
  passedChecks: number;
  pagesCrawled: number;
  jobSnapshot?: AuditJob;
}

export type ReachabilityErrorType =
  | 'NONE'
  | 'NXDOMAIN'
  | 'BLOCKED_403'
  | 'NOT_FOUND_404'
  | 'RATE_LIMITED_429'
  | 'SERVER_ERROR_5XX'
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'INVALID_URL'
  | 'PRIVATE_IP'
  | 'UNKNOWN';

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export interface ReachabilityCheck {
  isReachable: boolean;
  httpStatus: number;
  statusText: string;
  resolvedIp?: string;
  responseTimeMs: number;
  redirectChain: RedirectHop[];
  finalUrl: string;
  errorType: ReachabilityErrorType;
  errorMessage?: string;
}

export interface ImageAudit {
  src: string;
  alt: string;
  hasAlt: boolean;
  hasAltAttribute?: boolean;
  isDecorative?: boolean;
  isExternal: boolean;
  isGenericAlt?: boolean;
}

export interface LinkAudit {
  href: string;
  text: string;
  isInternal: boolean;
  isAnchor: boolean;
  rel?: string;
  target?: string;
  status?: number;
  isGenericAnchor?: boolean;
}

export interface SemanticCheck {
  check: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'UNKNOWN';
  reason: string;
  evidence: string;
  confidence: number;
}

export interface SiteContext {
  businessTopic: string;
  mainServices: string[];
  importantEntities: string[];
  searchIntent: string;
  topTerms: { term: string; count: number }[];
  isAiPowered: boolean;
}

export interface PageIssueItem {
  category: 'critical' | 'warning' | 'notice' | 'passed';
  title: string;
  evidence: string;
  recommendation?: string;
}

export type PageType =
  | 'homepage'
  | 'about'
  | 'service'
  | 'product'
  | 'category'
  | 'contact'
  | 'blog'
  | 'landing'
  | 'other';

export interface PageAudit {
  url: string;
  path: string;
  pageType?: PageType;
  status: number;
  statusText: string;
  responseTimeMs: number;
  contentType: string;
  contentLengthBytes: number;
  isHttps: boolean;

  // Page Score (0-100 calculated deterministically)
  pageScore?: number;
  pageScoreBreakdown?: ScoreBreakdown;
  pageTopic?: string;
  semanticFindings?: SemanticCheck[];
  pageIssues?: PageIssueItem[];

  // Title
  title: string;
  titleLength: number;
  titleStatus: 'good' | 'too_short' | 'too_long' | 'missing';

  // Description
  description: string;
  descriptionLength: number;
  descriptionStatus: 'good' | 'too_short' | 'too_long' | 'missing';

  // Headings
  h1List: string[];
  h1Count: number;
  h1Status: 'good' | 'missing' | 'multiple';
  h2List: string[];
  h2Count: number;
  headingHierarchyIssues?: string[];

  // Canonical
  canonicalUrl: string | null;
  canonicalStatus: 'self' | 'different' | 'missing';

  // Content
  wordCount: number;
  readingTimeMinutes: number;
  textToHtmlRatio: number;
  bodySnippet?: string;
  normalizedContent?: string;
  isDuplicateContent?: boolean;
  duplicateWithUrl?: string;
  duplicateSimilarity?: number;

  // Images
  images: ImageAudit[];
  totalImages: number;
  missingAltCount: number;
  genericAltCount?: number;

  // Links
  internalLinks: LinkAudit[];
  externalLinks: LinkAudit[];
  internalLinkCount: number;
  externalLinkCount: number;
  brokenInternalLinks?: string[];

  // Directives
  metaRobots: string | null;
  isNoindex: boolean;
  isNofollow: boolean;
  xRobotsTag: string | null;

  // Social / Meta
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;

  // Technical & Schema
  hasViewport: boolean;
  charset: string | null;
  hasHsts: boolean;
  hasFavicon: boolean;
  lang: string | null;
  schemaOrg?: {
    hasSchema: boolean;
    types: string[];
  };
}

export interface RobotsTxtAudit {
  exists: boolean;
  status: number;
  url: string;
  contentSnippet: string;
  sitemapsFound: string[];
  disallowAll: boolean;
  rulesSummary: string;
}

export interface SitemapXmlAudit {
  exists: boolean;
  status: number;
  url: string;
  urlCount: number;
  urlsSample: string[];
  extractedUrls?: string[];
  isXml: boolean;
}

export interface IssueImpactedPage {
  url: string;
  detail?: string;
}

export interface AuditIssue {
  id: string;
  category: 'critical' | 'warning' | 'notice' | 'passed';
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
  impactedPages: IssueImpactedPage[];
  impactScore?: number;
  checkType?: string;
}

export interface AuditStartRequest {
  url: string;
  maxPages?: number;
  userId?: string;
  websiteName?: string;
}

export interface ScoreBreakdown {
  overall: number;
  technical: number;
  onPage: number;
  content: number;
  links: number;
  performance: number;
}

export interface AuditJob {
  id: string;
  userId?: string;
  websiteName?: string;
  targetUrl: string;
  inputUrl: string;
  finalUrl: string;
  hostname: string;
  maxPages: number;
  status: AuditStatus;
  failureReason?: string;
  failureCode?: ReachabilityErrorType;
  reachability?: ReachabilityCheck;

  progress: {
    crawledPages: number;
    targetPages: number;
    currentUrl?: string;
    stage: string;
  };

  pages: PageAudit[];
  robotsTxt?: RobotsTxtAudit;
  sitemapXml?: SitemapXmlAudit;

  siteContext?: SiteContext;
  issues: AuditIssue[];
  scoreBreakdown: ScoreBreakdown;

  stats: {
    totalCrawled: number;
    totalDiscovered?: number;
    pagesAnalyzed: number;
    pagesFailed: number;
    pagesSkipped?: number;
    totalChecks?: number;
    totalPasses?: number;
    totalWarnings?: number;
    totalFailures?: number;
    totalUnknowns?: number;
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
    crawlBudgetReached?: boolean;
  };

  createdAt: number;
  completedAt?: number;
}

export interface RecentSite {
  domain: string;
  url: string;
  score: number;
  crawledPages: number;
  criticalIssues: number;
  warningIssues: number;
  timestamp: number;
}
