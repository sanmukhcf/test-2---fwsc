import React from 'react';
import { ReachabilityCheck, ReachabilityErrorType } from '../types';
import {
  AlertOctagon,
  RotateCcw,
  ShieldAlert,
  ServerCrash,
  Clock,
  Ban,
  FileQuestion,
  Network
} from 'lucide-react';

interface AuditFailureViewProps {
  url: string;
  errorType: ReachabilityErrorType;
  message: string;
  reachability?: ReachabilityCheck;
  onTryAgain: () => void;
}

export const AuditFailureView: React.FC<AuditFailureViewProps> = ({
  url,
  errorType,
  message,
  reachability,
  onTryAgain
}) => {
  const getFailureDetails = () => {
    switch (errorType) {
      case 'NXDOMAIN':
        return {
          title: 'Website Not Found',
          badge: 'DNS Resolution Failed (NXDOMAIN / ENOTFOUND)',
          icon: Network,
          color: 'text-neutral-900',
          borderColor: 'border-neutral-300',
          bgBadge: 'bg-neutral-100 text-neutral-800',
          explanation:
            'The domain name does not exist or has no valid DNS A/AAAA records. Search engines and browsers cannot locate this host.',
          advice: [
            'Check spelling for typos in the domain name.',
            'Confirm domain registration is active and not expired.',
            'Verify your nameserver and DNS records have propagated.'
          ]
        };

      case 'BLOCKED_403':
        return {
          title: 'Access Blocked (HTTP 403 Forbidden)',
          badge: 'Website Exists &bull; Access Rejected',
          icon: Ban,
          color: 'text-amber-700',
          borderColor: 'border-amber-300',
          bgBadge: 'bg-amber-100 text-amber-800',
          explanation:
            'The domain exists and responds, but the web server or firewall (such as Cloudflare, AWS WAF, or Incapsula) actively rejected the crawler.',
          advice: [
            'This domain exists and is online, but prevents automated crawlers.',
            'Check firewall rules or bot protection settings.',
            'Ensure the server allows public HTTP GET requests.'
          ]
        };

      case 'NOT_FOUND_404':
        return {
          title: 'Page Not Found (HTTP 404)',
          badge: 'Domain Exists &bull; Path Missing',
          icon: FileQuestion,
          color: 'text-amber-700',
          borderColor: 'border-amber-300',
          bgBadge: 'bg-amber-100 text-amber-800',
          explanation:
            'The domain exists and is reachable, but the exact root path or initial page returned a 404 Not Found status.',
          advice: [
            'Check if the homepage requires a specific subfolder (e.g. /home or /index.html).',
            'Verify server routing configuration and default document settings.'
          ]
        };

      case 'RATE_LIMITED_429':
        return {
          title: 'Crawler Rate Limited (HTTP 429)',
          badge: 'Website Exists &bull; Too Many Requests',
          icon: Clock,
          color: 'text-amber-700',
          borderColor: 'border-amber-300',
          bgBadge: 'bg-amber-100 text-amber-800',
          explanation:
            'The website exists and is reachable, but temporarily rejected requests due to aggressive rate-limiting rules.',
          advice: [
            'Wait a few minutes before re-auditing.',
            'Adjust rate limiting thresholds for SEO audit bots on your host.'
          ]
        };

      case 'SERVER_ERROR_5XX':
        return {
          title: `Server Error (${reachability?.httpStatus || '5xx'})`,
          badge: 'Website Exists &bull; Server Internal Failure',
          icon: ServerCrash,
          color: 'text-red-700',
          borderColor: 'border-red-300',
          bgBadge: 'bg-red-100 text-red-800',
          explanation:
            'The website exists and DNS resolved, but the target server encountered an internal crash or gateway failure (500, 502, 503, or 504).',
          advice: [
            'Check backend application logs and web server status on your host.',
            'Confirm database connections and upstream proxy gateways are healthy.'
          ]
        };

      case 'TIMEOUT':
        return {
          title: 'Connection Timed Out',
          badge: 'Host Exists &bull; No Response',
          icon: Clock,
          color: 'text-orange-700',
          borderColor: 'border-orange-300',
          bgBadge: 'bg-orange-100 text-orange-800',
          explanation:
            'The website could not be reached within the 9-second timeout limit. The server may be overloaded or silently dropping connection requests.',
          advice: [
            'Verify web server port 80/443 accessibility and firewall ingress rules.',
            'Test if the server responds promptly in a private browser window.'
          ]
        };

      case 'PRIVATE_IP':
        return {
          title: 'Private / Reserved Network Blocked',
          badge: 'SSRF Security Guard Active',
          icon: ShieldAlert,
          color: 'text-red-700',
          borderColor: 'border-red-300',
          bgBadge: 'bg-red-100 text-red-800',
          explanation:
            'This address points to localhost, internal cloud metadata, or a private IP range. Only publicly accessible websites can be audited.',
          advice: ['Audit a public domain with public DNS records.']
        };

      default:
        return {
          title: 'Audit Failed',
          badge: 'Connection Error',
          icon: AlertOctagon,
          color: 'text-neutral-900',
          borderColor: 'border-neutral-300',
          bgBadge: 'bg-neutral-100 text-neutral-800',
          explanation: message || 'Unable to establish a reliable connection to the specified website.',
          advice: [
            'Confirm the URL is formatted correctly (e.g. https://example.com).',
            'Verify the target website is publicly accessible.'
          ]
        };
    }
  };

  const details = getFailureDetails();
  const Icon = details.icon;

  return (
    <div className="w-full max-w-2xl mx-auto my-10 bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-xl shadow-orange-950/5">
      {/* Icon & Title */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF5500]">
          <Icon className="w-7 h-7" />
        </div>

        <div>
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${details.bgBadge}`}>
            {details.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-2">
            {details.title}
          </h2>
          <p className="text-sm font-mono text-neutral-500 mt-1 truncate max-w-md mx-auto">
            {url}
          </p>
        </div>
      </div>

      {/* Explanation Box */}
      <div className="my-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200/70 text-sm text-neutral-700 leading-relaxed">
        <p className="font-semibold text-neutral-900 mb-1">Audit Diagnostic Notice:</p>
        <p>{details.explanation}</p>

        {reachability && (
          <div className="mt-3 pt-3 border-t border-neutral-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block">Status:</span>
              <span className="font-bold text-neutral-800">
                {reachability.httpStatus || '0 (No HTTP)'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block">IP:</span>
              <span className="font-bold text-neutral-800">
                {reachability.resolvedIp || 'Unresolved'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block">Response Time:</span>
              <span className="font-bold text-neutral-800">
                {reachability.responseTimeMs}ms
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actionable Recommendations */}
      <div className="space-y-2 mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Suggested Actions:
        </p>
        <ul className="space-y-1.5 text-xs sm:text-sm text-neutral-600">
          {details.advice.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-[#FF5500] font-bold">&bull;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Try Again Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          id="try-again-button"
          onClick={onTryAgain}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Another Website</span>
        </button>
      </div>
    </div>
  );
};
