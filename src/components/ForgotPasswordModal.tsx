import React, { useState } from 'react';
import { DigiVirusLogo } from './DigiVirusLogo';
import { X, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'success'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim()) {
      setErrorMessage('Please enter your username or registered email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Please provide a new password of at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          newPassword
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned an invalid response.');
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Unable to reset password. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      setStep('success');
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
              Reset Your Password
            </h2>
            <p className="text-xs text-neutral-500">
              Recover your FWSC account securely.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Username or Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username or email"
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                New Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 text-xs sm:text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all bg-neutral-50/50"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-black text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">
              Password Updated Successfully!
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto">
              Your password has been changed. You can now log in with your updated credentials.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="w-full py-3 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04400] text-white font-bold text-sm transition-all cursor-pointer"
            >
              Proceed to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
