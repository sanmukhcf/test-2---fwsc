import React, { useState } from 'react';
import { Globe, ArrowRight, AlertCircle, ShieldAlert, Zap } from 'lucide-react';

interface UrlInputBarProps {
  onStartAudit: (url: string) => void;
  isLoading: boolean;
  initialUrl?: string;
  placeholder?: string;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  onStartAudit,
  isLoading,
  initialUrl = '',
  placeholder = 'Enter website URL (e.g. yoursite.com or https://example.com)...'
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a website URL to audit.');
      return;
    }

    // Basic client sanity check (server does complete SSRF + DNS check)
    let testUrl = trimmed;
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = 'https://' + testUrl;
    }

    try {
      const parsed = new URL(testUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        setValidationError('Please enter a valid domain name (e.g. example.com).');
        return;
      }
      if (parsed.hostname.toLowerCase() === 'localhost' || parsed.hostname.startsWith('127.')) {
        setValidationError('Localhost domains cannot be crawled. Please specify a public live website.');
        return;
      }
    } catch {
      setValidationError('Invalid URL format. Please enter a valid website address.');
      return;
    }

    onStartAudit(testUrl);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input Card */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xl shadow-orange-950/5 border border-neutral-200/90 hover:border-orange-400/90 transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* URL Input Box */}
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400">
                <Globe className="w-5 h-5 text-neutral-400" />
              </div>
              <input
                id="url-input-field"
                type="text"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder={placeholder}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 bg-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 font-medium transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              id="start-audit-button"
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-bold text-sm sm:text-base shadow-md shadow-orange-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auditing...</span>
                </div>
              ) : (
                <>
                  <span>Audit Website</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Informative Micro Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-neutral-500 pt-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Real-time DNS & Reachability Check
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-[#FF5500]" /> Automatic Page Discovery
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-400" /> Strict SSRF Protection
          </span>
        </div>
      </form>
    </div>
  );
};
