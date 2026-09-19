import React, { useState } from 'react';
import {
  Layers,
  Factory,
  QrCode,
  ArrowRight,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  X,
  Boxes,
  Compass,
  FileSpreadsheet,
  Scan,
  ShieldCheck,
  TrendingUp,
  Tag
} from 'lucide-react';

export type ProductionStage = 1 | 2 | 3;

interface ProductionLifecycleRibbonProps {
  currentStage: ProductionStage;
  projectId?: string;
  projectName?: string;
  batchMultiplier?: number;
  totalDeliverables?: number;
  onNavigateStage: (stage: ProductionStage) => void;
  className?: string;
}

export default function ProductionLifecycleRibbon({
  currentStage,
  projectId = 'PRJ-001',
  projectName = 'Current Production Run',
  batchMultiplier = 1,
  totalDeliverables,
  onNavigateStage,
  className = ''
}: ProductionLifecycleRibbonProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const stages = [
    {
      stage: 1 as ProductionStage,
      title: 'Project & Class BOM',
      subtitle: 'Class deliverables & components',
      badge: totalDeliverables !== undefined ? `${totalDeliverables} items` : 'Planning',
      icon: Layers,
      color: 'indigo'
    },
    {
      stage: 2 as ProductionStage,
      title: 'Production Sourcing & Kitting',
      subtitle: 'FabLab, Reagents & Online sourcing',
      badge: `${batchMultiplier}x scaled`,
      icon: Factory,
      color: 'emerald'
    },
    {
      stage: 3 as ProductionStage,
      title: 'Sticker & Label Lifecycle',
      subtitle: '3-Tier QR codes & QC verification',
      badge: 'Box / Pouch / Vial',
      icon: QrCode,
      color: 'purple'
    }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Stepper Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                  STEM Production Pipeline
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {projectName} ({projectId})
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                End-to-end manufacturing workflow: Planning BOM → Channel Sourcing → 3-Tier Serialization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
              Run: {batchMultiplier}x Multiplier
            </span>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="View Architecture & Best Practices Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Workflow Guide</span>
            </button>
          </div>
        </div>

        {/* 3 Step Interactive Progress Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {stages.map((s) => {
            const Icon = s.icon;
            const isActive = currentStage === s.stage;
            const isCompleted = currentStage > s.stage;

            return (
              <button
                key={s.stage}
                type="button"
                onClick={() => onNavigateStage(s.stage)}
                className={`relative p-3 rounded-2xl text-left transition-all cursor-pointer group flex items-center justify-between border ${
                  isActive
                    ? 'bg-gradient-to-r from-slate-900 to-indigo-950/70 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                    : isCompleted
                    ? 'bg-slate-950/60 border-emerald-500/40 hover:border-emerald-500/80 hover:bg-slate-900/60'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isCompleted
                        ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                        Step {s.stage}
                      </span>
                      {isActive && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <h4
                      className={`text-xs font-bold truncate transition-colors ${
                        isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {s.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{s.subtitle}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right pl-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Workflow & Best Practices Guide Modal */}
      {isGuideOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    STEM Production Architecture & Operational Best Practices
                  </h3>
                  <p className="text-xs text-slate-400">
                    Understanding how Project BOM, Sourcing Channels, and 3-Tier QR Labeling link together
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs leading-relaxed custom-scrollbar">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 space-y-2">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4" /> The 3-Step Manufacturing Principle
                </span>
                <p className="text-slate-300">
                  In modern kit manufacturing (Experimind Labs / Prastuti), projects are produced across 3 decoupled, deterministic stages:
                  <strong> Planning (Step 1)</strong> defines what each grade needs; 
                  <strong> Sourcing & Assembly (Step 2)</strong> scales materials by order multipliers and groups them by fabrication type; and 
                  <strong> Serialization & QC (Step 3)</strong> generates 3-tier QR codes so that warehouse dispatchers can verify zero missing parts with a mobile camera scan.
                </p>
              </div>

              {/* 3 Steps Detailed Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <h4 className="font-black text-white text-xs">Project & Class BOM</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Who uses it:</strong> Curriculum Designers & Project Leads.
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                    <li>Define grades/classes (e.g., Grade 6, 7, 8, 9, 10).</li>
                    <li>Set batch multipliers (e.g. 5x sets = 5 schools/kits).</li>
                    <li>Search 236+ curriculum items & warehouse inventory with live autocomplete.</li>
                    <li>Selectively import fields with checkboxes (<code className="text-indigo-300">Name</code>, <code className="text-indigo-300">Unit</code>, <code className="text-indigo-300">Cost</code>, <code className="text-indigo-300">Image</code>).</li>
                    <li>Specify physical units: <span className="font-mono text-emerald-400 font-bold">75g</span>, <span className="font-mono text-emerald-400 font-bold">500g</span>, <span className="font-mono text-emerald-400 font-bold">1meter</span>.</li>
                  </ul>
                </div>

                {/* Step 2 Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <h4 className="font-black text-white text-xs">Kitting & Sourcing Matrix</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Who uses it:</strong> Procurement, FabLab & Lab Techs.
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                    <li>Auto-segregates deliverables by 7 sourcing channels:
                      <span className="text-emerald-300 block">🪵 Laser Cut (MDF nesting sheets)</span>
                      <span className="text-emerald-300 block">🖨️ 3D Print (Filament grams & hours)</span>
                      <span className="text-emerald-300 block">⚗️ Chemical Prep (Total volume in L/g)</span>
                      <span className="text-emerald-300 block">🛒 Buy Local & Online Vendor Orders</span>
                    </li>
                    <li>Computes exact batch totals (Base Qty × Multiplier).</li>
                    <li>Assembly checklist for gathering into Activity Pouches.</li>
                  </ul>
                </div>

                {/* Step 3 Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <h4 className="font-black text-white text-xs">3-Tier Sticker & QC Lifecycle</h4>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Who uses it:</strong> Packaging Technicians & QA Auditors.
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                    <li>Generates 3-Tier QR Codes:
                      <span className="text-purple-300 block">📦 Tier 1: Master Class Crate Label</span>
                      <span className="text-purple-300 block">🏷️ Tier 2: Activity Pouch Ziplock Label</span>
                      <span className="text-purple-300 block">🔖 Tier 3: Chemical Vial & Lens Label</span>
                    </li>
                    <li>State Machine: <span className="text-slate-400">Draft → Queued → Printed → Affixed → Verified</span>.</li>
                    <li>Camera Scan Audit verifies zero missing components before shipping.</li>
                  </ul>
                </div>
              </div>

              {/* Data Flow Diagram Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  How Data Flows Automatically Between the Hubs
                </h4>
                <div className="bg-slate-900/90 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1.5 border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <span>Deliverable Created:</span>
                    <span>"Copper Sulfate Crystal Kit", Base: 75g, Class 8 (5x sets)</span>
                  </div>
                  <div className="pl-4 text-slate-400">
                    ↳ <strong className="text-emerald-400">Sourcing Matrix:</strong> Groups into "Chemical Prep" channel → Requires <strong className="text-white">75g × 5 = 375g Total</strong>.
                  </div>
                  <div className="pl-4 text-slate-400">
                    ↳ <strong className="text-purple-400">Sticker Hub:</strong> Generates 5x Tier-2 pouch labels + 5x Tier-3 vial labels with QR codes.
                  </div>
                  <div className="pl-4 text-slate-400">
                    ↳ <strong className="text-amber-400">P&L Costing:</strong> Multiplies ₹250 unit cost × 5 sets = ₹1,250 total BOM line.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Experimind Labs Production Architecture Standard
              </span>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Understood, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
