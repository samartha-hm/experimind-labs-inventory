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
  Edit2,
  Tag
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

export interface FloorPlanElement {
  id: string;
  type: 'rack' | 'plywood_grid' | 'cabinet' | 'workbench' | 'dock_inbound' | 'dock_outbound' | 'door' | 'pathway' | 'hazmat_zone';
  label: string;
  sublabel?: string;
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
    label: 'Rack 1 — Main Steel Shelf',
    sublabel: 'Science & Lab Storage',
    linkedRackCode: 'RACK-01',
    width: 220,
    height: 100,
    rotation: 0,
    color: '#3b82f6',
    zone: 'Zone A (High Velocity)',
    notes: 'Multi-tier steel shelving rack for plastic totes'
  },
  {
    type: 'plywood_grid',
    label: '🪵 Plywood Pigeonhole Matrix',
    sublabel: 'Hardware & Fastener Cubbies',
    linkedRackCode: 'PLY-01',
    width: 220,
    height: 100,
    rotation: 0,
    color: '#d97706',
    zone: 'Zone B (Hardware)',
    notes: 'Rectangular wooden box matrix organizer'
  },
  {
    type: 'cabinet',
    label: '🗄️ Chemical Safety Cabinet',
    sublabel: 'Hazmat & Battery Storage',
    linkedRackCode: 'CAB-01',
    width: 190,
    height: 95,
    rotation: 0,
    color: '#ef4444',
    zone: 'Zone C (Hazmat)',
    notes: 'Enclosed flame-retardant storage cabinet'
  },
  {
    type: 'workbench',
    label: '📦 ESD Assembly Workbench',
    sublabel: 'Soldering & QC Inspection',
    width: 200,
    height: 90,
    rotation: 0,
    color: '#10b981',
    zone: 'Assembly Line',
    notes: 'Static-dissipative ESD packing workbench'
  },
  {
    type: 'dock_inbound',
    label: '🚚 Inbound Receiving Dock',
    sublabel: 'Pallet Staging & Unloading',
    width: 210,
    height: 90,
    rotation: 0,
    color: '#6366f1',
    zone: 'Receiving Bay',
    notes: 'Freight pallet receiving and intake inspection'
  },
  {
    type: 'dock_outbound',
    label: '📤 Outbound Dispatch Dock',
    sublabel: 'Courier & Freight Staging',
    width: 210,
    height: 90,
    rotation: 0,
    color: '#8b5cf6',
    zone: 'Dispatch Bay',
    notes: 'Outbound kit shipping and courier handoff'
  },
  {
    type: 'door',
    label: '🚪 Personnel Entry / Fire Exit',
    sublabel: 'Security RFID Access',
    width: 130,
    height: 45,
    rotation: 0,
    color: '#64748b',
    zone: 'Perimeter',
    notes: 'Personnel security access door'
  },
  {
    type: 'hazmat_zone',
    label: '🚧 Hazardous Secondary Staging',
    sublabel: 'Chemical Spill Containment',
    width: 180,
    height: 100,
    rotation: 0,
    color: '#f59e0b',
    zone: 'Safety Zone',
    notes: 'Secondary chemical spill containment perimeter'
  }
];

const DEFAULT_FLOOR_PLANS: Record<string, FloorPlanElement[]> = {
  'WH-MAIN-01': [
    {
      id: 'fp_01',
      type: 'dock_inbound',
      label: '🚚 Inbound Receiving Dock',
      sublabel: 'Intake Inspection Bay',
      x: 40,
      y: 40,
      width: 210,
      height: 100,
      rotation: 0,
      color: '#6366f1',
      zone: 'Inbound'
    },
    {
      id: 'fp_02',
      type: 'rack',
      label: 'Rack 1 — Main Steel Shelf',
      sublabel: 'Science & Lab Storage',
      linkedRackCode: 'RACK-01',
      x: 290,
      y: 40,
      width: 220,
      height: 100,
      rotation: 0,
      color: '#3b82f6',
      zone: 'Zone A (High Velocity)'
    },
    {
      id: 'fp_03',
      type: 'plywood_grid',
      label: 'Plywood Unit 1 — 🪵 Pigeonhole',
      sublabel: 'Hardware & Screws Grid',
      linkedRackCode: 'PLY-01',
      x: 550,
      y: 40,
      width: 230,
      height: 100,
      rotation: 0,
      color: '#d97706',
      zone: 'Zone B (Hardware)'
    },
    {
      id: 'fp_04',
      type: 'cabinet',
      label: 'Cabinet A — Chemical Safety',
      sublabel: 'Flammables & Batteries',
      linkedRackCode: 'CAB-01',
      x: 820,
      y: 40,
      width: 200,
      height: 100,
      rotation: 0,
      color: '#ef4444',
      zone: 'Zone C (Hazmat)'
    },
    {
      id: 'fp_05',
      type: 'workbench',
      label: '📦 ESD Assembly Table 1',
      sublabel: 'Kit Packing Station',
      x: 290,
      y: 190,
      width: 220,
      height: 90,
      rotation: 0,
      color: '#10b981',
      zone: 'Assembly Line'
    },
    {
      id: 'fp_06',
      type: 'workbench',
      label: '📦 ESD Assembly Table 2',
      sublabel: 'Quality Control & Testing',
      x: 550,
      y: 190,
      width: 230,
      height: 90,
      rotation: 0,
      color: '#10b981',
      zone: 'Assembly Line'
    },
    {
      id: 'fp_07',
      type: 'dock_outbound',
      label: '📤 Outbound Dispatch Dock',
      sublabel: 'Courier & Freight Staging',
      x: 820,
      y: 190,
      width: 200,
      height: 90,
      rotation: 0,
      color: '#8b5cf6',
      zone: 'Dispatch Bay'
    },
    {
      id: 'fp_08',
      type: 'door',
      label: '🚪 Main Security Entrance',
      sublabel: 'RFID Badge Turnstile',
      x: 40,
      y: 240,
      width: 180,
      height: 45,
      rotation: 0,
      color: '#64748b',
      zone: 'Perimeter'
    }
  ]
};

export default function FloorPlanDesignerTab() {
  const { warehouses, inventory, bins } = useData();
  const { showToast } = useToast();

  const [selectedWhCode, setSelectedWhCode] = useState<string>(warehouses[0]?.code || 'WH-MAIN-01');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isHeatmapMode, setIsHeatmapMode] = useState<boolean>(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isEditingElementModal, setIsEditingElementModal] = useState<boolean>(false);

  // Edit element form
  const [editLabel, setEditLabel] = useState('');
  const [editSublabel, setEditSublabel] = useState('');
  const [editZone, setEditZone] = useState('');
  const [editWidth, setEditWidth] = useState(200);
  const [editHeight, setEditHeight] = useState(100);

  // Dragging Canvas State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Floor Plan Elements State
  const [elements, setElements] = useState<FloorPlanElement[]>(() => {
    try {
      const saved = localStorage.getItem(`experimind_floorplan_v3_${selectedWhCode}`);
      return saved ? JSON.parse(saved) : (DEFAULT_FLOOR_PLANS[selectedWhCode] || DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || []);
    } catch (_) {
      return DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || [];
    }
  });

  // Switch Warehouse Layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`experimind_floorplan_v3_${selectedWhCode}`);
      if (saved) {
        setElements(JSON.parse(saved));
      } else if (DEFAULT_FLOOR_PLANS[selectedWhCode]) {
        setElements(DEFAULT_FLOOR_PLANS[selectedWhCode]);
      } else {
        setElements(DEFAULT_FLOOR_PLANS['WH-MAIN-01'] || []);
      }
      setSelectedElementId(null);
    } catch (_) {}
  }, [selectedWhCode]);

  // Persist Layout changes
  const saveFloorPlan = (newElements: FloorPlanElement[]) => {
    setElements(newElements);
    try {
      localStorage.setItem(`experimind_floorplan_v3_${selectedWhCode}`, JSON.stringify(newElements));
    } catch (_) {}
  };

  const selectedElement = useMemo(() => {
    return elements.find(e => e.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Map parts count for linked racks
  const getRackStoredItems = (linkedCode?: string, label?: string) => {
    const searchTerms: string[] = [];
    if (linkedCode) searchTerms.push(linkedCode.toLowerCase());
    if (label) {
      if (label.toLowerCase().includes('rack 1')) searchTerms.push('rack');
      if (label.toLowerCase().includes('plywood')) searchTerms.push('ply');
      if (label.toLowerCase().includes('cabinet')) searchTerms.push('chemical', 'cab');
    }

    return inventory.filter(item => {
      const bin = (item.binLocation || '').toLowerCase();
      return searchTerms.some(term => bin.includes(term));
    });
  };

  // Add Element from Palette
  const handleAddElement = (template: typeof PALETTE_TEMPLATES[0]) => {
    const newEl: FloorPlanElement = {
      ...template,
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      x: 60 + (elements.length % 4) * 50,
      y: 60 + (elements.length % 4) * 40,
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

  // Open Edit Dialog
  const handleOpenEditModal = () => {
    if (!selectedElement) return;
    setEditLabel(selectedElement.label);
    setEditSublabel(selectedElement.sublabel || '');
    setEditZone(selectedElement.zone || '');
    setEditWidth(selectedElement.width);
    setEditHeight(selectedElement.height);
    setIsEditingElementModal(true);
  };

  const handleSaveEditElement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElementId) return;
    const updated = elements.map(el => {
      if (el.id === selectedElementId) {
        return {
          ...el,
          label: editLabel.trim(),
          sublabel: editSublabel.trim(),
          zone: editZone.trim(),
          width: Number(editWidth) || 200,
          height: Number(editHeight) || 100,
        };
      }
      return el;
    });
    saveFloorPlan(updated);
    setIsEditingElementModal(false);
    showToast('success', 'Properties Updated', 'Updated spatial element dimensions and labels.');
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
    if (confirm('Load pre-configured template? Current layout will be reset to the optimized blueprint.')) {
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
                Top-down spatial blueprint. Drag and position storage racks, pigeonhole matrixes, packing benches, and docks.
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
            className="px-3.5 py-2 min-w-[200px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
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
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                        {tmpl.label}
                      </span>
                      {tmpl.sublabel && (
                        <span className="text-[10px] text-slate-400 block truncate">{tmpl.sublabel}</span>
                      )}
                    </div>
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
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reset to Optimized Blueprint
            </button>
          </div>
        </div>

        {/* Center/Right 9 Cols: Interactive Blueprint Canvas & Inspector Drawer */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Active Canvas Action Toolbar (When Element Selected) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-400 font-medium truncate">
                {selectedElement ? (
                  <>Selected: <strong className="text-slate-900 dark:text-white font-bold">{selectedElement.label}</strong> (X: {selectedElement.x}px, Y: {selectedElement.y}px • {selectedElement.width}×{selectedElement.height}px)</>
                ) : (
                  'Click any element on the floor plan to drag, rotate, resize, or inspect stored components.'
                )}
              </span>
            </div>

            {selectedElement && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleOpenEditModal}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-500" /> Edit Properties
                </button>

                <button
                  onClick={handleRotateSelected}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500" /> Rotate ({selectedElement.rotation}°)
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
            className="bg-slate-950 rounded-3xl border-2 border-slate-800 shadow-2xl relative overflow-hidden h-[560px] cursor-crosshair"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          >
            {/* Warehouse Facility Title Watermark */}
            <div className="absolute top-4 left-4 pointer-events-none opacity-40 select-none">
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
                const storedItems = getRackStoredItems(el.linkedRackCode, el.label);
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
                      borderColor: isSelected ? '#60a5fa' : `${displayColor}aa`,
                    }}
                    className={`absolute rounded-2xl border-2 transition-all flex flex-col justify-between p-2.5 cursor-grab active:cursor-grabbing group shadow-xl backdrop-blur-md overflow-hidden select-none ${
                      isSelected
                        ? 'bg-slate-900/95 ring-2 ring-indigo-400 shadow-2xl z-30'
                        : 'bg-slate-900/85 z-10 hover:border-slate-200 hover:bg-slate-900/95'
                    }`}
                  >
                    {/* Top Color Accent Line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: displayColor }}
                    />

                    {/* Element Header & Label (Safely Clamped) */}
                    <div className="w-full overflow-hidden text-left space-y-0.5 mt-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="font-black text-[11px] uppercase tracking-tight truncate block drop-shadow-sm"
                          style={{ color: displayColor }}
                          title={el.label}
                        >
                          {el.label}
                        </span>
                        {el.rotation > 0 && (
                          <span className="text-[8px] font-mono text-slate-500 shrink-0">
                            {el.rotation}°
                          </span>
                        )}
                      </div>

                      {el.sublabel && (
                        <span className="text-[9px] text-slate-400 block truncate font-medium">
                          {el.sublabel}
                        </span>
                      )}
                    </div>

                    {/* Center / Bottom Info Bar */}
                    <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80 text-[9px] font-mono">
                      <span className="text-slate-300 font-bold px-1.5 py-0.2 rounded bg-slate-800/80 shrink-0">
                        {storedItems.length} SKUs
                      </span>

                      {el.zone && (
                        <span className="text-slate-400 truncate max-w-[95px] text-right font-medium">
                          {el.zone}
                        </span>
                      )}
                    </div>
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

                <button
                  onClick={handleOpenEditModal}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Dimensions & Label
                </button>
              </div>

              {/* Items in this physical unit */}
              {(() => {
                const stored = getRackStoredItems(selectedElement.linkedRackCode, selectedElement.label);
                return (
                  <div className="space-y-2">
                    {stored.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        No components mapped to this rack location yet. Assign items to this rack in the <strong>"Visual Shelving Matrix"</strong> view.
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

      {/* EDIT ELEMENT PROPERTIES MODAL */}
      {isEditingElementModal && selectedElement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Spatial Element Properties
              </h3>
              <button
                onClick={() => setIsEditingElementModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditElement} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Primary Label *</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtitle / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Science Lab Components"
                  value={editSublabel}
                  onChange={(e) => setEditSublabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Warehouse Zone</label>
                <input
                  type="text"
                  placeholder="e.g. Zone A (High Velocity)"
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Width (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    step={10}
                    value={editWidth}
                    onChange={(e) => setEditWidth(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Height (px)</label>
                  <input
                    type="number"
                    min={40}
                    max={400}
                    step={10}
                    value={editHeight}
                    onChange={(e) => setEditHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingElementModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
