import React from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { CheckCircle2, Shield, Cpu, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200/80 bg-white py-12 px-4 sm:px-6 lg:px-8 mt-16 text-neutral-600">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <DigiVirusLogo size="md" />
            <div className="mt-2">
              <h4 className="text-base font-bold text-neutral-900">
                FWSC — Free Website SEO Checker
              </h4>
              <p className="text-sm text-neutral-500 mt-1 max-w-md leading-relaxed">
                An authentic, server-side website crawler and SEO diagnostic platform built by <span className="font-semibold text-neutral-700">digiVirus</span>.
                Delivering uncompromised, ground-truth SEO audits without reliance on third-party marketing APIs or synthetic metrics.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5500]" /> Live Batch Crawler
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF5500]" /> DNS & Reachability Guard
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#FF5500]" /> 50+ Real SEO Diagnostics
              </span>
            </div>
          </div>

          {/* Col 2: Diagnostics */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Diagnostic Areas
            </h5>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li>Technical SEO & Security</li>
              <li>Robots.txt & XML Sitemaps</li>
              <li>On-Page Titles, Meta & Headings</li>
              <li>Content Depth & Readability</li>
              <li>Internal & Broken Link Graph</li>
              <li>Image Alt Text & Responsiveness</li>
            </ul>
          </div>

          {/* Col 3: Engine Architecture */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Engine Specifications
            </h5>
            <div className="space-y-2 text-xs text-neutral-500 font-mono bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/70">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
                <Terminal className="w-3.5 h-3.5 text-[#FF5500]" /> FWSC-Bot/1.0
              </div>
              <div>SSRF Protection: Active</div>
              <div>Concurrency: Safe Batching</div>
              <div>DNS Check: Native Async</div>
              <div>Zero 3rd-Party SEO APIs</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>
            &copy; {new Date().getFullYear()} FWSC by <span className="font-semibold text-neutral-600">digiVirus</span>. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span>Production Real-Crawl SEO Engine</span>
            <span>&bull;</span>
            <span className="text-[#FF5500] font-medium">digiVirus Technology</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
