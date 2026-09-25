import React, { useState } from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { X, Lock, Mail, Globe, MapPin, Phone, Briefcase, User, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: (user: UserProfile, token: string) => void;
  initialWebsiteUrl?: string;
}

export const SignupModal: React.FC<SignupModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSignupSuccess,
  initialWebsiteUrl = ''
}) => {
  const [fullName, setFullName] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [city, setCity] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initialWebsiteUrl if provided
  React.useEffect(() => {
    if (initialWebsiteUrl && !websiteUrl) {
      setWebsiteUrl(initialWebsiteUrl);
      try {
        const u = new URL(initialWebsiteUrl.startsWith('http') ? initialWebsiteUrl : `https://${initialWebsiteUrl}`);
        if (!websiteName) {
          setWebsiteName(u.hostname.replace('www.', ''));
        }
      } catch {}
    }
  }, [initialWebsiteUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !fullName.trim() ||
      !websiteName.trim() ||
      !websiteUrl.trim() ||
      !city.trim() ||
      !mobileNumber.trim() ||
      !email.trim() ||
      !profession.trim() ||
      !username.trim() ||
      !password
    ) {
      setErrorMessage('Please fill in all the required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          websiteName,
          websiteUrl,
          city,
          mobileNumber,
          email,
          profession,
          username,
          password
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned an unexpected response format.');
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to create account. Please try again.');
        setIsLoading(false);
        return;
      }

      onSignupSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-neutral-200/90 overflow-hidden my-8 animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 sm:p-7 border-b border-neutral-100 flex items-start justify-between bg-gradient-to-b from-orange-50/40 to-transparent">
          <div className="space-y-1">
            <DigiVirusLogo size="sm" subtitleText="By Lab of digiVirus" />
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight pt-2">
              Create Your Free FWSC Account
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Set up your profile once to run in-depth server-side SEO audits and track health history.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Full Name <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Harsh Gupta"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Profession / Business Type */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Profession / Business Type <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Founder, SEO Specialist, Agency"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Website Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Website Name <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. My SaaS Brand"
                  value={websiteName}
                  onChange={e => setWebsiteName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Website URL <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                City <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai, New York"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Mobile Number <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Email Address <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Username <span className="text-[#FF5500]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Choose unique username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Password (min. 6 characters) <span className="text-[#FF5500]">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Create a secure password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-black text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account & Starting Audit...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Switch to Login */}
          <div className="pt-2 text-center text-xs text-neutral-500">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-[#FF5500] hover:underline cursor-pointer"
            >
              Login here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
