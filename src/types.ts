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
  isExternal: boolean;
}

export interface LinkAudit {
  href: string;
  text: string;
  isInternal: boolean;
  isAnchor: boolean;
  rel?: string;
  target?: string;
  status?: number;
}

export interface PageAudit {
  url: string;
  path: string;
  status: number;
  statusText: string;
  responseTimeMs: number;
  contentType: string;
  contentLengthBytes: number;
  isHttps: boolean;

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

  // Canonical
  canonicalUrl: string | null;
  canonicalStatus: 'self' | 'different' | 'missing';

  // Content
  wordCount: number;
  readingTimeMinutes: number;
  textToHtmlRatio: number;

  // Images
  images: ImageAudit[];
  totalImages: number;
  missingAltCount: number;

  // Links
  internalLinks: LinkAudit[];
  externalLinks: LinkAudit[];
  internalLinkCount: number;
  externalLinkCount: number;

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

  // Technical
  hasViewport: boolean;
  charset: string | null;
  hasHsts: boolean;
  hasFavicon: boolean;
  lang: string | null;
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
  impactedPages: IssueImpactedPage[];
  impactScore?: number;
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
