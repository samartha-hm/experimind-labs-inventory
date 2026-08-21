import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  MapPin,
  Plus,
  Move,
  RotateCw,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Download,
  Printer,
  Grid,
  Eye,
  Box,
  Building2,
  Sliders,
  Check,
  X,
  Package,
  Info,
  ChevronRight,
  Flame,
  Truck,
  DoorOpen,
  Footprints,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

export interface FloorPlanElement {
  id: string;
  type: 'rack' | 'plywood_grid' | 'cabinet' | 'workbench' | 'dock_inbound' | 'dock_outbound' | 'door' | 'pathway' | 'hazmat_zone';
  label: string;
  linkedRackCode?: string; // e.g. 'RACK-01', 'PLY-01'
  x: number; // grid x in px
  y: number; // grid y in px
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  color?: string;
  zone?: string;
  notes?: string;
}

const PALETTE_TEMPLATES: Omit<FloorPlanElement, 'id' | 'x' | 'y'>[] = [
  {
    type: 'rack',
    label: 'Steel Shelving Rack',
    width: 140,
    height: 70,
    rotation: 0,
    color: '#3b82f6',
    zone: 'Zone A - General',
    notes: 'Multi-tier steel rack for plastic storage bins'
  },
  {
    type: 'plywood_grid',
    label: '🪵 Plywood Pigeonhole Matrix',
    width: 160,
    height: 80,
    rotation: 0,
    color: '#d97706',
    zone: 'Zone B - Small Parts',
    notes: 'Rectangular wooden pigeonhole organizer'
  },
  {
    type: 'cabinet',
    label: '🗄️ Chemical / Safety Cabinet',
    width: 100,
    height: 60,
    rotation: 0,
    color: '#ef4444',
    zone: 'Zone C - Safety',
    notes: 'Enclosed flame-retardant storage cabinet'
  },
  {
    type: 'workbench',
    label: '📦 Assembly & Packing Bench',
    width: 120,
    height: 60,
    rotation: 0,
    color: '#10b981',
    zone: 'Assembly Area',
    notes: 'Static-dissipative ESD packing workbench'
  },
  {
    type: 'dock_inbound',
    label: '🚚 Inbound Receiving Dock',
    width: 180,
    height: 60,
    rotation: 0,
    color: '#6366f1',
    zone: 'Logistics Bay',
    notes: 'Freight pallet receiving and staging'
  },
  {
    type: 'dock_outbound',
    label: '📤 Outbound Dispatch Dock',
    width: 180,
    height: 60,
    rotation: 0,
    color: '#8b5cf6',
    zone: 'Logistics Bay',
    notes: 'Courier pickup and dispatch staging'
  },
  {
    type: 'door',
    label: '🚪 Entry Door / Fire Exit',
    width: 60,
    height: 20,
    rotation: 0,
    color: '#64748b',
    zone: 'Perimeter',
    notes: 'Personnel security access door'
  },
  {
    type: 'hazmat_zone',
    label: '🚧 Hazardous Materials Staging',
    width: 120,
    height: 100,
    rotation: 0,
    color: '#f59e0b',
    zone: 'Hazmat Zone',
    notes: 'Secondary containment safety zone'
  }
];

const DEFAULT_FLOOR_PLANS: Record<string, FloorPlanElement[]> = {
  'WH-MAIN-01': [
    { id: 'fp_01', type: 'dock_inbound', label: '🚚 Inbound Receiving Bay', x: 40, y: 40, width: 180, height: 60, rotation: 0, color: '#6366f1', zone: 'Inbound' },
    { id: 'fp_02', type: 'rack', label: 'Rack 1 — Main Assembly & Science Shelf', linkedRackCode: 'RACK-01', x: 280, y: 40, width: 160, height: 70, rotation: 0, color: '#3b82f6', zone: 'Zone A (High Velocity)' },
    { id: 'fp_03', type: 'plywood_grid', label: 'Plywood Unit 1 — 🪵 Pigeonhole Matrix', linkedRackCode: 'PLY-01', x: 480, y: 40, width: 160, height: 80, rotation: 0, color: '#d97706', zone: 'Zone B (Hardware)' },
    { id: 'fp_04', type: 'cabinet', label: 'Cabinet A — Chemical & Safety Storage', linkedRackCode: 'CAB-01', x: 680, y: 40, width: 110, height: 60, rotation: 0, color: '#ef4444', zone: 'Zone C (Hazmat)' },
    { id: 'fp_05', type: 'workbench', label: '📦 ESD Kit Assembly Table 1', x: 280, y: 200, width: 150, height: 70, rotation: 0, color: '#10b981', zone: 'Production' },
    { id: 'fp_06', type: 'workbench', label: '📦 ESD Kit Assembly Table 2', x: 480, y: 200, width: 150, height: 70, rotation: 0, color: '#10b981', zone: 'Production' },
    { id: 'fp_07', type: 'dock_outbound', label: '📤 Outbound Dispatch & Courier Bay', x: 680, y: 200, width: 180, height: 60, rotation: 0, color: '#8b5cf6', zone: 'Outbound' },
    { id: 'fp_08', type: 'door', label: '🚪 Main Entrance', x: 40, y: 340, width: 80, height: 20, rotation: 0, color: '#64748b', zone: 'Perimeter' }
  ]
};

export default function FloorPlanDesignerTab() {
  const { warehouses, inventory, bins } = useData();
  const { showToast } = useToast();

  const [selectedWhCode, setSelectedWhCode] = useState<string>(warehouses[0]?.code || 'WH-MAIN-01');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isHeatmapMode, setIsHeatmapMode] = useState<boolean>(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Dragging Canvas State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Floor Plan Elements State
  const [elements, setElements] = useState<FloorPlanElement[]>(() => {
    try {
      const saved = localStorage.getItem(`experimind_floorplan_${selectedWhCode}`);
      return saved ? JSON.parse(saved) : (DEFAULT_FLOOR_PLANS[selectedWhCode] || DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || []);
    } catch (_) {
      return DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || [];
    }
  });

  // Switch Warehouse Layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`experimind_floorplan_${selectedWhCode}`);
      if (saved) {
        setElements(JSON.parse(saved));
      } else if (DEFAULT_FLOOR_PLANS[selectedWhCode]) {
        setElements(DEFAULT_FLOOR_PLANS[selectedWhCode]);
      } else {
        setElements([]);
      }
      setSelectedElementId(null);
    } catch (_) {}
  }, [selectedWhCode]);

  // Persist Layout changes
  const saveFloorPlan = (newElements: FloorPlanElement[]) => {
    setElements(newElements);
    try {
      localStorage.setItem(`experimind_floorplan_${selectedWhCode}`, JSON.stringify(newElements));
    } catch (_) {}
  };

  const selectedElement = useMemo(() => {
    return elements.find(e => e.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Map parts count for linked racks
  const getRackStoredItems = (linkedCode?: string) => {
    if (!linkedCode) return [];
    const clean = linkedCode.toLowerCase();
    return inventory.filter(item => {
      const bin = (item.binLocation || '').toLowerCase();
      return bin.includes(clean);
    });
  };

  // Add Element from Palette
  const handleAddElement = (template: typeof PALETTE_TEMPLATES[0]) => {
    const newEl: FloorPlanElement = {
      ...template,
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      x: 100 + (elements.length % 5) * 40,
      y: 100 + (elements.length % 5) * 40,
    };
    const updated = [...elements, newEl];
    saveFloorPlan(updated);
    setSelectedElementId(newEl.id);
    showToast('success', 'Element Placed', `Placed "${newEl.label}" onto the canvas.`);
  };

  // Rotate Element
  const handleRotateSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.map(e => {
      if (e.id === selectedElementId) {
        const nextRot = ((e.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...e, rotation: nextRot };
      }
      return e;
    });
    saveFloorPlan(updated);
  };

  // Delete Element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter(e => e.id !== selectedElementId);
    saveFloorPlan(updated);
    setSelectedElementId(null);
    showToast('info', 'Element Removed', 'Removed element from floor plan.');
  };

  // Mouse Drag handling with Grid Snap (20px)
  const handleMouseDown = (e: React.MouseEvent, el: FloorPlanElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsDragging(true);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const scale = zoomLevel / 100;
      setDragOffset({
        x: (e.clientX - canvasRect.left) / scale - el.x,
        y: (e.clientY - canvasRect.top) / scale - el.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const scale = zoomLevel / 100;
    const mouseX = (e.clientX - canvasRect.left) / scale;
    const mouseY = (e.clientY - canvasRect.top) / scale;

    // 20px Grid Snapping
    const snappedX = Math.max(0, Math.round((mouseX - dragOffset.x) / 20) * 20);
    const snappedY = Math.max(0, Math.round((mouseY - dragOffset.y) / 20) * 20);

    setElements(prev =>
      prev.map(el => (el.id === selectedElementId ? { ...el, x: snappedX, y: snappedY } : el))
    );
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      saveFloorPlan(elements);
    }
  };

  // Pre-made Templates
  const handleLoadTemplate = (templateKey: string) => {
    if (confirm('Load pre-configured template? Current layout will be replaced.')) {
      const t = DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || [];
      saveFloorPlan(t);
      showToast('success', 'Template Loaded', 'Loaded Standard Distribution Center blueprint.');
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn select-none">
      
      {/* Top Banner Control Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                2D Interactive Warehouse Floor Plan Designer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Top-down spatial layout blueprint. Drag and position storage racks, pigeonhole matrixes, packing benches, and receiving bays.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Facility Selector */}
          <select
            value={selectedWhCode}
            onChange={(e) => setSelectedWhCode(e.target.value)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.code}>{w.name} ({w.code})</option>
            ))}
          </select>

          {/* Heatmap Overlay Toggle */}
          <button
            onClick={() => setIsHeatmapMode(!isHeatmapMode)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isHeatmapMode
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{isHeatmapMode ? 'Heatmap Active' : 'Heatmap Overlay'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print Blueprint */}
          <button
            onClick={() => {
              window.print();
              showToast('success', 'Print Job Prepared', 'Ready to print facility floor plan blueprint.');
            }}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            title="Print Blueprint"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Designer Canvas & Palette Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left 3 Cols: Spatial Element Palette & Quick Templates */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Spatial Palette */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              Spatial Element Palette
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Click to place elements onto the 2D grid:</p>

            <div className="space-y-2">
              {PALETTE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddElement(tmpl)}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
                      style={{ backgroundColor: tmpl.color }}
                    />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                      {tmpl.label}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Layout Templates */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Facility Templates
            </h3>
            <button
              onClick={() => handleLoadTemplate('standard')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reset to Standard Hub Layout
            </button>
          </div>
        </div>

        {/* Center/Right 9 Cols: Interactive Blueprint Canvas & Inspector Drawer */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Active Canvas Action Toolbar (When Element Selected) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">
                {selectedElement ? (
                  <>Selected: <strong className="text-slate-900 dark:text-white font-bold">{selectedElement.label}</strong> (X: {selectedElement.x}px, Y: {selectedElement.y}px)</>
                ) : (
                  'Click any element on the floor plan to drag, rotate, or inspect stored components.'
                )}
              </span>
            </div>

            {selectedElement && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRotateSelected}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500" /> Rotate 90° ({selectedElement.rotation}°)
                </button>

                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
          </div>

          {/* Interactive Spatial Grid Canvas Container */}
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="bg-slate-900 rounded-3xl border-2 border-slate-800 shadow-2xl relative overflow-hidden h-[540px] cursor-crosshair"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          >
            {/* Warehouse Facility Title Watermark */}
            <div className="absolute top-4 left-4 pointer-events-none opacity-40">
              <div className="text-sm font-black uppercase tracking-widest text-slate-300 font-mono">
                {selectedWhCode} • SPATIAL BLUEPRINT
              </div>
              <div className="text-[10px] text-slate-400 font-mono">20px Grid Snap Active • Scale 1:50</div>
            </div>

            {/* Elements Layer */}
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left',
                width: '100%',
                height: '100%',
                position: 'relative'
              }}
            >
              {elements.map((el) => {
                const isSelected = el.id === selectedElementId;
                const storedItems = getRackStoredItems(el.linkedRackCode);
                const isOccupied = storedItems.length > 0;

                // Heatmap Color Calculation
                let displayColor = el.color || '#3b82f6';
                if (isHeatmapMode) {
                  displayColor = storedItems.length > 10 ? '#ef4444' : storedItems.length > 0 ? '#f59e0b' : '#10b981';
                }

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      transform: `rotate(${el.rotation}deg)`,
                      backgroundColor: `${displayColor}20`,
                      borderColor: isSelected ? '#ffffff' : displayColor,
                    }}
                    className={`absolute rounded-xl border-2 transition-shadow flex flex-col items-center justify-center p-2 cursor-grab active:cursor-grabbing group shadow-md backdrop-blur-xs ${
                      isSelected ? 'ring-2 ring-white/50 shadow-2xl z-20' : 'z-10 hover:border-white'
                    }`}
                  >
                    {/* Corner Drag Accent */}
                    <div className="text-center truncate px-1">
                      <span
                        className="font-black text-[11px] uppercase tracking-tight block truncate drop-shadow-sm"
                        style={{ color: isSelected ? '#ffffff' : displayColor }}
                      >
                        {el.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-300 opacity-90 block">
                        {storedItems.length} SKUs Stored
                      </span>
                    </div>

                    {/* Zone Badge */}
                    {el.zone && (
                      <span className="absolute -bottom-2.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-slate-300 text-[8px] font-mono font-bold border border-slate-700">
                        {el.zone}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unit Contents Inspection Drawer (When Rack Selected) */}
          {selectedElement && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    Storage Unit Inspector: {selectedElement.label}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Zone: {selectedElement.zone || 'Unassigned'} • Dimensions: {selectedElement.width}px × {selectedElement.height}px
                  </p>
                </div>
              </div>

              {/* Items in this physical unit */}
              {(() => {
                const stored = getRackStoredItems(selectedElement.linkedRackCode);
                return (
                  <div className="space-y-2">
                    {stored.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        No components mapped to this rack location yet. Assign items to this rack in the <strong>"Visual Shelving"</strong> view.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {stored.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-900 dark:text-white truncate">{item.name}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] shrink-0">
                              {item.stockQty} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
