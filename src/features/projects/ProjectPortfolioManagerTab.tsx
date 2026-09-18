import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  Package,
  Wrench,
  FlaskConical,
  Scissors,
  Printer,
  ShoppingCart,
  Building2,
  Tag,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  Project,
  ProjectCategory,
  ProjectStatus,
  ProjectClassWork,
  ProjectWorkItem,
  WorkItemCategory,
  WorkItemSourcingChannel,
  WorkItemStatus,
  ProjectExpense
} from '../../data/projectsDataset';
import {
  ProjectManagementService,
  ProjectFinancials,
  PortfolioSummary,
  InventoryConflictItem
} from '../../services/ProjectManagementService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../AuthContext';

interface ProjectPortfolioManagerTabProps {
  onNavigateToTab?: (tabId: string, params?: any) => void;
}

export default function ProjectPortfolioManagerTab({ onNavigateToTab }: ProjectPortfolioManagerTabProps = {}) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Core State
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeClassId, setActiveClassId] = useState<string>('');

  // Filters for Project Roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'ALL'>('ALL');

  // Filters for Class Items
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [selectedItemCategory, setSelectedItemCategory] = useState<WorkItemCategory | 'ALL'>('ALL');
  const [selectedItemSourcing, setSelectedItemSourcing] = useState<WorkItemSourcingChannel | 'ALL'>('ALL');
  const [selectedItemStatus, setSelectedItemStatus] = useState<WorkItemStatus | 'ALL'>('ALL');

  // Modals
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState<boolean>(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState<boolean>(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);
  const [isAddEditItemModalOpen, setIsAddEditItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProjectWorkItem | null>(null);

  // New Project Form State
  const [templateType, setTemplateType] = useState<'CURRICULUM' | 'STANDARD_LAB' | 'BLANK'>('CURRICULUM');
  const [projectFormCode, setProjectFormCode] = useState<string>('');
  const [projectFormName, setProjectFormName] = useState<string>('');
  const [projectFormClient, setProjectFormClient] = useState<string>('');
  const [projectFormCategory, setProjectFormCategory] = useState<ProjectCategory>('STEM_CURRICULUM');
  const [projectFormLead, setProjectFormLead] = useState<string>('Dr. Samartha HM');
  const [projectFormAssignedBy, setProjectFormAssignedBy] = useState<string>('Operations Director');
  const [projectFormPriority, setProjectFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [projectFormStatus, setProjectFormStatus] = useState<ProjectStatus>('PLANNING');
  const [projectFormStartDate, setProjectFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [projectFormDeliveryDate, setProjectFormDeliveryDate] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [projectFormBatchMultiplier, setProjectFormBatchMultiplier] = useState<number>(1);
  const [projectFormBudget, setProjectFormBudget] = useState<string>('');
  const [projectFormRevenue, setProjectFormRevenue] = useState<string>('');
  const [projectFormDesc, setProjectFormDesc] = useState<string>('');

  // Class Form State
  const [newClassName, setNewClassName] = useState<string>('Class 6');
  const [newClassDesc, setNewClassDesc] = useState<string>('');
  const [newClassBatchMultiplier, setNewClassBatchMultiplier] = useState<number>(1);

  // Work Item Form State
  const [itemFormName, setItemFormName] = useState<string>('');
  const [itemFormCategory, setItemFormCategory] = useState<WorkItemCategory>('ACTIVITY_KIT');
  const [itemFormSpec, setItemFormSpec] = useState<string>('');
  const [itemFormQty, setItemFormQty] = useState<number>(1);
  const [itemFormUnit, setItemFormUnit] = useState<string>('pcs');
  const [itemFormSourcing, setItemFormSourcing] = useState<WorkItemSourcingChannel>('BUY_LOCAL');
  const [itemFormStatus, setItemFormStatus] = useState<WorkItemStatus>('PENDING');
  const [itemFormCost, setItemFormCost] = useState<string>('');
  const [itemFormAssignee, setItemFormAssignee] = useState<string>('Ravi Kumar (Lead Tech)');
  const [itemFormChapter, setItemFormChapter] = useState<string>('');
  const [itemFormNotes, setItemFormNotes] = useState<string>('');

  // Selected Project & Sync
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Set active class when selected project changes
  useEffect(() => {
    if (selectedProject && selectedProject.classes && selectedProject.classes.length > 0) {
      if (!activeClassId || !selectedProject.classes.some(c => c.id === activeClassId)) {
        setActiveClassId(selectedProject.classes[0].id);
      }
    } else {
      setActiveClassId('');
    }
  }, [selectedProject, activeClassId]);

  const activeClass = useMemo(() => {
    if (!selectedProject || !selectedProject.classes) return null;
    return selectedProject.classes.find(c => c.id === activeClassId) || selectedProject.classes[0] || null;
  }, [selectedProject, activeClassId]);

  const selectedFinancials: ProjectFinancials | null = useMemo(() => {
    if (!selectedProject) return null;
    return ProjectManagementService.getProjectFinancials(selectedProject.id);
  }, [selectedProject]);

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    return ProjectManagementService.getPortfolioSummary();
  }, [projects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.leadUserName.toLowerCase().includes(q) ||
          (p.assignedBy && p.assignedBy.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, selectedCategory, selectedStatus, searchQuery]);

  // Filtered Class Work Items
  const filteredClassItems = useMemo(() => {
    if (!activeClass || !activeClass.items) return [];
    return activeClass.items.filter(item => {
      if (selectedItemCategory !== 'ALL' && item.category !== selectedItemCategory) return false;
      if (selectedItemSourcing !== 'ALL' && item.sourcingChannel !== selectedItemSourcing) return false;
      if (selectedItemStatus !== 'ALL' && item.status !== selectedItemStatus) return false;
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          item.specification.toLowerCase().includes(q) ||
          (item.sourceChapter && item.sourceChapter.toLowerCase().includes(q)) ||
          (item.leadAssignee && item.leadAssignee.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeClass, selectedItemCategory, selectedItemSourcing, selectedItemStatus, itemSearchQuery]);

  // Class Statistics
  const classStats = useMemo(() => {
    if (!activeClass || !activeClass.items || activeClass.items.length === 0) {
      return { total: 0, ready: 0, inPrep: 0, pending: 0, packed: 0, pctReady: 0 };
    }
    const total = activeClass.items.length;
    const ready = activeClass.items.filter(i => i.status === 'READY').length;
    const inPrep = activeClass.items.filter(i => i.status === 'IN_PREP').length;
    const pending = activeClass.items.filter(i => i.status === 'PENDING').length;
    const packed = activeClass.items.filter(i => i.status === 'PACKED').length;
    const pctReady = Math.round(((ready + packed) / total) * 100);
    return { total, ready, inPrep, pending, packed, pctReady };
  }, [activeClass]);

  // Total Project Items Statistics
  const projectStats = useMemo(() => {
    if (!selectedProject || !selectedProject.classes) return { totalItems: 0, completedItems: 0, percent: 0 };
    let total = 0;
    let done = 0;
    selectedProject.classes.forEach(c => {
      (c.items || []).forEach(i => {
        total++;
        if (i.status === 'READY' || i.status === 'PACKED') done++;
      });
    });
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { totalItems: total, completedItems: done, percent };
  }, [selectedProject]);

  // Helper Functions
  const refreshProjectsList = (selectId?: string) => {
    const list = ProjectManagementService.getAllProjects();
    setProjects([...list]);
    if (selectId) setSelectedProjectId(selectId);
  };

  const handleSelectProjectAndScroll = (id: string) => {
    setSelectedProjectId(id);
    if (workspaceRef.current) {
      workspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Create Project Submit
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormName.trim()) {
      showToast('Project name is required', 'error');
      return;
    }

    const created = ProjectManagementService.createProject(
      {
        code: projectFormCode.trim() || undefined,
        name: projectFormName.trim(),
        clientName: projectFormClient.trim() || 'General Institutional Client',
        category: projectFormCategory,
        leadUserName: projectFormLead.trim() || 'Dr. Samartha HM',
        assignedBy: projectFormAssignedBy.trim() || 'Operations Lead',
        priority: projectFormPriority,
        status: projectFormStatus,
        startDate: projectFormStartDate,
        targetDeliveryDate: projectFormDeliveryDate,
        defaultBatchMultiplier: Math.max(1, Number(projectFormBatchMultiplier) || 1),
        budgetINR: projectFormBudget ? Number(projectFormBudget) : undefined,
        invoicedRevenueINR: projectFormRevenue ? Number(projectFormRevenue) : undefined,
        description: projectFormDesc.trim()
      },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: 'admin' },
      templateType
    );

    refreshProjectsList(created.id);
    setIsCreateProjectModalOpen(false);
    showToast(`Project "${created.name}" created successfully!`, 'success');

    // Reset Form
    setProjectFormName('');
    setProjectFormCode('');
    setProjectFormClient('');
    setProjectFormBudget('');
    setProjectFormRevenue('');
    setProjectFormDesc('');
  };

  // Open Edit Project Modal
  const handleOpenEditProject = () => {
    if (!selectedProject) return;
    setProjectFormCode(selectedProject.code);
    setProjectFormName(selectedProject.name);
    setProjectFormClient(selectedProject.clientName);
    setProjectFormCategory(selectedProject.category);
    setProjectFormLead(selectedProject.leadUserName);
    setProjectFormAssignedBy(selectedProject.assignedBy || 'Operations Lead');
    setProjectFormPriority(selectedProject.priority);
    setProjectFormStatus(selectedProject.status);
    setProjectFormStartDate(selectedProject.startDate);
    setProjectFormDeliveryDate(selectedProject.targetDeliveryDate);
    setProjectFormBatchMultiplier(selectedProject.defaultBatchMultiplier || 1);
    setProjectFormBudget(selectedProject.budgetINR !== undefined ? String(selectedProject.budgetINR) : '');
    setProjectFormRevenue(selectedProject.invoicedRevenueINR !== undefined ? String(selectedProject.invoicedRevenueINR) : '');
    setProjectFormDesc(selectedProject.description || '');
    setIsEditProjectModalOpen(true);
  };

  // Save Edit Project
  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    ProjectManagementService.updateProject(
      selectedProject.id,
      {
        code: projectFormCode.trim(),
        name: projectFormName.trim(),
        clientName: projectFormClient.trim(),
        category: projectFormCategory,
        leadUserName: projectFormLead.trim(),
        assignedBy: projectFormAssignedBy.trim(),
        priority: projectFormPriority,
        status: projectFormStatus,
        startDate: projectFormStartDate,
        targetDeliveryDate: projectFormDeliveryDate,
        defaultBatchMultiplier: Math.max(1, Number(projectFormBatchMultiplier) || 1),
        budgetINR: projectFormBudget ? Number(projectFormBudget) : undefined,
        invoicedRevenueINR: projectFormRevenue ? Number(projectFormRevenue) : undefined,
        description: projectFormDesc.trim()
      },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: 'admin' }
    );

    refreshProjectsList(selectedProject.id);
    setIsEditProjectModalOpen(false);
    showToast('Project updated successfully!', 'success');
  };

  // Delete Project
  const handleDeleteProject = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) {
      ProjectManagementService.deleteProject(id);
      refreshProjectsList();
      showToast(`Deleted project "${name}"`, 'success');
    }
  };

  // Class Multiplier Change
  const handleClassMultiplierChange = (newMultiplier: number) => {
    if (!selectedProject || !activeClass) return;
    const val = Math.max(1, Number(newMultiplier) || 1);
    ProjectManagementService.updateClass(selectedProject.id, activeClass.id, { batchMultiplier: val });
    refreshProjectsList(selectedProject.id);
    showToast(`Updated ${activeClass.name} batch multiplier to ${val}x`, 'info');
  };

  // Add Class
  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newClassName.trim()) return;

    const added = ProjectManagementService.addClassToProject(selectedProject.id, {
      name: newClassName.trim(),
      description: newClassDesc.trim(),
      batchMultiplier: Math.max(1, Number(newClassBatchMultiplier) || 1)
    });

    refreshProjectsList(selectedProject.id);
    if (added) setActiveClassId(added.id);
    setIsAddClassModalOpen(false);
    setNewClassName('');
    setNewClassDesc('');
    showToast(`Added ${newClassName} to project!`, 'success');
  };

  // Delete Class
  const handleDeleteClass = (classId: string, className: string) => {
    if (!selectedProject) return;
    if (window.confirm(`Remove "${className}" and all its deliverables from this project?`)) {
      ProjectManagementService.removeClassFromProject(selectedProject.id, classId);
      refreshProjectsList(selectedProject.id);
      showToast(`Removed ${className}`, 'info');
    }
  };

  // Open Add Work Item
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemFormName('');
    setItemFormCategory('ACTIVITY_KIT');
    setItemFormSpec('');
    setItemFormQty(1);
    setItemFormUnit('pcs');
    setItemFormSourcing('BUY_LOCAL');
    setItemFormStatus('PENDING');
    setItemFormCost('');
    setItemFormAssignee(selectedProject?.leadUserName || 'Ravi Kumar (Lead Tech)');
    setItemFormChapter('');
    setItemFormNotes('');
    setIsAddEditItemModalOpen(true);
  };

  // Open Edit Work Item
  const handleOpenEditItem = (item: ProjectWorkItem) => {
    setEditingItem(item);
    setItemFormName(item.name);
    setItemFormCategory(item.category);
    setItemFormSpec(item.specification);
    setItemFormQty(item.quantityPerBatchUnit);
    setItemFormUnit(item.unit);
    setItemFormSourcing(item.sourcingChannel);
    setItemFormStatus(item.status);
    setItemFormCost(item.unitCost !== undefined ? String(item.unitCost) : '');
    setItemFormAssignee(item.leadAssignee || '');
    setItemFormChapter(item.sourceChapter || '');
    setItemFormNotes(item.notes || '');
    setIsAddEditItemModalOpen(true);
  };

  // Save Work Item (Add or Edit)
  const handleSaveWorkItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !activeClass || !itemFormName.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    if (editingItem) {
      ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, editingItem.id, {
        name: itemFormName.trim(),
        category: itemFormCategory,
        specification: itemFormSpec.trim(),
        quantityPerBatchUnit: Math.max(1, Number(itemFormQty) || 1),
        unit: itemFormUnit.trim() || 'pcs',
        sourcingChannel: itemFormSourcing,
        status: itemFormStatus,
        unitCost: itemFormCost ? Number(itemFormCost) : undefined,
        leadAssignee: itemFormAssignee.trim(),
        sourceChapter: itemFormChapter.trim() || undefined,
        notes: itemFormNotes.trim() || undefined
      });
      showToast(`Updated deliverable "${itemFormName}"`, 'success');
    } else {
      ProjectManagementService.addWorkItem(selectedProject.id, activeClass.id, {
        name: itemFormName.trim(),
        category: itemFormCategory,
        specification: itemFormSpec.trim(),
        quantityPerBatchUnit: Math.max(1, Number(itemFormQty) || 1),
        unit: itemFormUnit.trim() || 'pcs',
        sourcingChannel: itemFormSourcing,
        status: itemFormStatus,
        unitCost: itemFormCost ? Number(itemFormCost) : undefined,
        leadAssignee: itemFormAssignee.trim(),
        sourceChapter: itemFormChapter.trim() || undefined,
        notes: itemFormNotes.trim() || undefined
      });
      showToast(`Added "${itemFormName}" to ${activeClass.name}`, 'success');
    }

    refreshProjectsList(selectedProject.id);
    setIsAddEditItemModalOpen(false);
  };

  // Toggle Work Item Status
  const handleToggleItemStatus = (itemId: string) => {
    if (!selectedProject || !activeClass) return;
    const updated = ProjectManagementService.cycleWorkItemStatus(selectedProject.id, activeClass.id, itemId);
    refreshProjectsList(selectedProject.id);
    if (updated) {
      showToast(`Status updated to ${updated.status}`, 'info');
    }
  };

  // Delete Work Item
  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!selectedProject || !activeClass) return;
    if (window.confirm(`Delete item "${itemName}"?`)) {
      ProjectManagementService.deleteWorkItem(selectedProject.id, activeClass.id, itemId);
      refreshProjectsList(selectedProject.id);
      showToast(`Deleted "${itemName}"`, 'info');
    }
  };

  // Export Class Checklist CSV
  const handleExportCSV = () => {
    if (!selectedProject || !activeClass || !activeClass.items) return;
    const headers = ['Class', 'Item Name', 'Category', 'Sourcing Channel', 'Base Qty', 'Total Qty', 'Unit', 'Unit Cost (INR)', 'Total Cost (INR)', 'Assignee', 'Status', 'Specification', 'Notes'];
    const rows = activeClass.items.map(i => [
      `"${activeClass.name}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      `"${i.sourcingChannel}"`,
      i.quantityPerBatchUnit,
      i.totalQuantity,
      `"${i.unit}"`,
      i.unitCost || 0,
      (i.unitCost || 0) * i.totalQuantity,
      `"${i.leadAssignee || ''}"`,
      `"${i.status}"`,
      `"${(i.specification || '').replace(/"/g, '""')}"`,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedProject.code}_${activeClass.name.replace(/\s+/g, '_')}_Deliverables.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeClass.name} checklist to CSV!`, 'success');
  };

  // Badges & Color Helpers
  const getCategoryBadge = (cat: ProjectCategory) => {
    switch (cat) {
      case 'STEM_CURRICULUM':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">STEM Curriculum</span>;
      case 'IOT_HARDWARE':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">IoT Hardware</span>;
      case 'CUSTOM_INSTITUTIONAL':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Custom B2B</span>;
      default:
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Prototype</span>;
    }
  };

  const getStatusBadge = (st: ProjectStatus) => {
    switch (st) {
      case 'PLANNING':
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Planning</span>;
      case 'PROCURING':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Procuring</span>;
      case 'IN_PREP':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">In Preparation</span>;
      case 'ASSEMBLY_QC':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Assembly & QC</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Completed</span>;
      default:
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Archived</span>;
    }
  };

  const getItemCategoryBadge = (cat: WorkItemCategory) => {
    switch (cat) {
      case 'ACTIVITY_KIT':
        return <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><Package className="w-3 h-3" /> Kit Pouch</span>;
      case 'WORKING_MODEL':
        return <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><Wrench className="w-3 h-3" /> Demo Model</span>;
      case 'EDUCATIONAL_CHART':
        return <span className="inline-flex items-center gap-1 bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><FileSpreadsheet className="w-3 h-3" /> Chart / Poster</span>;
      case 'FABRICATION_LASER_3D':
        return <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><Scissors className="w-3 h-3" /> Laser / 3D Cut</span>;
      case 'CHEMICAL_REAGENT':
        return <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-300 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><FlaskConical className="w-3 h-3" /> Chemical Sol.</span>;
      case 'HARDWARE_SUPPLIES':
        return <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg"><ShoppingCart className="w-3 h-3" /> Hardware / Glass</span>;
    }
  };

  const getSourcingBadge = (channel: WorkItemSourcingChannel) => {
    switch (channel) {
      case 'BUY_LOCAL':
        return <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[10px] px-2 py-0.5 rounded font-mono">🛒 Buy Local</span>;
      case 'ORDER_ONLINE':
        return <span className="bg-blue-950/60 text-blue-300 border border-blue-800/60 text-[10px] px-2 py-0.5 rounded font-mono">📦 Order Online</span>;
      case 'LASER_CUT':
        return <span className="bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[10px] px-2 py-0.5 rounded font-mono">🪵 Laser Cut</span>;
      case '3D_PRINT':
        return <span className="bg-purple-950/60 text-purple-300 border border-purple-800/60 text-[10px] px-2 py-0.5 rounded font-mono">🖨️ 3D Print</span>;
      case 'FOAM_CUT':
        return <span className="bg-pink-950/60 text-pink-300 border border-pink-800/60 text-[10px] px-2 py-0.5 rounded font-mono">✂️ Foam Cut</span>;
      case 'CHEMICAL_PREP':
        return <span className="bg-orange-950/60 text-orange-300 border border-orange-800/60 text-[10px] px-2 py-0.5 rounded font-mono">⚗️ Chemical Prep</span>;
      case 'CHART_PRINT':
        return <span className="bg-teal-950/60 text-teal-300 border border-teal-800/60 text-[10px] px-2 py-0.5 rounded font-mono">📊 Plot / Print</span>;
      case 'MODEL_ASSEMBLY':
        return <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[10px] px-2 py-0.5 rounded font-mono">⚙️ Model Assembly</span>;
      case 'IN_STOCK':
        return <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] px-2 py-0.5 rounded font-mono">✅ In Stock</span>;
    }
  };

  const getItemStatusButton = (status: WorkItemStatus, itemId: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId)}
            title="Click to cycle status to IN_PREP"
            className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Clock className="w-3 h-3 text-slate-400" /> Pending
          </button>
        );
      case 'IN_PREP':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId)}
            title="Click to cycle status to READY"
            className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" /> In Prep
          </button>
        );
      case 'READY':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId)}
            title="Click to cycle status to PACKED"
            className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" /> Ready
          </button>
        );
      case 'PACKED':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId)}
            title="Click to cycle status to PENDING"
            className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Package className="w-3 h-3 text-cyan-400" /> Packed
          </button>
        );
    }
  };

  return (
    <div className="space-y-8 pb-20 text-slate-200">
      {/* ===== 1. Executive Operations Header & KPI Ribbon ===== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5" /> Multi-Project Operations & Class-Wise Deliverables Cockpit
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Project Portfolio & Class Production Manager
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              100% customizable planning, fabrication, and class-wise tracking. Monitor activity pouches, demonstration models, wall charts, laser-cut parts, chemicals, and hardware supplies for every educational project.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateProjectModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + New Project
            </button>
          </div>
        </div>

        {/* Global KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Projects</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{portfolioSummary.totalProjects}</div>
            <div className="text-[10px] text-indigo-400 mt-1">{portfolioSummary.activeProjectsCount} Active in Flight</div>
          </div>
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selected Project Progress</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{projectStats.percent}%</div>
            <div className="text-[10px] text-slate-400 mt-1">{projectStats.completedItems} / {projectStats.totalItems} Items Ready</div>
          </div>
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Budget (Optional)</div>
            <div className="text-2xl font-black text-slate-200 mt-1 font-mono">
              {portfolioSummary.totalBudgetINR > 0 ? `₹${portfolioSummary.totalBudgetINR.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Total Portfolio Allocation</div>
          </div>
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Portfolio Spend</div>
            <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
              ₹{portfolioSummary.totalExpensesINR.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Logged Physical Costs</div>
          </div>
        </div>
      </div>

      {/* ===== 2. Active Project Roster & Selector ===== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" /> Active Project Roster
            </h2>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
              {filteredProjects.length} Projects
            </span>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="STEM_CURRICULUM">STEM Curriculum</option>
              <option value="IOT_HARDWARE">IoT Hardware</option>
              <option value="CUSTOM_INSTITUTIONAL">Custom B2B</option>
              <option value="R_AND_D_PROTOTYPE">Prototype</option>
            </select>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="PROCURING">Procuring</option>
              <option value="IN_PREP">In Prep</option>
              <option value="ASSEMBLY_QC">Assembly & QC</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(p => {
            const isSelected = p.id === selectedProjectId;
            const totalClassDeliverables = (p.classes || []).reduce((sum, c) => sum + (c.items?.length || 0), 0);
            const readyDeliverables = (p.classes || []).reduce(
              (sum, c) => sum + (c.items?.filter(i => i.status === 'READY' || i.status === 'PACKED').length || 0),
              0
            );
            const progressPct = totalClassDeliverables > 0 ? Math.round((readyDeliverables / totalClassDeliverables) * 100) : 0;
            const expTotal = (p.expenses || []).reduce((a, b) => a + b.amountINR, 0);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.01]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {p.code}
                      </span>
                      {getCategoryBadge(p.category)}
                    </div>
                    <h3 className="font-bold text-white text-sm mt-1.5 line-clamp-1">{p.name}</h3>
                    <div className="text-[11px] text-slate-400 line-clamp-1">Client: {p.clientName}</div>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.description || 'No description provided.'}</p>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Classes / Batch</div>
                    <div className="font-bold text-slate-200 font-mono text-[11px]">
                      {p.classes?.length || 0} Classes ({p.defaultBatchMultiplier || 1}x Batch)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Target Delivery</div>
                    <div className="font-bold text-amber-300 font-mono text-[11px]">
                      📅 {p.targetDeliveryDate}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Readiness: {readyDeliverables}/{totalClassDeliverables} items</span>
                    <span className="font-bold text-emerald-400">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all bg-emerald-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Footer with Lead & Actions */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div>
                    Lead: <strong className="text-slate-200">{p.leadUserName}</strong>
                    {p.assignedBy && <span className="text-slate-500 text-[10px]"> (by {p.assignedBy})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProjectAndScroll(p.id);
                      }}
                      className="text-indigo-400 font-bold flex items-center gap-0.5 hover:text-indigo-300 cursor-pointer"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(p.id, p.name);
                      }}
                      title="Delete Project"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 3. Focused Class-Wise Project Workspace ===== */}
      {selectedProject && (
        <div ref={workspaceRef} className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl">
          {/* Project Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {selectedProject.code}
                </span>
                {getCategoryBadge(selectedProject.category)}
                {getStatusBadge(selectedProject.status)}
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  Default {selectedProject.defaultBatchMultiplier || 1}x Batch
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{selectedProject.name}</h2>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                <span>Client: <strong className="text-slate-200">{selectedProject.clientName}</strong></span>
                <span>•</span>
                <span>Lead: <strong className="text-indigo-300">{selectedProject.leadUserName}</strong></span>
                {selectedProject.assignedBy && (
                  <>
                    <span>•</span>
                    <span>Assigned By: <strong className="text-slate-300">{selectedProject.assignedBy}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>Target Delivery: <strong className="text-amber-300 font-mono">📅 {selectedProject.targetDeliveryDate}</strong></span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenEditProject}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> Edit Project
              </button>
              <button
                onClick={() => {
                  if (onNavigateToTab) {
                    onNavigateToTab('production_command', { projectId: selectedProject.id, grade: activeClass?.name });
                  } else {
                    showToast('Production Matrix tab opened', 'info');
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Open in Production Matrix
              </button>
              <button
                onClick={() => {
                  if (onNavigateToTab) {
                    onNavigateToTab('sticker_hub');
                  } else {
                    showToast('Sticker Monitoring Hub opened', 'info');
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" /> Sticker Hub
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
              </button>
            </div>
          </div>

          {/* ===== 4. Class Navigation Tabs ===== */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {(selectedProject.classes || []).map(c => {
                  const isActive = c.id === activeClassId;
                  const readyCount = (c.items || []).filter(i => i.status === 'READY' || i.status === 'PACKED').length;
                  const totalCount = c.items?.length || 0;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveClassId(c.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {readyCount}/{totalCount}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setIsAddClassModalOpen(true)}
                  className="flex items-center gap-1 bg-slate-800/40 hover:bg-slate-800 text-indigo-400 border border-dashed border-indigo-500/40 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Class
                </button>
              </div>

              {activeClass && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Class Multiplier:</span>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                    <input
                      type="number"
                      min="1"
                      value={activeClass.batchMultiplier}
                      onChange={(e) => handleClassMultiplierChange(Number(e.target.value))}
                      className="w-12 bg-transparent text-xs font-mono font-bold text-indigo-400 focus:outline-none text-center"
                    />
                    <span className="text-xs text-slate-500 font-bold">sets</span>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(activeClass.id, activeClass.name)}
                    title="Remove this class"
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Class Deliverables Content */}
            {activeClass ? (
              <div className="space-y-4">
                {/* Class Header & Progress Indicator */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" /> {activeClass.name} Deliverables Checklist
                      </h3>
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {activeClass.batchMultiplier}x Batch Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{activeClass.description || 'Deliverables, activity kits, models, charts, and materials needed for this class.'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">{classStats.ready + classStats.packed} of {classStats.total} Ready</div>
                      <div className="text-[10px] text-slate-400">{classStats.inPrep} In Prep • {classStats.pending} Pending</div>
                    </div>
                    <div className="w-24 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all bg-emerald-500"
                        style={{ width: `${classStats.pctReady}%` }}
                      />
                    </div>
                    <button
                      onClick={handleOpenAddItem}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Deliverable
                    </button>
                  </div>
                </div>

                {/* Filter Pills for Categories and Sourcing */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Category:</span>
                    {[
                      { id: 'ALL', label: 'All Items' },
                      { id: 'ACTIVITY_KIT', label: 'Kits 🧪' },
                      { id: 'WORKING_MODEL', label: 'Models ⚙️' },
                      { id: 'EDUCATIONAL_CHART', label: 'Charts 📊' },
                      { id: 'FABRICATION_LASER_3D', label: 'Laser/3D 🪵' },
                      { id: 'CHEMICAL_REAGENT', label: 'Chemicals ⚗️' },
                      { id: 'HARDWARE_SUPPLIES', label: 'Hardware 🛒' }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedItemCategory(c.id as any)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          selectedItemCategory === c.id
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Search inside class items */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={e => setItemSearchQuery(e.target.value)}
                      placeholder="Filter items..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Work Items Table */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Deliverable / Material</th>
                          <th className="py-3 px-4">Work Category</th>
                          <th className="py-3 px-4">Sourcing Channel</th>
                          <th className="py-3 px-4 text-center">Base Qty</th>
                          <th className="py-3 px-4 text-center">Total Req ({activeClass.batchMultiplier}x)</th>
                          <th className="py-3 px-4">Lead Assignee</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredClassItems.length > 0 ? (
                          filteredClassItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-white text-xs">{item.name}</div>
                                <div className="text-[11px] text-slate-400 line-clamp-1">{item.specification}</div>
                                {item.sourceChapter && (
                                  <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{item.sourceChapter}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {getItemCategoryBadge(item.category)}
                              </td>
                              <td className="py-3 px-4">
                                {getSourcingBadge(item.sourcingChannel)}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-slate-300">
                                {item.quantityPerBatchUnit} <span className="text-[10px] text-slate-500">{item.unit}</span>
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-cyan-400">
                                {item.totalQuantity} <span className="text-[10px] text-slate-400">{item.unit}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {item.leadAssignee || 'Unassigned'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {getItemStatusButton(item.status, item.id)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditItem(item)}
                                    title="Edit Item"
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    title="Delete Item"
                                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                              No deliverables matching the selected filter. Click <strong>"+ Add Deliverable"</strong> to add items to {activeClass.name}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                No classes defined yet. Click <strong>"+ Add Class"</strong> to create a class tab (e.g. Class 6, Class 7, etc.).
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 5. Modal: Create New Project Wizard ===== */}
      {isCreateProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Create New Educational Project</h3>
              </div>
              <button
                onClick={() => setIsCreateProjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
              {/* Template Choice */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Starter Template</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateType('CURRICULUM')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      templateType === 'CURRICULUM'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">🎓 Curriculum Template</div>
                    <div className="text-[10px] text-slate-400 mt-1">236 items (Class 8, 9, 10 & Common Crate)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('STANDARD_LAB')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      templateType === 'STANDARD_LAB'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">🔬 Standard STEM Lab</div>
                    <div className="text-[10px] text-slate-400 mt-1">Class 6–10 clean preset tabs</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('BLANK')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      templateType === 'BLANK'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">📄 Blank Custom Project</div>
                    <div className="text-[10px] text-slate-400 mt-1">Empty blank canvas</div>
                  </button>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectFormName}
                    onChange={e => setProjectFormName(e.target.value)}
                    placeholder="e.g. Karwar STEM Deployment Batch"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Project Code (Optional)</label>
                  <input
                    type="text"
                    value={projectFormCode}
                    onChange={e => setProjectFormCode(e.target.value)}
                    placeholder="Auto-generated if blank (e.g. PRJ-EXP-006)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Client / Institution Name</label>
                  <input
                    type="text"
                    value={projectFormClient}
                    onChange={e => setProjectFormClient(e.target.value)}
                    placeholder="e.g. Karnataka State STEM Mission"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Category</label>
                  <select
                    value={projectFormCategory}
                    onChange={e => setProjectFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="STEM_CURRICULUM">STEM Curriculum</option>
                    <option value="IOT_HARDWARE">IoT Hardware</option>
                    <option value="CUSTOM_INSTITUTIONAL">Custom B2B</option>
                    <option value="R_AND_D_PROTOTYPE">Prototype</option>
                  </select>
                </div>
              </div>

              {/* Lead and Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Lead Engineer / Technician</label>
                  <input
                    type="text"
                    value={projectFormLead}
                    onChange={e => setProjectFormLead(e.target.value)}
                    placeholder="e.g. Dr. Samartha HM or Ravi Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Assigned By</label>
                  <input
                    type="text"
                    value={projectFormAssignedBy}
                    onChange={e => setProjectFormAssignedBy(e.target.value)}
                    placeholder="e.g. Operations Director"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Multiplier & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Default Batch Multiplier</label>
                  <input
                    type="number"
                    min="1"
                    value={projectFormBatchMultiplier}
                    onChange={e => setProjectFormBatchMultiplier(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={projectFormStartDate}
                    onChange={e => setProjectFormStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Target Delivery Date</label>
                  <input
                    type="date"
                    value={projectFormDeliveryDate}
                    onChange={e => setProjectFormDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Optional Budget and Revenue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Approved Budget (₹) — <span className="text-indigo-400">Optional</span></label>
                  <input
                    type="number"
                    value={projectFormBudget}
                    onChange={e => setProjectFormBudget(e.target.value)}
                    placeholder="Leave blank if unbudgeted"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Invoiced Revenue (₹) — <span className="text-indigo-400">Optional</span></label>
                  <input
                    type="number"
                    value={projectFormRevenue}
                    onChange={e => setProjectFormRevenue(e.target.value)}
                    placeholder="Leave blank if not invoiced"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Project Description</label>
                <textarea
                  rows={2}
                  value={projectFormDesc}
                  onChange={e => setProjectFormDesc(e.target.value)}
                  placeholder="Describe scope, objectives, packaging specifications..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 6. Modal: Edit Project Metadata ===== */}
      {isEditProjectModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Edit Project: {selectedProject.name}</h3>
              </div>
              <button
                onClick={() => setIsEditProjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectFormName}
                    onChange={e => setProjectFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Project Code</label>
                  <input
                    type="text"
                    value={projectFormCode}
                    onChange={e => setProjectFormCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Client / Institution Name</label>
                  <input
                    type="text"
                    value={projectFormClient}
                    onChange={e => setProjectFormClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Status</label>
                  <select
                    value={projectFormStatus}
                    onChange={e => setProjectFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="PROCURING">Procuring</option>
                    <option value="IN_PREP">In Preparation</option>
                    <option value="ASSEMBLY_QC">Assembly & QC</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Lead Engineer / Technician</label>
                  <input
                    type="text"
                    value={projectFormLead}
                    onChange={e => setProjectFormLead(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Assigned By</label>
                  <input
                    type="text"
                    value={projectFormAssignedBy}
                    onChange={e => setProjectFormAssignedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Default Batch Multiplier</label>
                  <input
                    type="number"
                    min="1"
                    value={projectFormBatchMultiplier}
                    onChange={e => setProjectFormBatchMultiplier(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={projectFormStartDate}
                    onChange={e => setProjectFormStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Target Delivery Date</label>
                  <input
                    type="date"
                    value={projectFormDeliveryDate}
                    onChange={e => setProjectFormDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Approved Budget (₹) — <span className="text-indigo-400">Optional</span></label>
                  <input
                    type="number"
                    value={projectFormBudget}
                    onChange={e => setProjectFormBudget(e.target.value)}
                    placeholder="Leave blank if unbudgeted"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Invoiced Revenue (₹) — <span className="text-indigo-400">Optional</span></label>
                  <input
                    type="number"
                    value={projectFormRevenue}
                    onChange={e => setProjectFormRevenue(e.target.value)}
                    placeholder="Leave blank if not invoiced"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Project Description</label>
                <textarea
                  rows={2}
                  value={projectFormDesc}
                  onChange={e => setProjectFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 7. Modal: Add Class ===== */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Add Class or Module Tab</h3>
              </div>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Class / Grade Name *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 6, Class 7, Robotics Set..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Batch Multiplier for this Class</label>
                <input
                  type="number"
                  min="1"
                  value={newClassBatchMultiplier}
                  onChange={e => setNewClassBatchMultiplier(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={newClassDesc}
                  onChange={e => setNewClassDesc(e.target.value)}
                  placeholder="e.g. Hands-on optics, electricity and mechanics"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 8. Modal: Add / Edit Deliverable Item ===== */}
      {isAddEditItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingItem ? 'Edit Deliverable Item' : `Add Deliverable to ${activeClass?.name}`}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditItemModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Deliverable / Component Name *</label>
                <input
                  type="text"
                  required
                  value={itemFormName}
                  onChange={e => setItemFormName(e.target.value)}
                  placeholder="e.g. Electric Motor Demo Rig, 3mm MDF Optical Bench, 0.1M HCl Dropper..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Category</label>
                  <select
                    value={itemFormCategory}
                    onChange={e => setItemFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ACTIVITY_KIT">🧪 Activity Kit / Experiment Pouch</option>
                    <option value="WORKING_MODEL">⚙️ Physical Demonstration Model</option>
                    <option value="EDUCATIONAL_CHART">📊 Educational Chart / Wall Display</option>
                    <option value="FABRICATION_LASER_3D">🪵 Laser Cut / 3D Print / Foam Part</option>
                    <option value="CHEMICAL_REAGENT">⚗️ Chemical Solution / Reagent</option>
                    <option value="HARDWARE_SUPPLIES">🛒 Hardware, Glassware & Tools</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Sourcing Channel</label>
                  <select
                    value={itemFormSourcing}
                    onChange={e => setItemFormSourcing(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="BUY_LOCAL">🛒 Buy Local (Local City Market)</option>
                    <option value="ORDER_ONLINE">📦 Order Online (Amazon/Vendor)</option>
                    <option value="LASER_CUT">🪵 Laser Cut in FabLab</option>
                    <option value="3D_PRINT">🖨️ 3D Print in FabLab</option>
                    <option value="FOAM_CUT">✂️ Thermo Foam Cut</option>
                    <option value="CHEMICAL_PREP">⚗️ Chemical Prep / Aliquoting</option>
                    <option value="CHART_PRINT">📊 Large Format Chart Printing</option>
                    <option value="MODEL_ASSEMBLY">⚙️ Physical Model Assembly</option>
                    <option value="IN_STOCK">✅ Available in Warehouse Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Specification / Details</label>
                <input
                  type="text"
                  value={itemFormSpec}
                  onChange={e => setItemFormSpec(e.target.value)}
                  placeholder="e.g. 50mm dia, 10cm FL convex lens in 3D frame, sealed with sticker"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Base Qty (per 1 kit)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemFormQty}
                    onChange={e => setItemFormQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Unit</label>
                  <input
                    type="text"
                    value={itemFormUnit}
                    onChange={e => setItemFormUnit(e.target.value)}
                    placeholder="pcs, ml, sets, bottles..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Unit Cost (₹) — <span className="text-slate-400">Optional</span></label>
                  <input
                    type="number"
                    value={itemFormCost}
                    onChange={e => setItemFormCost(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Lead Assignee (Technician / Person)</label>
                  <input
                    type="text"
                    value={itemFormAssignee}
                    onChange={e => setItemFormAssignee(e.target.value)}
                    placeholder="e.g. Ravi Kumar or Priya Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Status</label>
                  <select
                    value={itemFormStatus}
                    onChange={e => setItemFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="PENDING">⏳ Pending</option>
                    <option value="IN_PREP">⚙️ In Preparation</option>
                    <option value="READY">✅ Ready</option>
                    <option value="PACKED">📦 Packed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Chapter / Activity Ref (Optional)</label>
                  <input
                    type="text"
                    value={itemFormChapter}
                    onChange={e => setItemFormChapter(e.target.value)}
                    placeholder="e.g. Chapter 3.2 (Electric Current)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Notes / QA Instruction</label>
                  <input
                    type="text"
                    value={itemFormNotes}
                    onChange={e => setItemFormNotes(e.target.value)}
                    placeholder="e.g. Double bag liquid bottles"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
