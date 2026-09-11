import React from 'react';
import { AuditJob } from '../../types';
import {
  FileText,
  AlignLeft,
  Heading,
  Share2,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface OnPageSectionProps {
  job: AuditJob;
}

export const OnPageSection: React.FC<OnPageSectionProps> = ({ job }) => {
  const pages = job.pages;

  // Title stats
  const missingTitles = pages.filter(p => !p.title);
  const shortTitles = pages.filter(p => p.title && p.title.length < 30);
  const longTitles = pages.filter(p => p.title && p.title.length > 60);
  const goodTitles = pages.filter(p => p.title && p.title.length >= 30 && p.title.length <= 60);

  // Description stats
  const missingDescs = pages.filter(p => !p.description);
  const shortDescs = pages.filter(p => p.description && p.description.length < 70);
  const longDescs = pages.filter(p => p.description && p.description.length > 160);
  const goodDescs = pages.filter(p => p.description && p.description.length >= 70 && p.description.length <= 160);

  // Headings
  const missingH1 = pages.filter(p => p.h1Count === 0);
  const multipleH1 = pages.filter(p => p.h1Count > 1);
  const singleH1 = pages.filter(p => p.h1Count === 1);

  // Social
  const hasOg = pages.filter(p => p.ogTitle || p.ogDescription || p.ogImage);
  const hasTwitter = pages.filter(p => p.twitterCard);

  return (
    <div className="space-y-6">
      {/* 3 Main On-Page Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Title Tag Analysis Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF5500]" />
              Page Titles
            </h4>
            <span className="text-xs font-bold text-neutral-500">
              {goodTitles.length} / {pages.length} Optimal
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <span>Optimal Length (30-60 chars):</span>
              <span className="font-bold">{goodTitles.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800">
              <span>Too Short (&lt; 30 chars):</span>
              <span className="font-bold">{shortTitles.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800">
              <span>Too Long (&gt; 60 chars):</span>
              <span className="font-bold">{longTitles.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 text-red-800">
              <span>Missing Title Tag:</span>
              <span className="font-bold">{missingTitles.length}</span>
            </div>
          </div>
        </div>

        {/* Meta Descriptions Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-[#FF5500]" />
              Meta Descriptions
            </h4>
            <span className="text-xs font-bold text-neutral-500">
              {goodDescs.length} / {pages.length} Optimal
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <span>Optimal Length (70-160 chars):</span>
              <span className="font-bold">{goodDescs.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800">
              <span>Too Short (&lt; 70 chars):</span>
              <span className="font-bold">{shortDescs.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800">
              <span>Too Long (&gt; 160 chars):</span>
              <span className="font-bold">{longDescs.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 text-red-800">
              <span>Missing Meta Description:</span>
              <span className="font-bold">{missingDescs.length}</span>
            </div>
          </div>
        </div>

        {/* Headings Structure Card */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Heading className="w-4 h-4 text-[#FF5500]" />
              H1 Headings Structure
            </h4>
            <span className="text-xs font-bold text-neutral-500">
              {singleH1.length} / {pages.length} Clean
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <span>Exactly 1 Main H1 Tag:</span>
              <span className="font-bold">{singleH1.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800">
              <span>Multiple H1s (&gt; 1):</span>
              <span className="font-bold">{multipleH1.length}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 text-red-800">
              <span>Missing H1 Tag:</span>
              <span className="font-bold">{missingH1.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media & Open Graph Tags Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-4">
          <Share2 className="w-4 h-4 text-[#FF5500]" />
          Social Metadata (Open Graph & Twitter Cards)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-700">Open Graph Protocol</span>
              {hasOg.length === pages.length ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {hasOg.length} / {pages.length} pages declared
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Controls link preview images, title, and descriptions on Facebook, LinkedIn, WhatsApp, etc.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-700">Twitter Card Meta</span>
              {hasTwitter.length === pages.length ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {hasTwitter.length} / {pages.length} pages declared
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Enables rich Twitter summary card previews with large images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
