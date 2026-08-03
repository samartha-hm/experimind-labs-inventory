import React, { useState } from 'react';
import { Sparkles, Zap, Webhook, Play, CheckCircle2, XCircle, Plus, ToggleLeft, ToggleRight, Clock, Code, AlertTriangle, ShieldCheck } from 'lucide-react';
import { WorkflowRule } from '@/src/types';
import { useToast } from '@/src/contexts/ToastContext';

const INITIAL_RULES: WorkflowRule[] = [
  {
    id: 'rule_1',
    name: 'Auto-Create Purchase Order on Stock Shortage',
    event: 'stock_shortage',
    action: 'create_po',
    isActive: true,
    lastTriggered: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'rule_2',
    name: 'Dispatch E-Commerce Webhook on Kit Assembly',
    event: 'kit_packed',
    action: 'dispatch_webhook',
    targetUrl: 'https://api.storefront.example.com/webhooks/kits',
    isActive: true,
    lastTriggered: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'rule_3',
    name: 'Send Slack Alert on Sales Order Placement',
    event: 'order_created',
    action: 'notify_slack',
    targetUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    isActive: false,
  },
];

export default function AutomationTab() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<WorkflowRule[]>(INITIAL_RULES);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WorkflowRule | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => {
      if (r.id === id) {
        const next = !r.isActive;
        showToast(next ? 'success' : 'info', `Workflow "${r.name}" ${next ? 'Activated' : 'Paused'}`);
        return { ...r, isActive: next };
      }
      return r;
    }));
  };

  const handleTestRule = (rule: WorkflowRule) => {
    setSelectedRule(rule);
    setSimulationResult(null);
    setIsTestModalOpen(true);
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult({
        statusCode: 200,
        statusText: 'OK',
        executionTimeMs: 142,
        timestamp: new Date().toISOString(),
        payload: {
          event: selectedRule?.event,
          triggeredBy: 'Automated Rule Execution Engine',
          timestamp: new Date().toISOString(),
          data: {
            itemId: 'inv_item_8829',
            itemName: 'Wash bottles',
            stockQty: 2,
            threshold: 5,
            action: selectedRule?.action,
            targetUrl: selectedRule?.targetUrl || 'Internal Action Runner'
          }
        }
      });
      showToast('success', 'Webhook Test Payload Delivered Successfully!', 'HTTP 200 OK - 142ms');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Enterprise Workflow Engine (Odoo / Cal.com Pattern)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Automations & Event Webhooks
          </h2>
          <p className="text-xs text-slate-300 max-w-xl font-medium mt-1">
            Configure automated triggers, low-stock reorder rules, and outbound Webhook dispatches to external systems.
          </p>
        </div>

        <button
          onClick={() => {
            const newRule: WorkflowRule = {
              id: `rule_${Date.now()}`,
              name: `New Custom Webhook (${rules.length + 1})`,
              event: 'stock_shortage',
              action: 'dispatch_webhook',
              targetUrl: 'https://api.example.com/webhooks',
              isActive: true
            };
            setRules(prev => [newRule, ...prev]);
            showToast('success', 'Workflow Rule Created');
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Workflow Rule
        </button>
      </div>

      {/* Rules List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
              rule.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  rule.event === 'stock_shortage' ? 'bg-amber-100 text-amber-800' :
                  rule.event === 'kit_packed' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-indigo-100 text-indigo-800'
                }`}>
                  Trigger: {rule.event.replace('_', ' ')}
                </span>

                <button
                  onClick={() => toggleRule(rule.id)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {rule.isActive ? (
                    <ToggleRight className="w-7 h-7 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              <h3 className="font-bold text-slate-800 text-sm">{rule.name}</h3>
              {rule.targetUrl && (
                <div className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 mt-2 truncate flex items-center gap-1.5">
                  <Webhook className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{rule.targetUrl}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {rule.lastTriggered ? `Last run: ${new Date(rule.lastTriggered).toLocaleTimeString()}` : 'Never run'}
              </div>

              <button
                onClick={() => handleTestRule(rule)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-indigo-600" /> Test Webhook
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Test Simulation Modal */}
      {isTestModalOpen && selectedRule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" /> Webhook Test Simulator
              </h3>
              <button onClick={() => setIsTestModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">Target Endpoint</div>
              <div className="text-xs font-mono bg-slate-900 text-indigo-300 p-3 rounded-xl break-all">
                POST {selectedRule.targetUrl || 'https://internal.erp/actions/auto-po'}
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? 'Sending HTTP POST Payload...' : 'Execute Test Trigger Now'}
            </button>

            {simulationResult && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> HTTP 200 OK</span>
                  <span className="font-mono text-slate-400">{simulationResult.executionTimeMs}ms</span>
                </div>
                <pre className="text-[11px] font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto max-h-48 custom-scrollbar">
                  {JSON.stringify(simulationResult.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
