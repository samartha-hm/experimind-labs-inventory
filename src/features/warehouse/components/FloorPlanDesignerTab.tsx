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
  Tag,
  Search,
  Wrench,
  Cpu,
  Zap,
  RotateCcw,
  Link,
  PlusCircle,
  Settings2
} from 'lucide-react';
import { useData } from '@/src/DataContext';
import { useToast } from '@/src/contexts/ToastContext';

export interface FloorPlanElement {
  id: string;
  type: string;
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

export interface PaletteTemplate {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  linkedRackCode?: string;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  color: string;
  zone?: string;
  notes?: string;
}

export interface CustomElementType {
  key: string;
  label: string;
  iconEmoji: string;
  defaultColor: string;
}

const DEFAULT_ELEMENT_TYPES: CustomElementType[] = [
  { key: 'rack', label: 'Steel Shelving Rack', iconEmoji: '🏗️', defaultColor: '#3b82f6' },
  { key: 'plywood_grid', label: 'Plywood Pigeonhole Matrix', iconEmoji: '🪵', defaultColor: '#d97706' },
  { key: 'cabinet', label: 'Chemical / Safety Cabinet', iconEmoji: '🗄️', defaultColor: '#ef4444' },
  { key: 'workbench', label: 'Assembly & Packing Workbench', iconEmoji: '📦', defaultColor: '#10b981' },
  { key: 'equipment', label: 'Lab & Diagnostic Equipment', iconEmoji: '🔬', defaultColor: '#06b6d4' },
  { key: 'machinery', label: '3D Printer / Laser CNC Farm', iconEmoji: '🤖', defaultColor: '#8b5cf6' },
  { key: 'conveyor', label: 'Automated Conveyor Lane', iconEmoji: '🔄', defaultColor: '#14b8a6' },
  { key: 'charging', label: 'Battery / AGV Charging Bay', iconEmoji: '🔋', defaultColor: '#eab308' },
  { key: 'dock_inbound', label: 'Inbound Receiving Dock', iconEmoji: '🚚', defaultColor: '#6366f1' },
  { key: 'dock_outbound', label: 'Outbound Dispatch Dock', iconEmoji: '📤', defaultColor: '#ec4899' },
  { key: 'door', label: 'Personnel Entry / Fire Exit', iconEmoji: '🚪', defaultColor: '#64748b' },
  { key: 'hazmat_zone', label: 'Hazardous Secondary Staging', iconEmoji: '🚧', defaultColor: '#f59e0b' }
];

const DEFAULT_PALETTE_TEMPLATES: PaletteTemplate[] = [
  {
    id: 'tmpl_01',
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
    id: 'tmpl_02',
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
    id: 'tmpl_03',
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
    id: 'tmpl_04',
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
    id: 'tmpl_05',
    type: 'equipment',
    label: '🔬 PCB SMT Soldering & Test Station',
    sublabel: 'Microcontroller Programming',
    width: 200,
    height: 90,
    rotation: 0,
    color: '#06b6d4',
    zone: 'Cleanroom Lab',
    notes: 'Soldering iron, hot air rework, oscilloscope'
  },
  {
    id: 'tmpl_06',
    type: 'machinery',
    label: '🤖 3D Printer & Laser CNC Farm',
    sublabel: 'Rapid Prototyping Bay',
    width: 210,
    height: 95,
    rotation: 0,
    color: '#8b5cf6',
    zone: 'Maker Lab',
    notes: 'Additive manufacturing enclosure'
  },
  {
    id: 'tmpl_07',
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
    id: 'tmpl_08',
    type: 'dock_outbound',
    label: '📤 Outbound Dispatch Dock',
    sublabel: 'Courier & Freight Staging',
    width: 210,
    height: 90,
    rotation: 0,
    color: '#ec4899',
    zone: 'Dispatch Bay',
    notes: 'Outbound kit shipping and courier handoff'
  },
  {
    id: 'tmpl_09',
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
    id: 'tmpl_10',
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
      color: '#ec4899',
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

const COLOR_PRESETS = [
  { label: 'Blue (Rack)', value: '#3b82f6' },
  { label: 'Woodgrain (Plywood)', value: '#d97706' },
  { label: 'Emerald (Workbench)', value: '#10b981' },
  { label: 'Cyan (Lab/Electronics)', value: '#06b6d4' },
  { label: 'Purple (CNC/Equipment)', value: '#8b5cf6' },
  { label: 'Rose (Safety/Chemical)', value: '#ef4444' },
  { label: 'Indigo (Inbound)', value: '#6366f1' },
  { label: 'Pink (Dispatch)', value: '#ec4899' },
  { label: 'Amber (Hazmat)', value: '#f59e0b' },
  { label: 'Slate (Doors/Walls)', value: '#64748b' },
];

export default function FloorPlanDesignerTab() {
  const { warehouses, inventory, bins } = useData();
  const { showToast } = useToast();

  const [selectedWhCode, setSelectedWhCode] = useState<string>(warehouses[0]?.code || 'WH-MAIN-01');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isHeatmapMode, setIsHeatmapMode] = useState<boolean>(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isEditingElementModal, setIsEditingElementModal] = useState<boolean>(false);

  // 1. DYNAMIC SYSTEM ASSETS DISCOVERY
  // Read all physical racks configured in the system (from VisualStockRoom)
  const systemPhysicalRacks = useMemo(() => {
    try {
      const saved = localStorage.getItem('experimind_custom_physical_racks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { id: 'rack-01', code: 'RACK-01', name: 'Rack 1 — Main Assembly & Science Lab Shelf', zone: 'Zone A (High Velocity)', type: 'steel_shelf' },
      { id: 'ply-01', code: 'PLY-01', name: 'Plywood Unit 1 — 🪵 Plywood Pigeonhole Matrix', zone: 'Zone B (Hardware)', type: 'plywood_grid' },
      { id: 'rack-02', code: 'RACK-02', name: 'Rack 2 — Electronics & Sensor Cleanroom', zone: 'Zone B (ESD Safe)', type: 'steel_shelf' },
      { id: 'cab-01', code: 'CAB-01', name: 'Cabinet A — Chemical & Safety Storage Cabinet', zone: 'Zone C (Hazmat Light)', type: 'cabinet' },
    ];
  }, []);

  // Gather all unique facility zones from warehouses, bins, and racks
  const availableFacilityZones = useMemo(() => {
    const zones = new Set<string>();
    zones.add('Zone A (High Velocity)');
    zones.add('Zone B (Hardware / Small Parts)');
    zones.add('Zone C (Hazmat Light)');
    zones.add('Production & Assembly Line');
    zones.add('Cleanroom Lab');
    zones.add('Receiving Bay');
    zones.add('Dispatch Bay');
    zones.add('Perimeter & Security');

    systemPhysicalRacks.forEach((r: any) => { if (r.zone) zones.add(r.zone); });
    bins.forEach(b => {
      if (b.description && b.description.includes('Zone')) zones.add(b.description);
    });
    return Array.from(zones);
  }, [systemPhysicalRacks, bins]);

  // 2. CUSTOM ELEMENT TYPES STATE
  const [elementTypes, setElementTypes] = useState<CustomElementType[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_custom_element_types_v2');
      return saved ? JSON.parse(saved) : DEFAULT_ELEMENT_TYPES;
    } catch (_) {
      return DEFAULT_ELEMENT_TYPES;
    }
  });

  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('🔬');
  const [newTypeColor, setNewTypeColor] = useState('#06b6d4');

  const handleSaveCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const key = `custom_${Date.now()}`;
    const newType: CustomElementType = {
      key,
      label: newTypeName.trim(),
      iconEmoji: newTypeEmoji.trim() || '📦',
      defaultColor: newTypeColor,
    };
    const updated = [...elementTypes, newType];
    setElementTypes(updated);
    try {
      localStorage.setItem('experimind_custom_element_types_v2', JSON.stringify(updated));
    } catch (_) {}

    setTemplateType(key);
    setTemplateColor(newTypeColor);
    setIsNewTypeModalOpen(false);
    setNewTypeName('');
    showToast('success', 'Custom Element Type Created', `Added "${newType.iconEmoji} ${newType.label}" to categories.`);
  };

  // 3. PALETTE TEMPLATES STATE (Customizable & Editable)
  const [paletteTemplates, setPaletteTemplates] = useState<PaletteTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('experimind_custom_spatial_palette_v3');
      return saved ? JSON.parse(saved) : DEFAULT_PALETTE_TEMPLATES;
    } catch (_) {
      return DEFAULT_PALETTE_TEMPLATES;
    }
  });

  const savePaletteTemplates = (newTemplates: PaletteTemplate[]) => {
    setPaletteTemplates(newTemplates);
    try {
      localStorage.setItem('experimind_custom_spatial_palette_v3', JSON.stringify(newTemplates));
    } catch (_) {}
  };

  // Palette Template Modal State (Add or Edit)
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PaletteTemplate | null>(null);
  const [templateLabel, setTemplateLabel] = useState('');
  const [templateSublabel, setTemplateSublabel] = useState('');
  const [templateType, setTemplateType] = useState<string>('rack');
  const [templateColor, setTemplateColor] = useState('#3b82f6');
  const [templateZone, setTemplateZone] = useState('Zone A (High Velocity)');
  const [templateWidth, setTemplateWidth] = useState(220);
  const [templateHeight, setTemplateHeight] = useState(100);
  const [templateLinkedRack, setTemplateLinkedRack] = useState('');

  // Palette Search Filter
  const [paletteSearch, setPaletteSearch] = useState('');

  // Edit element on canvas form
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
      if (label.toLowerCase().includes('rack 2')) searchTerms.push('bin');
    }

    return inventory.filter(item => {
      const bin = (item.binLocation || '').toLowerCase();
      return searchTerms.some(term => bin.includes(term));
    });
  };

  // Add Element from Palette to Canvas
  const handleAddElement = (template: PaletteTemplate) => {
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

  // Auto-fill template when linking to a physical storage rack
  const handleSelectLinkedRack = (rackCode: string) => {
    setTemplateLinkedRack(rackCode);
    if (!rackCode) return;

    const target = systemPhysicalRacks.find((r: any) => r.code === rackCode);
    if (target) {
      if (!templateLabel || templateLabel.startsWith('Rack') || templateLabel.startsWith('Plywood') || templateLabel.startsWith('Cabinet')) {
        setTemplateLabel(target.name);
      }
      setTemplateZone(target.zone || 'Zone A (General)');
      if (target.type === 'steel_shelf') setTemplateType('rack');
      else if (target.type === 'plywood_grid') setTemplateType('plywood_grid');
      else if (target.type === 'cabinet') setTemplateType('cabinet');
    }
  };

  // Open Template Modal (Create New or Edit)
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateLabel('');
    setTemplateSublabel('');
    setTemplateType('rack');
    setTemplateColor('#3b82f6');
    setTemplateZone('Zone A (High Velocity)');
    setTemplateWidth(220);
    setTemplateHeight(100);
    setTemplateLinkedRack('');
    setIsPaletteModalOpen(true);
  };

  const handleOpenEditTemplate = (e: React.MouseEvent, tmpl: PaletteTemplate) => {
    e.stopPropagation();
    setEditingTemplate(tmpl);
    setTemplateLabel(tmpl.label);
    setTemplateSublabel(tmpl.sublabel || '');
    setTemplateType(tmpl.type);
    setTemplateColor(tmpl.color || '#3b82f6');
    setTemplateZone(tmpl.zone || 'Zone A (High Velocity)');
    setTemplateWidth(tmpl.width || 220);
    setTemplateHeight(tmpl.height || 100);
    setTemplateLinkedRack(tmpl.linkedRackCode || '');
    setIsPaletteModalOpen(true);
  };

  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm('Delete this template from the spatial palette?')) {
      const updated = paletteTemplates.filter(t => t.id !== templateId);
      savePaletteTemplates(updated);
      showToast('info', 'Template Removed', 'Removed item from the spatial palette.');
    }
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateLabel.trim()) return;

    if (editingTemplate) {
      const updated = paletteTemplates.map(t =>
        t.id === editingTemplate.id
          ? {
              ...t,
              label: templateLabel.trim(),
              sublabel: templateSublabel.trim(),
              type: templateType,
              color: templateColor,
              zone: templateZone.trim(),
              width: Number(templateWidth) || 220,
              height: Number(templateHeight) || 100,
              linkedRackCode: templateLinkedRack.trim(),
            }
          : t
      );
      savePaletteTemplates(updated);
      showToast('success', 'Template Updated', `Updated palette template "${templateLabel}".`);
    } else {
      const newTmpl: PaletteTemplate = {
        id: `tmpl_${Date.now()}`,
        label: templateLabel.trim(),
        sublabel: templateSublabel.trim(),
        type: templateType,
        color: templateColor,
        zone: templateZone.trim(),
        width: Number(templateWidth) || 220,
        height: Number(templateHeight) || 100,
        rotation: 0,
        linkedRackCode: templateLinkedRack.trim(),
      };
      savePaletteTemplates([...paletteTemplates, newTmpl]);
      showToast('success', 'Template Created', `Added "${templateLabel}" to the spatial palette!`);
    }
    setIsPaletteModalOpen(false);
  };

  const handleResetPalette = () => {
    if (confirm('Reset the spatial element palette back to default templates?')) {
      savePaletteTemplates(DEFAULT_PALETTE_TEMPLATES);
      showToast('success', 'Palette Reset', 'Restored default spatial element templates.');
    }
  };

  // Rotate Element on Canvas
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

  // Delete Element from Canvas
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter(e => e.id !== selectedElementId);
    saveFloorPlan(updated);
    setSelectedElementId(null);
    showToast('info', 'Element Removed', 'Removed element from floor plan.');
  };

  // Open Canvas Element Edit Dialog
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

  const filteredPalette = useMemo(() => {
    if (!paletteSearch.trim()) return paletteTemplates;
    return paletteTemplates.filter(t =>
      t.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      (t.sublabel && t.sublabel.toLowerCase().includes(paletteSearch.toLowerCase())) ||
      (t.zone && t.zone.toLowerCase().includes(paletteSearch.toLowerCase()))
    );
  }, [paletteTemplates, paletteSearch]);

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
                Top-down spatial blueprint connected to live facilities, storage racks, and custom equipment categories.
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
        
        {/* Left 4 Cols: Spatial Element Palette & Quick Templates */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Spatial Palette Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-600" />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Spatial Element Palette ({paletteTemplates.length})
                </h3>
              </div>

              {/* ➕ Add Custom Spatial Element to Palette */}
              <button
                onClick={handleOpenCreateTemplate}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                title="Create a new custom spatial template"
              >
                <Plus className="w-3.5 h-3.5" /> + New Element
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Connected to <strong>{systemPhysicalRacks.length} Storage Units</strong> & <strong>{availableFacilityZones.length} Zones</strong>:
            </p>

            {/* Palette Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search spatial templates, equipment, or zones..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {/* Scrollable Templates List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredPalette.map((tmpl) => {
                const typeObj = elementTypes.find(t => t.key === tmpl.type);
                const emoji = typeObj ? typeObj.iconEmoji : '📦';

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleAddElement(tmpl)}
                    className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 text-left transition-all cursor-pointer flex items-center justify-between group relative"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-4 h-4 rounded-md shrink-0 shadow-xs flex items-center justify-center text-[10px]"
                        style={{ backgroundColor: tmpl.color }}
                      >
                        {emoji}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                          {tmpl.label}
                        </span>
                        {tmpl.sublabel && (
                          <span className="text-[10px] text-slate-400 block truncate">{tmpl.sublabel}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit, Delete, Place */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleOpenEditTemplate(e, tmpl)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit this palette template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete this template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="p-1 text-indigo-600 dark:text-indigo-400">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPalette.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No templates match your search. Click "+ New Element" above to create one.
                </div>
              )}
            </div>

            {/* Reset Palette button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">Customized Palette</span>
              <button
                onClick={handleResetPalette}
                className="text-slate-400 hover:text-amber-500 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
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

        {/* Center/Right 8 Cols: Interactive Blueprint Canvas & Inspector Drawer */}
        <div className="lg:col-span-8 space-y-4">
          
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

      {/* ========================================================================= */}
      {/* 1. PALETTE TEMPLATE CREATOR / EDITOR MODAL WITH SYSTEM CONNECTIONS */}
      {/* ========================================================================= */}
      {isPaletteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingTemplate ? 'Edit Spatial Palette Template' : 'Create New Spatial Palette Element'}
                </h3>
              </div>
              <button
                onClick={() => setIsPaletteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-xs">
              
              {/* SYSTEM CONNECTION: LINK TO PHYSICAL STORAGE RACK */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-1.5">
                <label className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-900 dark:text-indigo-200">
                  <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Link to Physical System Storage Unit (Auto-Configures Name & Zone)
                </label>
                <select
                  value={templateLinkedRack}
                  onChange={(e) => handleSelectLinkedRack(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- Standalone Infrastructure / Equipment (No physical rack link) --</option>
                  {systemPhysicalRacks.map((rack: any) => (
                    <option key={rack.id || rack.code} value={rack.code}>
                      {rack.name} ({rack.code}) • {rack.zone || 'Zone A'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                  Linking automatically binds the rack's real-time parts inventory count and compartment location.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Element Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🔬 Optical Sensor Testing Bay"
                  value={templateLabel}
                  onChange={(e) => setTemplateLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtitle / Equipment Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Spectrometer & Lux Meter Bench"
                  value={templateSublabel}
                  onChange={(e) => setTemplateSublabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* ELEMENT TYPE WITH CUSTOM TYPE CREATOR */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Element Category / Type</label>
                    <button
                      type="button"
                      onClick={() => setIsNewTypeModalOpen(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> + New Type
                    </button>
                  </div>
                  <select
                    value={templateType}
                    onChange={(e) => {
                      setTemplateType(e.target.value);
                      const found = elementTypes.find(t => t.key === e.target.value);
                      if (found) setTemplateColor(found.defaultColor);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    {elementTypes.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.iconEmoji} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FACILITY ZONE WITH AUTOCOMPLETE LIST */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Facility Zone</label>
                  <input
                    type="text"
                    list="facility-zones-datalist"
                    placeholder="e.g. Zone A (High Velocity)"
                    value={templateZone}
                    onChange={(e) => setTemplateZone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                  <datalist id="facility-zones-datalist">
                    {availableFacilityZones.map((z, idx) => (
                      <option key={idx} value={z} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* QUICK SELECT AVAILABLE ZONES PILLS */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Quick Assign Existing Zone:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableFacilityZones.slice(0, 5).map((z, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTemplateZone(z)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        templateZone === z
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Theme Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setTemplateColor(preset.value)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        templateColor === preset.value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.label}
                    >
                      {templateColor === preset.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Default Width (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    step={10}
                    value={templateWidth}
                    onChange={(e) => setTemplateWidth(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Default Height (px)</label>
                  <input
                    type="number"
                    min={40}
                    max={400}
                    step={10}
                    value={templateHeight}
                    onChange={(e) => setTemplateHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaletteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editingTemplate ? 'Save Template Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOM ELEMENT TYPE CREATOR MODAL */}
      {/* ========================================================================= */}
      {isNewTypeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[10000] animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Define Custom Element Category
              </h3>
              <button
                onClick={() => setIsNewTypeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomType} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category / Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cryogenic Freezer, Laser CNC Chamber..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Icon / Emoji</label>
                <input
                  type="text"
                  placeholder="e.g. ❄️, 🤖, 🧪, 📡, 🦺"
                  value={newTypeEmoji}
                  onChange={(e) => setNewTypeEmoji(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Default Category Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setNewTypeColor(preset.value)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        newTypeColor === preset.value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.label}
                    >
                      {newTypeColor === preset.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTypeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Category Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CANVAS ELEMENT PROPERTIES MODAL */}
      {/* ========================================================================= */}
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Warehouse Zone</label>
                <input
                  type="text"
                  list="canvas-facility-zones-datalist"
                  placeholder="e.g. Zone A (High Velocity)"
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <datalist id="canvas-facility-zones-datalist">
                  {availableFacilityZones.map((z, idx) => (
                    <option key={idx} value={z} />
                  ))}
                </datalist>
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
