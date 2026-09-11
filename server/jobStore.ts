import { AuditJob, RecentSite } from '../src/types.js';

class JobStore {
  private jobs: Map<string, AuditJob> = new Map();
  private recentSites: RecentSite[] = [];
  private jobQueues: Map<string, { queue: string[]; visited: Set<string> }> = new Map();

  constructor() {
    // Cleanup old jobs every 15 minutes (retain for 1 hour)
    setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if (now - job.createdAt > 3600 * 1000) {
          this.jobs.delete(id);
          this.jobQueues.delete(id);
        }
      }
    }, 15 * 60 * 1000);
  }

  public setJob(job: AuditJob): void {
    this.jobs.set(job.id, job);
  }

  public getJob(id: string): AuditJob | undefined {
    return this.jobs.get(id);
  }

  public initJobQueue(id: string, initialUrl: string): void {
    const visited = new Set<string>();
    visited.add(this.normalizeUrl(initialUrl));
    this.jobQueues.set(id, {
      queue: [initialUrl],
      visited
    });
  }

  public getJobQueue(id: string) {
    return this.jobQueues.get(id);
  }

  public popNextFromQueue(id: string): string | undefined {
    const queueData = this.jobQueues.get(id);
    if (!queueData || queueData.queue.length === 0) return undefined;
    return queueData.queue.shift();
  }

  public addUrlsToQueue(id: string, urls: string[], maxPages: number): void {
    const queueData = this.jobQueues.get(id);
    if (!queueData) return;

    for (const rawUrl of urls) {
      if (queueData.visited.size >= maxPages * 2) break;
      const normalized = this.normalizeUrl(rawUrl);
      if (!queueData.visited.has(normalized)) {
        queueData.visited.add(normalized);
        queueData.queue.push(rawUrl);
      }
    }
  }

  public normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      // Strip hash and trailing slash for deduplication
      let path = u.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
    } catch {
      return urlStr.toLowerCase();
    }
  }

  public addRecentSite(site: RecentSite): void {
    // Check if domain already exists
    const idx = this.recentSites.findIndex(s => s.domain.toLowerCase() === site.domain.toLowerCase());
    if (idx !== -1) {
      this.recentSites.splice(idx, 1);
    }
    // Prepend latest
    this.recentSites.unshift(site);
    // Keep top 12
    if (this.recentSites.length > 12) {
      this.recentSites = this.recentSites.slice(0, 12);
    }
  }

  public getRecentSites(): RecentSite[] {
    return this.recentSites;
  }
}

export const jobStore = new JobStore();
