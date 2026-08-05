import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Search,
  MessageSquare
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

interface CompAIVoiceAssistantProps {
  onNavigateTab?: (tab: string) => void;
}

export default function CompAIVoiceAssistant({ onNavigateTab }: CompAIVoiceAssistantProps) {
  const { inventory } = useData();
  const { showToast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Web Speech Synthesis
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = (commandText: string) => {
    const text = commandText.toLowerCase().trim();
    setTranscript(commandText);

    if (text.includes('chemical') || text.includes('science')) {
      const response = 'Found 18 Science & Chemical items in catalog. Navigating to Storefront.';
      setAiResponse(response);
      speakText(response);
      showToast('info', 'CompAI Voice Response', response);
      if (onNavigateTab) onNavigateTab('shop');
    } else if (text.includes('po') || text.includes('purchase order')) {
      const response = 'Opening Purchase Orders and Vendor Replenishment hub.';
      setAiResponse(response);
      speakText(response);
      showToast('info', 'CompAI Voice Response', response);
      if (onNavigateTab) onNavigateTab('purchase_orders');
    } else if (text.includes('3d') || text.includes('heatmap') || text.includes('warehouse')) {
      const response = 'Opening 3D Warehouse Heatmap Telemetry.';
      setAiResponse(response);
      speakText(response);
      showToast('info', 'CompAI Voice Response', response);
      if (onNavigateTab) onNavigateTab('warehouse_heatmap');
    } else {
      const response = `Processed query: "${commandText}". Scanned ${inventory.length} catalog items.`;
      setAiResponse(response);
      speakText(response);
      showToast('success', 'CompAI Voice Assistant', response);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setTranscript('Listening for voice commands...');
      setTimeout(() => {
        setIsListening(false);
      }, 4000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl space-y-4 glow-card-indigo">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> COMPAI VOICE & SPEECH ENGINE
            </span>
            <span className="text-slate-400 text-xs">• Hands-Free Operations</span>
          </div>
          <h3 className="text-xl font-black text-white">CompAI Voice Assistant Copilot</h3>
          <p className="text-xs text-slate-300">
            Speak voice commands or select quick AI prompts to navigate, inspect stock, and issue purchase orders.
          </p>
        </div>

        {/* Microphone Pulse Button */}
        <button
          onClick={toggleListening}
          className={`p-4 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-3 cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          <span className="text-xs">{isListening ? 'Listening...' : 'Push to Speak'}</span>
        </button>
      </div>

      {/* Voice Waveform Visualizer simulation */}
      {isListening && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {[40, 70, 30, 90, 60, 100, 50, 80, 40, 60].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-emerald-400 rounded-full animate-bounce"
              style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {/* Transcript & AI Response Display */}
      {transcript && (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Voice Input: <strong className="text-white">"{transcript}"</strong></span>
          </div>

          {aiResponse && (
            <div className="flex items-center gap-2 text-emerald-400 pt-1 border-t border-slate-800">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{aiResponse}</span>
            </div>
          )}
        </div>
      )}

      {/* Preset Voice Command Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
        <span className="font-bold text-slate-400 uppercase text-[10px]">Quick Prompts:</span>
        {[
          'Show low stock chemicals',
          'Check inventory of Wash Bottles',
          'Show 3D warehouse map',
          'Issue PO to Vendor ABC',
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleVoiceCommand(prompt)}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl font-medium border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" /> "{prompt}"
          </button>
        ))}
      </div>
    </div>
  );
}
