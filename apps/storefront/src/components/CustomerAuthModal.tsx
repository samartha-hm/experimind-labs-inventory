'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useCustomerStore } from '@/store/useCustomerStore';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  initialTab = 'signin',
  onSuccess
}: CustomerAuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [signInEmailOrPhone, setSignInEmailOrPhone] = useState('');
  
  // Registration form fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('Science / Math Teacher');
  const [regOrg, setRegOrg] = useState('');
  const [regGstin, setRegGstin] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const login = useCustomerStore((state) => state.login);
  const register = useCustomerStore((state) => state.register);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTab(initialTab);
    setMessage(null);
  }, [initialTab, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmailOrPhone.trim()) {
      setMessage({ type: 'error', text: 'Please enter your registered email address or mobile number.' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const isEmail = signInEmailOrPhone.includes('@');
      const resolvedName = isEmail ? signInEmailOrPhone.split('@')[0].replace(/[._]/g, ' ') : 'Educator';
      
      login({
        email: isEmail ? signInEmailOrPhone.trim().toLowerCase() : `${signInEmailOrPhone.trim()}@experimind.customer`,
        phone: !isEmail ? signInEmailOrPhone.trim() : '+91 9876543210',
        name: resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1),
        role: 'Verified Educator / Customer'
      });

      setLoading(false);
      setMessage({ type: 'success', text: 'Signed in successfully!' });
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 600);
    }, 350);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all mandatory fields (Name, Email, Mobile).' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        role: regRole,
        organization: regOrg.trim(),
        gstin: regGstin.trim()
      });

      setLoading(false);
      setMessage({ type: 'success', text: 'Account created successfully! Welcome to ExperiMind Labs.' });
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 600);
    }, 350);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-left my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">ExperiMind Labs Customer Portal</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sign in to track orders, manage addresses & access GST tax receipts.</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-slate-800/80 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setMessage(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setMessage(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-4">
          
          {message && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* 1. SIGN IN TAB */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Email Address or Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. teacher@school.edu.in or 9876543210"
                    value={signInEmailOrPhone}
                    onChange={(e) => setSignInEmailOrPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Your Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-slate-500 text-[11px]">
                New to ExperiMind Labs Store?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP TAB */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 text-xs max-h-[55vh] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Raghavendra K."
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@school.edu.in"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Educational Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="School Lab In-charge">School Lab In-charge / ATL Coordinator</option>
                  <option value="Science / Math Teacher">Science / Math Teacher</option>
                  <option value="School Principal / Trustee">School Principal / Trustee</option>
                  <option value="Student / Parent">Student / Parent (Home STEM)</option>
                  <option value="General Customer">General Customer / Maker</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    School / Institution <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. National Public School"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    School GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 29AAACE1234F1Z5"
                      value={regGstin}
                      onChange={(e) => setRegGstin(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Secure & Private</span>
            </span>
            <span>ExperiMind Labs Karnataka</span>
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
