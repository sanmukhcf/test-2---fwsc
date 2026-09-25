import React, { useState } from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { X, Lock, User, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
  onOpenForgotPassword: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToSignup,
  onOpenForgotPassword,
  onLoginSuccess
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please provide both username or email, and your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
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
        setErrorMessage(data.message || 'Invalid username or password.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200/90 overflow-hidden my-8 animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-gradient-to-b from-orange-50/40 to-transparent">
          <div className="space-y-1">
            <DigiVirusLogo size="sm" subtitleText="By Lab of digiVirus" />
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight pt-2">
              Login to FWSC
            </h2>
            <p className="text-xs text-neutral-500">
              Access your saved SEO audit reports and private dashboard.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username or Email */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Username or Email Address
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
              <input
                id="login-username-input"
                type="text"
                required
                placeholder="Enter username or email"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-neutral-700">
                Password
              </label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs font-semibold text-[#FF5500] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
              <input
                id="login-password-input"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Login Button */}
          <div className="pt-2">
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-black text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Create Account Divider & Button */}
          <div className="pt-4 border-t border-neutral-100 space-y-3">
            <p className="text-center text-xs text-neutral-500">
              Don't have an account yet?
            </p>
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="w-full py-3 px-4 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 bg-white text-neutral-800 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#FF5500]" />
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
