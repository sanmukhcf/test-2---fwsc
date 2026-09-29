import { GoogleGenAI } from '@google/genai';
import { PageAudit, SemanticCheck, SiteContext } from '../src/types.js';

// Cache for semantic analysis to prevent duplicate API calls and minimize token usage
const semanticCache = new Map<string, SemanticCheck[]>();
const siteContextCache = new Map<string, SiteContext>();

// Helper to get GoogleGenAI client safely
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

/**
 * Deterministic rule-based semantic fallback when Gemini is unavailable or timed out.
 * Strictly calculates evidence from actual crawled content.
 */
export function deterministicSemanticAnalysis(page: PageAudit, siteTopic?: string): SemanticCheck[] {
  const checks: SemanticCheck[] = [];
  const title = (page.title || '').trim();
  const desc = (page.description || '').trim();
  const h1 = page.h1List && page.h1List.length > 0 ? page.h1List[0] : '';
  const bodyText = (page.bodySnippet || '').toLowerCase();
  const wordCount = page.wordCount || 0;

  // 1. Title Relevance Check
  if (!title) {
    checks.push({
      check: 'Title Tag Relevance',
      status: 'FAIL',
      reason: 'No title tag exists on the page to represent its topic.',
      evidence: 'Missing <title> tag entirely.',
      confidence: 1.0
    });
  } else if (/^(home|untitled|page|index|welcome|default)$/i.test(title)) {
    checks.push({
      check: 'Title Tag Relevance',
      status: 'FAIL',
      reason: 'Title tag is a generic placeholder with zero topic differentiation.',
      evidence: `Generic title detected: "${title}".`,
      confidence: 0.95
    });
  } else {
    // Check if title words appear in H1 or body
    const titleWords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'your', 'that', 'this', 'have', 'more'].includes(w));

    const matchesInBody = titleWords.filter(w => bodyText.includes(w)).length;
    const matchRatio = titleWords.length > 0 ? matchesInBody / titleWords.length : 0;

    if (titleWords.length > 0 && matchRatio < 0.25 && wordCount > 80) {
      checks.push({
        check: 'Title Tag Relevance',
        status: 'WARNING',
        reason: 'Title terms have minimal presence in the page visible body text.',
        evidence: `Title terms [${titleWords.slice(0, 4).join(', ')}] appear infrequently in visible content.`,
        confidence: 0.8
      });
    } else {
      checks.push({
        check: 'Title Tag Relevance',
        status: 'PASS',
        reason: 'Title tag describes specific terms supported by page content.',
        evidence: `Title "${title.slice(0, 45)}..." aligns with visible text terms.`,
        confidence: 0.85
      });
    }
  }

  // 2. H1 Relevance & Heading Hierarchy
  if (!h1) {
    checks.push({
      check: 'Primary H1 Alignment',
      status: 'FAIL',
      reason: 'Missing primary <h1> heading tag to anchor topic.',
      evidence: 'Zero <h1> tags found in HTML DOM.',
      confidence: 1.0
    });
  } else if (page.h1Count > 1) {
    checks.push({
      check: 'Primary H1 Alignment',
      status: 'WARNING',
      reason: 'Multiple <h1> tags dilute topic focus.',
      evidence: `Found ${page.h1Count} H1 tags: ${page.h1List.slice(0, 3).map(h => `"${h.slice(0, 30)}"`).join(', ')}.`,
      confidence: 0.9
    });
  } else {
    checks.push({
      check: 'Primary H1 Alignment',
      status: 'PASS',
      reason: 'Single distinct <h1> heading establishes clear subject.',
      evidence: `H1: "${h1.slice(0, 50)}"`,
      confidence: 0.85
    });
  }

  // 3. Heading Structure Support
  if (page.h2Count === 0 && wordCount > 300) {
    checks.push({
      check: 'Heading Hierarchy Support',
      status: 'WARNING',
      reason: 'Substantial content page lacks <h2> subheadings for thematic structure.',
      evidence: `Word count is ${wordCount}, but 0 <h2> tags were detected.`,
      confidence: 0.85
    });
  } else if (page.h2Count > 0) {
    checks.push({
      check: 'Heading Hierarchy Support',
      status: 'PASS',
      reason: 'Subheadings (H2) organize the document into structured themes.',
      evidence: `Found ${page.h2Count} H2 headings: ${page.h2List.slice(0, 2).map(h => `"${h.slice(0, 30)}"`).join(', ')}.`,
      confidence: 0.85
    });
  } else {
    checks.push({
      check: 'Heading Hierarchy Support',
      status: 'UNKNOWN',
      reason: 'Short page; subheading necessity is ambiguous.',
      evidence: `Page has ${wordCount} words and ${page.h2Count} subheadings.`,
      confidence: 0.5
    });
  }

  // 4. Content Quality / Thinness Check
  if (wordCount < 100) {
    checks.push({
      check: 'Content Depth & Substance',
      status: 'FAIL',
      reason: 'Very thin content with insufficient informative text.',
      evidence: `Only ${wordCount} visible words detected on page.`,
      confidence: 0.95
    });
  } else if (wordCount < 250) {
    checks.push({
      check: 'Content Depth & Substance',
      status: 'WARNING',
      reason: 'Content volume is low for an informative landing page.',
      evidence: `${wordCount} words detected (recommended min: 300+ words).`,
      confidence: 0.8
    });
  } else {
    checks.push({
      check: 'Content Depth & Substance',
      status: 'PASS',
      reason: 'Page provides meaningful visible textual substance.',
      evidence: `${wordCount} words with text-to-HTML ratio of ${page.textToHtmlRatio}%.`,
      confidence: 0.9
    });
  }

  // 5. Meta Description Alignment
  if (!desc) {
    checks.push({
      check: 'Meta Description Intent',
      status: 'FAIL',
      reason: 'Missing meta description tag.',
      evidence: 'No meta description found in HTML head.',
      confidence: 1.0
    });
  } else {
    checks.push({
      check: 'Meta Description Intent',
      status: 'PASS',
      reason: 'Meta description exists and provides search snippet copy.',
      evidence: `Description (${desc.length} chars): "${desc.slice(0, 60)}..."`,
      confidence: 0.8
    });
  }

  return checks;
}

/**
 * Server-side Gemini AI Semantic & Topic Relevance Analysis.
 * Runs strictly server-side, token-compressed, with deterministic fallback.
 */
export async function analyzePageWithGemini(
  page: PageAudit,
  siteTopic?: string
): Promise<{ findings: SemanticCheck[]; source: 'gemini' | 'rule_based' }> {
  // Check cache first
  const cacheKey = `${page.url}_${page.title}_${page.wordCount}_${page.h1List.join('|')}`;
  if (semanticCache.has(cacheKey)) {
    return { findings: semanticCache.get(cacheKey)!, source: 'gemini' };
  }

  const ai = getAiClient();
  if (!ai) {
    const fallback = deterministicSemanticAnalysis(page, siteTopic);
    return { findings: fallback, source: 'rule_based' };
  }

  // Token optimization: Prepare compressed payload
  const compressedBody = (page.bodySnippet || '')
    .slice(0, 900)
    .replace(/\s+/g, ' ')
    .trim();

  const prompt = `Analyze this webpage's SEO semantic relevance based solely on the provided evidence. Do NOT invent details.
Target URL: ${page.url}
Path: ${page.path}
Page Title: "${page.title}" (${page.titleLength} chars)
Meta Description: "${page.description}"
H1 Headings: ${JSON.stringify(page.h1List)}
H2 Headings: ${JSON.stringify(page.h2List.slice(0, 6))}
Word Count: ${page.wordCount}
Text Snippet: "${compressedBody}"
Site Topic: "${siteTopic || 'Unknown'}"

Evaluate 5 specific checks:
1. Title Tag Relevance (Does title accurately represent content or is it misleading/generic?)
2. Primary H1 Alignment (Does H1 match page topic and support title?)
3. Heading Hierarchy Support (Do H2s support the topic or are they unrelated/empty?)
4. Content Depth & Substance (Is content thin, template-like, or substantive?)
5. Meta Description Intent (Does description represent content or is it missing/generic?)

For every check return:
- check: string name
- status: "PASS" | "WARNING" | "FAIL" | "UNKNOWN"
- reason: brief objective reason
- evidence: exact snippet, quote, or metric from provided data
- confidence: number between 0.0 and 1.0

Return valid JSON as an array of objects.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a strict, evidence-based SEO auditor. Never invent facts. Base all findings strictly on the provided page data. If uncertain, mark status UNKNOWN. Output strictly in valid JSON format.',
        responseMimeType: 'application/json'
      }
    });

    clearTimeout(timeout);
    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    const checksArray: SemanticCheck[] = Array.isArray(parsed) ? parsed : parsed.checks || [];

    // Validate parsed results
    const validatedChecks: SemanticCheck[] = checksArray.map(c => ({
      check: String(c.check || 'Semantic Relevance Check'),
      status: ['PASS', 'WARNING', 'FAIL', 'UNKNOWN'].includes(c.status) ? c.status : 'UNKNOWN',
      reason: String(c.reason || 'Analyzed from page content.'),
      evidence: String(c.evidence || `Based on: ${page.title || page.url}`),
      confidence: typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : 0.8
    }));

    if (validatedChecks.length > 0) {
      semanticCache.set(cacheKey, validatedChecks);
      return { findings: validatedChecks, source: 'gemini' };
    }

    throw new Error('No valid checks in response');
  } catch (err: any) {
    console.warn(`Gemini semantic analysis fallback for ${page.url}:`, err.message || err);
    const fallback = deterministicSemanticAnalysis(page, siteTopic);
    return { findings: fallback, source: 'rule_based' };
  }
}

/**
 * Extracts the site's overall business context, main topics, and entities
 * from the crawled pages (homepage, about, services).
 */
export async function extractSiteContext(
  pages: PageAudit[],
  domain: string
): Promise<SiteContext> {
  const cacheKey = `ctx_${domain}_${pages.length}`;
  if (siteContextCache.has(cacheKey)) {
    return siteContextCache.get(cacheKey)!;
  }

  // 1. Deterministic extraction from HTML headings, titles, and body
  const allTitles = pages.map(p => p.title).filter(Boolean);
  const allH1s = pages.flatMap(p => p.h1List).filter(Boolean);
  const allH2s = pages.flatMap(p => p.h2List).filter(Boolean);

  // Frequency analysis of words across titles and headings
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'our', 'are', 'was', 'were',
    'have', 'has', 'more', 'about', 'home', 'page', 'contact', 'services', 'solutions', 'all',
    'get', 'best', 'online', 'free', 'website', 'checker', 'click', 'here', 'read'
  ]);

  const termCounts = new Map<string, number>();
  const addTextTokens = (str: string, weight = 1) => {
    const tokens = str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    for (const t of tokens) {
      termCounts.set(t, (termCounts.get(t) || 0) + weight);
    }
  };

  allTitles.forEach(t => addTextTokens(t, 3));
  allH1s.forEach(h => addTextTokens(h, 3));
  allH2s.forEach(h => addTextTokens(h, 2));

  // Also include first 300 words of homepage
  const homePage = pages.find(p => p.path === '/' || p.path === '') || pages[0];
  if (homePage?.bodySnippet) {
    addTextTokens(homePage.bodySnippet.slice(0, 600), 1);
  }

  const sortedTerms = Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  // Default deterministic context from actual extracted terms
  const defaultServices = allH2s
    .filter(h => h.length > 4 && h.length < 50)
    .slice(0, 5);

  let defaultTopic = sortedTerms.slice(0, 3).map(t => t.term).join(' ');
  if (!defaultTopic || defaultTopic.trim().length === 0) {
    defaultTopic = 'UNKNOWN';
  }

  const deterministicContext: SiteContext = {
    businessTopic: defaultTopic,
    mainServices: defaultServices.length > 0 ? defaultServices : (defaultTopic !== 'UNKNOWN' ? [defaultTopic] : []),
    importantEntities: sortedTerms.slice(0, 5).map(t => t.term),
    searchIntent: defaultTopic !== 'UNKNOWN' ? 'Informational / Commercial' : 'UNKNOWN',
    topTerms: sortedTerms,
    isAiPowered: false
  };

  // 2. Try Gemini AI if available
  const ai = getAiClient();
  if (!ai) {
    siteContextCache.set(cacheKey, deterministicContext);
    return deterministicContext;
  }

  const sampleTitles = allTitles.slice(0, 5).join(' | ');
  const sampleHeadings = allH1s.concat(allH2s).slice(0, 8).join(' | ');
  const homeSnippet = (homePage?.bodySnippet || '').slice(0, 500);

  const prompt = `Based strictly on this website's crawled content, identify the website's business context. Do NOT invent information.
Domain: ${domain}
Page Titles: ${sampleTitles}
Headings: ${sampleHeadings}
Homepage Text: "${homeSnippet}"

Return a JSON object with:
- businessTopic: string (concise primary business or website subject)
- mainServices: array of strings (top 3-5 main services or products detected)
- importantEntities: array of strings (top 3-5 key brand/product entities)
- searchIntent: string (primary search intent: e.g. "Transactional / Commercial", "Informational")`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an accurate semantic topic classification engine. Output strictly valid JSON.',
        responseMimeType: 'application/json'
      }
    });

    clearTimeout(timeout);
    const text = response.text?.trim() || '';
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.businessTopic) {
        const aiContext: SiteContext = {
          businessTopic: String(parsed.businessTopic),
          mainServices: Array.isArray(parsed.mainServices) ? parsed.mainServices.map(String) : deterministicContext.mainServices,
          importantEntities: Array.isArray(parsed.importantEntities) ? parsed.importantEntities.map(String) : deterministicContext.importantEntities,
          searchIntent: String(parsed.searchIntent || deterministicContext.searchIntent),
          topTerms: sortedTerms,
          isAiPowered: true
        };
        siteContextCache.set(cacheKey, aiContext);
        return aiContext;
      }
    }
  } catch (err) {
    console.warn('Gemini site context extraction fallback to deterministic:', err);
  }

  siteContextCache.set(cacheKey, deterministicContext);
  return deterministicContext;
}
