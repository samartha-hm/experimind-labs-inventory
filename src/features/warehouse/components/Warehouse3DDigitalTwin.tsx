import React, { useState } from 'react';
import {
  Box,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCw,
  Eye,
  CheckCircle2,
  Building2,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useData } from '@/src/DataContext';

export default function Warehouse3DDigitalTwin() {
  const { inventory } = useData();

  const [viewAngle, setViewAngle] = useState<'ISOMETRIC' | 'TOP' | 'FRONT'>('ISOMETRIC');
  const [selectedRack3D, setSelectedRack3D] = useState<string>('RACK_A');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const RACKS_3D = [
    { id: 'RACK_A', name: 'Rack A — Microcontrollers & Electronics', x: 20, y: 30, color: '#6366F1', occupancy: '88%' },
    { id: 'RACK_B', name: 'Rack B — Lab Glassware & Reagents', x: 55, y: 30, color: '#10B981', occupancy: '64%' },
    { id: 'RACK_C', name: 'Rack C — STEM Kitting Packages', x: 20, y: 65, color: '#F59E0B', occupancy: '92%' },
    { id: 'RACK_D', name: 'Rack D — Mathematics & IQ Learning Aids', x: 55, y: 65, color: '#EC4899', occupancy: '45%' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/40 uppercase flex items-center gap-1">
              <Box className="w-3 h-3 text-indigo-400" /> 3D DIGITAL TWIN RENDERER
            </span>
            <span className="text-slate-400 text-xs">• Spatial WebGL Telemetry</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Interactive 3D Warehouse Spatial Map</h2>
          <p className="text-xs text-slate-300">
            3D WebGL spatial model of warehouse storage racks, pallet stacks, AMR picking robotics lanes, and environmental telemetry.
          </p>
        </div>

        {/* 3D View Angle Controls */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
          {(['ISOMETRIC', 'TOP', 'FRONT'] as const).map((angle) => (
            <button
              key={angle}
              onClick={() => setViewAngle(angle)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                viewAngle === angle ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {angle} View
            </button>
          ))}
        </div>
      </div>

      {/* 3D Spatial Canvas Container */}
      <div className="relative w-full h-[520px] bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between p-6 glow-card-indigo">
        {/* Canvas Background Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Simulated 3D Spatial Scene */}
        <div className="relative flex-1 flex items-center justify-center">
          <div
            className={`w-full max-w-2xl h-96 relative transition-transform duration-500 ${
              viewAngle === 'ISOMETRIC'
                ? 'rotate-x-45 -rotate-z-12 skew-x-12 scale-90'
                : viewAngle === 'TOP'
                ? 'rotate-0 scale-95'
                : 'rotate-x-12 scale-90'
            }`}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Robot AMR Picking Route Line */}
            <div className="absolute inset-x-12 top-1/2 h-1 bg-emerald-500/60 shadow-lg shadow-emerald-500/50 animate-pulse rounded-full" />
            <div className="absolute left-1/2 inset-y-12 w-1 bg-indigo-500/60 shadow-lg shadow-indigo-500/50 animate-pulse rounded-full" />

            {/* 3D Racks Displayed as Elevated Isometric Blocks */}
            {RACKS_3D.map((rack) => {
              const isSelected = selectedRack3D === rack.id;
              return (
                <div
                  key={rack.id}
                  onClick={() => setSelectedRack3D(rack.id)}
                  style={{ left: `${rack.x}%`, top: `${rack.y}%` }}
                  className={`absolute w-36 h-28 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between p-3 shadow-2xl group ${
                    isSelected
                      ? 'bg-indigo-900/90 border-indigo-400 scale-110 z-20 shadow-indigo-500/50 ring-4 ring-indigo-500/30'
                      : 'bg-slate-900/90 border-slate-700 hover:border-indigo-500 z-10 hover:scale-105'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-white">{rack.id.replace('_', ' ')}</span>
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-white font-mono"
                      style={{ backgroundColor: rack.color }}
                    >
                      {rack.occupancy}
                    </span>
                  </div>

                  <div className="text-[10px] font-extrabold text-slate-300 truncate">
                    {rack.name.split('—')[1]}
                  </div>

                  {/* 3D Shelf Layers Simulation */}
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="flex-1 h-2 rounded-sm"
                        style={{ backgroundColor: isSelected ? rack.color : '#334155' }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D Control Floating Bar */}
        <div className="relative z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Active Rack: <strong className="text-white">{RACKS_3D.find(r => r.id === selectedRack3D)?.name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
            >
              - Zoom
            </button>
            <span className="text-indigo-400 font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
            >
              + Zoom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
