import React, { useState } from 'react';
import { Building2, XCircle, CheckCircle2, ShieldCheck, Sparkles, Globe } from 'lucide-react';
import { useTenant } from '@/src/contexts/TenantContext';
import { useToast } from '@/src/contexts/ToastContext';

interface TenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TenantOnboardingModal({ isOpen, onClose }: TenantOnboardingModalProps) {
  const { addTenant } = useTenant();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: 'INR' as 'INR' | 'USD' | 'EUR',
    gstin: '',
    stateCode: '27',
    plan: 'Growth' as 'Starter' | 'Growth' | 'Enterprise',
    workspaces: 'Main Storage, Assembly Line 1',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    addTenant({
      name: formData.name,
      code: formData.code.toUpperCase(),
      currency: formData.currency,
      gstin: formData.gstin || '27AAACE0000A1Z1',
      stateCode: formData.stateCode,
      plan: formData.plan,
      isFlagship: false,
      workspaces: formData.workspaces.split(',').map(s => s.trim()),
    });

    showToast('success', 'Organization Onboarded Successfully', `Switched active tenant to ${formData.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Onboard New Organization (SaaS Tenant)</h3>
              <p className="text-xs text-slate-500 font-medium">Provision isolated tenant workspace & GST settings</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Tenant Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Robotics India Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tenant Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. ROBOT-IN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN Number (India)</label>
              <input
                type="text"
                placeholder="27AAACE1234F1Z9"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">State Code (Place of Supply)</label>
              <select
                value={formData.stateCode}
                onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="27">27 - Maharashtra</option>
                <option value="29">29 - Karnataka</option>
                <option value="07">07 - Delhi</option>
                <option value="33">33 - Tamil Nadu</option>
                <option value="24">24 - Gujarat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Base Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="USD">$ USD (US Dollar)</option>
                <option value="EUR">€ EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">SaaS Subscription Tier</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Starter">Starter ($49/mo)</option>
                <option value="Growth">Growth ($199/mo)</option>
                <option value="Enterprise">Enterprise (Custom)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Workspaces (comma-separated)</label>
            <input
              type="text"
              value={formData.workspaces}
              onChange={(e) => setFormData({ ...formData, workspaces: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-indigo-900 mt-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Tenant Isolation Guarantee</strong>: Data created in this organization will be indexed with <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">tenant_id</code> and isolated at the API data layer.
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Provision Tenant & Switch Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
