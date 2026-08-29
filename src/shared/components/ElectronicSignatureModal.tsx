import React, { useState } from "react";
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { SignatureMeaning } from "../../entity/ElectronicSignature.ts";

interface ElectronicSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  recordTitle: string;
  defaultMeaning?: SignatureMeaning;
  onSuccess: (signature: any) => void;
}

export const ElectronicSignatureModal: React.FC<ElectronicSignatureModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  recordTitle,
  defaultMeaning = "APPROVED",
  onSuccess,
}) => {
  const [meaning, setMeaning] = useState<SignatureMeaning>(defaultMeaning);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [comments, setComments] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) {
      setError("You must acknowledge that this electronic signature is the legally binding equivalent of your handwritten signature.");
      return;
    }
    if (!password) {
      setError("Please enter your account password to authenticate.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/v1/e-signature/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          meaning,
          passwordConfirmation: password,
          totpCode: totpCode || undefined,
          comments,
          recordData: { id: entityId, type: entityType, title: recordTitle, timestamp: Date.now() },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record electronic signature");
      }

      onSuccess(data.signature);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to sign record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-white">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">21 CFR Part 11 Electronic Signature</h3>
            <p className="text-xs text-slate-400">FDA Compliant Cryptographic Record Manifestation</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400">Target Record</div>
            <div className="font-semibold text-sm text-slate-200">{recordTitle}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Type: {entityType} | ID: {entityId}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Signature Intent / Meaning</label>
            <select
              value={meaning}
              onChange={(e) => setMeaning(e.target.value as SignatureMeaning)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="APPROVED">APPROVED (Formal Release / Authorization)</option>
              <option value="REVIEWED">REVIEWED (Verified Compliance & Quality)</option>
              <option value="AUTHORED">AUTHORED (Original Entry Creator)</option>
              <option value="QUALITY_RELEASED">QUALITY_RELEASED (GMP Disposition Clearance)</option>
              <option value="DISPOSITION_APPROVED">DISPOSITION_APPROVED (NCR / Variance Action)</option>
              <option value="CAPA_CLOSED">CAPA_CLOSED (Corrective Action Complete)</option>
              <option value="COUNT_VARIANCE_APPROVED">COUNT_VARIANCE_APPROVED (Inventory Reconciliation)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Comments / Approval Rationale (Optional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. All incoming test criteria verified against specifications."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-16 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Account Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Re-authenticate..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" /> 2FA Code (If enabled)
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit TOTP"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 tracking-wider text-center focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="legalAcknowledgement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-1 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="legalAcknowledgement" className="text-[11px] text-slate-400 leading-relaxed cursor-pointer select-none">
              By checking this box and providing my credentials, I certify that this electronic signature is the legally binding equivalent of my handwritten signature pursuant to FDA 21 CFR Part 11.
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAgreed || !password}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <span>Manifesting Signature...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Electronic Signature</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
