import React, { useState } from 'react';
import {
  Globe,
  Ship,
  Plane,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Search,
  Filter
} from 'lucide-react';
import { useData } from '@/src/DataContext';

interface ShipmentRoute {
  id: string;
  poId: string;
  vendorName: string;
  origin: string;
  destination: string;
  carrier: string;
  vesselCode: string;
  status: 'CUSTOMS_CLEARED' | 'IN_PORT_INSPECTION' | 'EN_ROUTE' | 'DELIVERED';
  eta: string;
  delayDays: number;
}

export default function GlobalLogisticsMapTab() {
  const { purchaseOrders } = useData();

  const [shipments] = useState<ShipmentRoute[]>([
    {
      id: 'FGT-2026-901',
      poId: 'PO-2026-0101',
      vendorName: 'Micro-Tech Global Express (Shanghai)',
      origin: 'Shanghai Port, CN',
      destination: 'JNPT Port Mumbai -> Nitte HQ',
      carrier: 'COSCO Shipping Line',
      vesselCode: 'VSL-COSCO-8821',
      status: 'EN_ROUTE',
      eta: '2026-08-12 (7 Days)',
      delayDays: 0,
    },
    {
      id: 'FGT-2026-882',
      poId: 'PO-2026-0098',
      vendorName: 'Precision Glassware GmbH (Hamburg)',
      origin: 'Hamburg Air Hub, DE',
      destination: 'Bengaluru Cargo Hub -> Nitte HQ',
      carrier: 'Lufthansa Cargo Air',
      vesselCode: 'LH-CRG-4402',
      status: 'CUSTOMS_CLEARED',
      eta: '2026-08-08 (3 Days)',
      delayDays: 0,
    },
    {
      id: 'FGT-2026-840',
      poId: 'PO-2026-0095',
      vendorName: 'Karnataka Chemical Reagents Corp',
      origin: 'Mangaluru Industrial Zone',
      destination: 'Nitte HQ Warehouse (Bay 3)',
      carrier: 'Direct Lab Transport',
      vesselCode: 'KA-20-EX-9921',
      status: 'DELIVERED',
      eta: 'Delivered Today',
      delayDays: 0,
    },
  ]);

  const getStatusBadge = (status: ShipmentRoute['status']) => {
    switch (status) {
      case 'EN_ROUTE':
        return { label: 'EN ROUTE (SEA/AIR)', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'CUSTOMS_CLEARED':
        return { label: 'CUSTOMS CLEARED', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'IN_PORT_INSPECTION':
        return { label: 'PORT INSPECTION', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'DELIVERED':
        return { label: 'DELIVERED AT HQ', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/40 uppercase flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" /> GLOBAL FREIGHT LOGISTICS
            </span>
            <span className="text-slate-400 text-xs">• Sea & Air Telemetry</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Global Supplier Shipment & Freight Map</h2>
          <p className="text-xs text-slate-300">
            Real-time international vendor logistics tracking, carrier vessel codes, ETA countdowns, and customs clearance status.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-center">
          <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
            <div className="text-[9px] uppercase font-bold text-slate-400">Active Shipments</div>
            <div className="text-lg font-black text-blue-400">{shipments.length} Vessels</div>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
            <div className="text-[9px] uppercase font-bold text-slate-400">Customs Clearance</div>
            <div className="text-lg font-black text-emerald-400">100% Passed</div>
          </div>
        </div>
      </div>

      {/* Shipment Route Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {shipments.map((shipment) => {
          const badge = getStatusBadge(shipment.status);
          return (
            <div
              key={shipment.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-xl transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{shipment.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{shipment.vendorName}</h4>
                  <div className="text-[10px] text-slate-400 font-mono">PO Ref: {shipment.poId} • Carrier: {shipment.carrier}</div>
                </div>

                {/* Origin -> Destination Route Flow */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{shipment.origin}</span>
                  </div>
                  <div className="pl-1.5 border-l-2 border-dashed border-indigo-400 h-4 ml-1.5" />
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{shipment.destination}</span>
                  </div>
                </div>
              </div>

              {/* Vessel Code & ETA Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Vessel / Transit Code</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{shipment.vesselCode}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Estimated Arrival</div>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400">{shipment.eta}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
