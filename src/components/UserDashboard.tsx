import React, { useState, useEffect } from 'react';
import { UserProfile, UserAuditRecord } from '../types';
import { DigiVirusLogo } from './DigiVirusLogo';
import {
  User,
  Globe,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  History,
  PlusCircle,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  RotateCcw,
  LogOut,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { UrlInputBar } from './UrlInputBar';

interface UserDashboardProps {
  user: UserProfile;
  authToken: string;
  onStartNewAudit: (url: string) => void;
  onViewAuditReport: (record: UserAuditRecord) => void;
  onLogout: () => void;
  isLoading?: boolean;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  authToken,
  onStartNewAudit,
  onViewAuditReport,
  onLogout,
  isLoading
}) => {
  const [audits, setAudits] = useState<UserAuditRecord[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [showNewAuditInput, setShowNewAuditInput] = useState(false);

  const fetchUserAudits = async () => {
    setLoadingAudits(true);
    try {
      const res = await fetch('/api/user/audits', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (!res.ok) return;
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && Array.isArray(data.audits)) {
          setAudits(data.audits);
        }
      } catch {}
    } catch (e) {
      console.error('Error fetching user audits:', e);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    fetchUserAudits();
  }, [authToken]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 65) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Top Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5500] to-[#E04400] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/25 shrink-0">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                {user.fullName}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF5500] border border-orange-200">
                @{user.username}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm text-neutral-500">
              <DigiVirusLogo size="sm" showSubtitle={false} />
              <span>&bull;</span>
              <span>{user.profession}</span>
              <span>&bull;</span>
              <span>Private FWSC Dashboard</span>
            </div>
          </div>
        </div>

        {/* Dashboard Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNewAuditInput(prev => !prev)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Audit</span>
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 hover:border-red-300 hover:bg-red-50 text-neutral-700 hover:text-red-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Optional In-Dashboard URL Input Bar */}
      {showNewAuditInput && (
        <div className="bg-neutral-50 p-6 rounded-3xl border border-neutral-200 animate-fadeIn">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-800">
                Audit Any Website
              </h3>
              <button
                onClick={() => setShowNewAuditInput(false)}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <UrlInputBar onStartAudit={onStartNewAudit} isLoading={Boolean(isLoading)} />
          </div>
        </div>
      )}

      {/* Profile & Registered Website Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#FF5500]" />
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                User Profile
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              ID: {user.id.slice(0, 10)}...
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">Full Name</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">{user.fullName}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">Profession</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">{user.profession}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">Email Address</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">{user.email}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">Mobile Number</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">{user.mobileNumber}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">City</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">{user.city}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-semibold text-neutral-500">Account Created</span>
              </div>
              <p className="font-bold text-neutral-900 truncate">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Website Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#FF5500]" />
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Primary Website Details
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Registered
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-[11px] font-semibold text-neutral-400 mb-0.5">
                  Website Name
                </div>
                <div className="text-base font-black text-neutral-900">
                  {user.websiteName}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-[11px] font-semibold text-neutral-400 mb-0.5">
                  Website URL
                </div>
                <a
                  href={user.websiteUrl.startsWith('http') ? user.websiteUrl : `https://${user.websiteUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs sm:text-sm font-bold text-[#FF5500] hover:underline flex items-center gap-1.5 font-mono truncate"
                >
                  <span className="truncate">{user.websiteUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onStartNewAudit(user.websiteUrl)}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#FF5500]" />
              <span>Audit Registered Website Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Previous Audits Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#FF5500]" />
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Previous Audits
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Private audit history for your account. Every audit is preserved separately with full diagnostics.
            </p>
          </div>

          <button
            onClick={fetchUserAudits}
            className="text-xs font-bold text-[#FF5500] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh History</span>
          </button>
        </div>

        {/* Audit List */}
        {loadingAudits ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            <div className="w-6 h-6 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading your private audit records...</span>
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF5500] flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-800">
              No audit records in your account yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Launch an audit of your website or any live domain. Each completed audit will appear here privately with its full diagnostic score and breakdown.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onStartNewAudit(user.websiteUrl)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <span>Audit {user.websiteName || 'Your Website'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  <th className="pb-3 px-3">Website & Domain</th>
                  <th className="pb-3 px-3">Date & Time</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-center">SEO Score</th>
                  <th className="pb-3 px-3">Issues Found</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {audits.map(record => (
                  <tr key={record.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Domain */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-neutral-900 text-sm">
                        {record.domain}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-xs font-mono">
                        {record.url}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-3 text-neutral-600 whitespace-nowrap">
                      <div className="font-medium text-neutral-800">
                        {formatDate(record.timestamp)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {record.pagesCrawled} pages crawled
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Completed
                      </span>
                    </td>

                    {/* SEO Health Score */}
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg border ${getScoreColor(
                          record.score
                        )}`}
                      >
                        {record.score}/100
                      </span>
                    </td>

                    {/* Issues Found */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-red-600 font-semibold" title="Critical Issues">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{record.criticalIssues} critical</span>
                        </span>
                        <span className="text-neutral-300">&bull;</span>
                        <span className="text-amber-600 font-medium" title="Warnings">
                          {record.warningIssues} warnings
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewAuditReport(record)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>

                        <button
                          onClick={() => onStartNewAudit(record.url)}
                          title="Re-audit website"
                          className="p-1.5 rounded-lg border border-neutral-200 hover:border-orange-300 hover:bg-orange-50 text-neutral-600 hover:text-[#FF5500] transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
