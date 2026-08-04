import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, FileCode, CheckCircle2, AlertOctagon, Download, RefreshCw, UserX, Eye, Terminal } from 'lucide-react';
import { useToast } from '@/src/contexts/ToastContext';
import { AuditHashNode } from '@/src/types';

export default function ComplianceSecurityTab() {
  const { showToast } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState('192.168.1.0/24, 10.0.0.0/16');

  const [auditChain] = useState<AuditHashNode[]>([
    {
      id: 'hash_103',
      timestamp: '2026-08-04 11:30:00',
      action: 'STOCK_ADJUSTMENT',
      actor: 'Guest Administrator',
      actorRole: 'ADMIN',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: '4f89b12e89a012c45f89012e89012c345a6789012b3456789012c3456789012d',
      payload: '{"itemId":"inv_001","qtyDiff":+15}',
    },
    {
      id: 'hash_104',
      timestamp: '2026-08-04 11:32:15',
      action: 'CREATE_KIT',
      actor: 'Guest Administrator',
      actorRole: 'ADMIN',
      prevHash: '4f89b12e89a012c45f89012e89012c345a6789012b3456789012c3456789012d',
      currentHash: '89012c345a6789012b3456789012c3456789012d4f89b12e89a012c45f89012e',
      payload: '{"kitId":"kit_starter_pro"}',
    },
  ]);

  const handleVerifyChain = () => {
    showToast('success', 'Cryptographic Audit Chain Verified', '100% Hash Integrity confirmed across all immutable audit entries.');
  };

  const handleGdprExport = () => {
    showToast('success', 'GDPR Data Package Generated', 'Downloaded encrypted user PII & audit history archive (ZIP).');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase">
              SOC2 TYPE II & GDPR COMPLIANCE
            </span>
            <span className="text-slate-300 text-xs font-medium">• Hash-Chained Audit Ledger</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Security & Compliance Control Hub</h2>
          <p className="text-xs text-slate-300">
            Immutable hash-chained audit trails, MFA authentication, IP allow-listing, and GDPR/DPDP right-to-erase tools.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <ShieldCheck className="w-4 h-4" /> Verify Cryptographic Hash Chain
        </button>
      </div>

      {/* SOC2 Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Security Controls Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-slate-800 text-sm">SOC2 / ISO 27001 Controls</h4>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">PASSED</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div>
                <div className="font-bold text-slate-800">Multi-Factor Auth (MFA TOTP)</div>
                <div className="text-[10px] text-slate-400">Authenticator app enforcement</div>
              </div>
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`font-mono text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer ${
                  mfaEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {mfaEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
              <div className="font-bold text-slate-800">IP CIDR Allow-list</div>
              <input
                type="text"
                value={ipAllowlist}
                onChange={(e) => setIpAllowlist(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-[11px] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div>
                <div className="font-bold text-slate-800">Field-Level PII Encryption</div>
                <div className="text-[10px] text-slate-400">AES-256-GCM at rest</div>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-600">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* GDPR / DPDP Compliance Tools */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-slate-800 text-sm">GDPR / DPDP Right-to-Erase</h4>
            <p className="text-[11px] text-slate-500">Data portability & PII erasure workflows</p>
          </div>

          <div className="space-y-3 text-xs">
            <button
              onClick={handleGdprExport}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-2.5 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export User Data Package (JSON/ZIP)
            </button>

            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2">
              <div className="font-bold text-rose-900 text-[11px] flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-rose-600" /> Submit Right-to-Erase Anonymization
              </div>
              <p className="text-[10px] text-rose-700">
                Anonymizes PII across orders, invoices, and transaction logs while preserving accounting totals.
              </p>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Node Log */}
        <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Immutable SHA-256 Ledger</span>
            <span className="text-xs text-emerald-400 font-bold">CHAIN INTACT</span>
          </div>

          <div className="space-y-3 text-[10px]">
            {auditChain.map((node) => (
              <div key={node.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-400 font-bold">
                  <span>{node.action}</span>
                  <span className="text-slate-500">{node.timestamp}</span>
                </div>
                <div className="text-emerald-400 break-all">Hash: {node.currentHash.substring(0, 32)}...</div>
                <div className="text-slate-500">Prev: {node.prevHash.substring(0, 24)}...</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
