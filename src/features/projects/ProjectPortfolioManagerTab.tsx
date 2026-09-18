import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Minus,
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
  Info,
  Image as ImageIcon,
  Eye,
  ZoomIn,
  Check,
  CheckCircle2,
  CheckCheck,
  SlidersHorizontal,
  FolderKanban,
  Factory,
  QrCode,
  Coins,
  FileCheck,
  ShieldCheck,
  DollarSign
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
import { MASTER_PRODUCTION_ITEMS } from '../../data/productionDataset';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../AuthContext';
import { useData } from '../../DataContext';
import { useUndoRedo } from '../../contexts/UndoRedoContext';
import { getItemThumbnailUrl, STEM_PRESET_IMAGES, StemPresetImage } from '../../utils/itemThumbnailHelper';
import ProductionCommandCenterTab from '../production/ProductionCommandCenterTab';
import StickerMonitoringHubTab from '../stickers/StickerMonitoringHubTab';

interface ProjectPortfolioManagerTabProps {
  onNavigateToTab?: (tabId: string, params?: any) => void;
}

export default function ProjectPortfolioManagerTab({ onNavigateToTab }: ProjectPortfolioManagerTabProps = {}) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { inventory, logTransaction } = useData();
  const { addAction } = useUndoRedo();
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Core State
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [activeProjectSubView, setActiveProjectSubView] = useState<'deliverables' | 'production_matrix' | 'stickers' | 'financials' | 'audit'>('deliverables');

  // Listen to cross-tab project updates
  useEffect(() => {
    const handleProjectsUpdate = () => {
      const list = ProjectManagementService.getAllProjects();
      setProjects([...list]);
    };
    window.addEventListener('experimind_projects_updated', handleProjectsUpdate);
    return () => window.removeEventListener('experimind_projects_updated', handleProjectsUpdate);
  }, []);

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

  // High-Res Image Preview Modal
  const [previewImageItem, setPreviewImageItem] = useState<ProjectWorkItem | null>(null);

  // Preset Image Picker Drawer / Modal
  const [isPresetPickerOpen, setIsPresetPickerOpen] = useState<boolean>(false);

  // Autocomplete Dropdown State
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState<boolean>(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

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
  const [projectFormApplyToClasses, setProjectFormApplyToClasses] = useState<boolean>(true);
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
  const [itemFormImageUrl, setItemFormImageUrl] = useState<string>('');
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

  // Aggregated Autocomplete Suggestions (Inventory + Curriculum + Previous Project Items)
  const catalogSuggestions = useMemo(() => {
    const query = itemFormName.toLowerCase().trim();
    const suggestions: Array<{
      id: string;
      name: string;
      category: WorkItemCategory;
      spec: string;
      unit: string;
      unitCost: number;
      sourcing: WorkItemSourcingChannel;
      chapter?: string;
      source: 'INVENTORY' | 'CURRICULUM' | 'PROJECT';
      imageUrl?: string;
    }> = [];

    // 1. Inventory Items
    (inventory || []).forEach(inv => {
      let cat: WorkItemCategory = 'HARDWARE_SUPPLIES';
      let sourcing: WorkItemSourcingChannel = 'IN_STOCK';
      const invCat = (inv.category || '').toLowerCase();
      if (invCat.includes('chem') || invCat.includes('reagent')) {
        cat = 'CHEMICAL_REAGENT';
        sourcing = 'CHEMICAL_PREP';
      } else if (invCat.includes('laser') || invCat.includes('mdf') || invCat.includes('wood')) {
        cat = 'FABRICATION_LASER_3D';
        sourcing = 'LASER_CUT';
      } else if (invCat.includes('kit') || invCat.includes('activity')) {
        cat = 'ACTIVITY_KIT';
        sourcing = 'BUY_LOCAL';
      }

      suggestions.push({
        id: `inv-${inv.id}`,
        name: inv.name,
        category: cat,
        spec: `${inv.packageFootprint || inv.description || 'Standard inventory component'} (SKU: ${inv.sku || inv.barcode || 'N/A'}, Stock: ${inv.stockQty})`,
        unit: 'pcs',
        unitCost: inv.unitPrice || 0,
        sourcing,
        source: 'INVENTORY',
        imageUrl: inv.imageUrl || getItemThumbnailUrl({ name: inv.name, category: cat, sourcingChannel: sourcing })
      });
    });

    // 2. Curriculum Master Items (236 items)
    (MASTER_PRODUCTION_ITEMS || []).forEach(cur => {
      let cat: WorkItemCategory = 'ACTIVITY_KIT';
      let sourcing: WorkItemSourcingChannel = 'IN_STOCK';

      if (cur.sourcingType === 'LASER_CUT_FABLAB') {
        cat = 'FABRICATION_LASER_3D';
        sourcing = 'LASER_CUT';
      } else if (cur.chemicalSpecs || cur.sourcingType === 'IN_HOUSE_PREP') {
        cat = 'CHEMICAL_REAGENT';
        sourcing = 'CHEMICAL_PREP';
      } else if (cur.sourcingType === 'TO_ORDER') {
        cat = 'HARDWARE_SUPPLIES';
        sourcing = 'ORDER_ONLINE';
      } else if (cur.crateLevel === 'COMMON_CRATE') {
        cat = 'WORKING_MODEL';
        sourcing = 'MODEL_ASSEMBLY';
      } else if (cur.sourcingType === 'POUCH_BAGGING') {
        cat = 'ACTIVITY_KIT';
        sourcing = 'BUY_LOCAL';
      }

      const displayName = cur.materialName || cur.activityName;
      suggestions.push({
        id: `cur-${cur.id}`,
        name: displayName,
        category: cat,
        spec: cur.prepSpecification || cur.activityName || 'Curriculum experiment unit',
        unit: cur.unit || 'pcs',
        unitCost: cur.unitCost || 0,
        sourcing,
        chapter: cur.chapter ? `${cur.grade} • Ch ${cur.chapter} (${cur.activityCode})` : cur.grade,
        source: 'CURRICULUM',
        imageUrl: getItemThumbnailUrl({ name: displayName, category: cat, sourcingChannel: sourcing })
      });
    });

    // Filter by query if typed
    if (!query) {
      return suggestions.slice(0, 15);
    }

    return suggestions
      .filter(s => s.name.toLowerCase().includes(query) || (s.chapter && s.chapter.toLowerCase().includes(query)))
      .slice(0, 20);
  }, [inventory, itemFormName]);

  // Click outside to dismiss autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Select item from autocomplete
  const handleSelectCatalogItem = (item: typeof catalogSuggestions[0]) => {
    setItemFormName(item.name);
    setItemFormCategory(item.category);
    setItemFormSpec(item.spec);
    setItemFormUnit(item.unit);
    setItemFormCost(item.unitCost > 0 ? String(item.unitCost) : '');
    setItemFormSourcing(item.sourcing);
    setItemFormImageUrl(item.imageUrl || '');
    if (item.chapter) setItemFormChapter(item.chapter);
    setIsAutocompleteOpen(false);
    showToast(`Autofilled details from ${item.source.toLowerCase()} catalog!`, 'info');
  };

  // Select preset image
  const handleSelectPresetImage = (preset: StemPresetImage) => {
    setItemFormImageUrl(preset.url);
    setIsPresetPickerOpen(false);
    showToast(`Selected "${preset.name}" image!`, 'success');
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

    // Register Undo Action & Audit Trail
    addAction({
      id: `create_proj_${created.id}`,
      name: `Create Project "${created.name}"`,
      category: 'general',
      undo: () => {
        ProjectManagementService.deleteProject(created.id);
        refreshProjectsList();
      },
      redo: () => {
        // Re-add project
        refreshProjectsList(created.id);
      }
    });

    logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PROJECT_CREATED',
      description: `Created educational project "${created.name}" (${created.code}) with ${created.classes?.length || 0} classes. Lead: ${created.leadUserName}`,
      items: []
    }).catch(() => {});

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
    setProjectFormApplyToClasses(true);
    setProjectFormBudget(selectedProject.budgetINR !== undefined ? String(selectedProject.budgetINR) : '');
    setProjectFormRevenue(selectedProject.invoicedRevenueINR !== undefined ? String(selectedProject.invoicedRevenueINR) : '');
    setProjectFormDesc(selectedProject.description || '');
    setIsEditProjectModalOpen(true);
  };

  // Project-Level Batch Multiplier Change
  const handleProjectMultiplierChange = (newMultiplier: number, applyToClasses = true) => {
    if (!selectedProject) return;
    const oldMultiplier = selectedProject.defaultBatchMultiplier || 1;
    const val = Math.max(1, Number(newMultiplier) || 1);

    const updated = ProjectManagementService.updateProject(
      selectedProject.id,
      { defaultBatchMultiplier: val },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: 'admin' },
      { applyMultiplierToClasses: applyToClasses }
    );

    addAction({
      id: `mult_proj_${selectedProject.id}_${Date.now()}`,
      name: `Scale Project Batch to ${val}x`,
      category: 'general',
      undo: () => {
        ProjectManagementService.updateProject(
          selectedProject.id,
          { defaultBatchMultiplier: oldMultiplier },
          undefined,
          { applyMultiplierToClasses: applyToClasses }
        );
        refreshProjectsList(selectedProject.id);
      },
      redo: () => {
        ProjectManagementService.updateProject(
          selectedProject.id,
          { defaultBatchMultiplier: val },
          undefined,
          { applyMultiplierToClasses: applyToClasses }
        );
        refreshProjectsList(selectedProject.id);
      }
    });

    refreshProjectsList(selectedProject.id);
    showToast(`Project batch scaled to ${val}x sets${applyToClasses ? ' (all classes updated)' : ''}`, 'success');
  };

  // Save Edit Project
  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const previousSnapshot = { ...selectedProject };
    const mult = Math.max(1, Number(projectFormBatchMultiplier) || 1);
    const updated = ProjectManagementService.updateProject(
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
        defaultBatchMultiplier: mult,
        budgetINR: projectFormBudget ? Number(projectFormBudget) : undefined,
        invoicedRevenueINR: projectFormRevenue ? Number(projectFormRevenue) : undefined,
        description: projectFormDesc.trim()
      },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: 'admin' },
      { applyMultiplierToClasses: projectFormApplyToClasses }
    );

    // Register Undo Action
    addAction({
      id: `edit_proj_${selectedProject.id}_${Date.now()}`,
      name: `Update Project "${projectFormName}"`,
      category: 'general',
      undo: () => {
        ProjectManagementService.updateProject(selectedProject.id, previousSnapshot, undefined, { applyMultiplierToClasses: projectFormApplyToClasses });
        refreshProjectsList(selectedProject.id);
      },
      redo: () => {
        if (updated) {
          ProjectManagementService.updateProject(selectedProject.id, updated, undefined, { applyMultiplierToClasses: projectFormApplyToClasses });
          refreshProjectsList(selectedProject.id);
        }
      }
    });

    logTransaction({
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PROJECT_UPDATED',
      description: `Updated project fields for "${projectFormName}" (${selectedProject.code})`,
      items: []
    }).catch(() => {});

    refreshProjectsList(selectedProject.id);
    setIsEditProjectModalOpen(false);
    showToast('Project updated successfully!', 'success');
  };

  // Delete Project
  const handleDeleteProject = (id: string, name: string) => {
    const projectToDelete = projects.find(p => p.id === id);
    if (!projectToDelete) return;

    if (window.confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) {
      ProjectManagementService.deleteProject(id);

      addAction({
        id: `del_proj_${id}`,
        name: `Delete Project "${name}"`,
        category: 'general',
        undo: () => {
          ProjectManagementService.createProject(projectToDelete);
          refreshProjectsList(id);
        },
        redo: () => {
          ProjectManagementService.deleteProject(id);
          refreshProjectsList();
        }
      });

      refreshProjectsList();
      showToast(`Deleted project "${name}"`, 'success');
    }
  };

  // Class Multiplier Change
  const handleClassMultiplierChange = (newMultiplier: number) => {
    if (!selectedProject || !activeClass) return;
    const oldMultiplier = activeClass.batchMultiplier;
    const val = Math.max(1, Number(newMultiplier) || 1);

    ProjectManagementService.updateClass(selectedProject.id, activeClass.id, { batchMultiplier: val });

    addAction({
      id: `mult_class_${activeClass.id}_${Date.now()}`,
      name: `Scale ${activeClass.name} Batch to ${val}x`,
      category: 'general',
      undo: () => {
        ProjectManagementService.updateClass(selectedProject.id, activeClass.id, { batchMultiplier: oldMultiplier });
        refreshProjectsList(selectedProject.id);
      },
      redo: () => {
        ProjectManagementService.updateClass(selectedProject.id, activeClass.id, { batchMultiplier: val });
        refreshProjectsList(selectedProject.id);
      }
    });

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

    if (added) {
      addAction({
        id: `add_class_${added.id}`,
        name: `Add Class "${newClassName}" to ${selectedProject.name}`,
        category: 'general',
        undo: () => {
          ProjectManagementService.removeClassFromProject(selectedProject.id, added.id);
          refreshProjectsList(selectedProject.id);
        },
        redo: () => {
          ProjectManagementService.addClassToProject(selectedProject.id, added);
          refreshProjectsList(selectedProject.id);
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'CLASS_ADDED',
        description: `Added "${newClassName}" (${added.batchMultiplier}x batch) to project ${selectedProject.name}`,
        items: []
      }).catch(() => {});

      setActiveClassId(added.id);
    }

    refreshProjectsList(selectedProject.id);
    setIsAddClassModalOpen(false);
    setNewClassName('');
    setNewClassDesc('');
    showToast(`Added ${newClassName} to project!`, 'success');
  };

  // Delete Class
  const handleDeleteClass = (classId: string, className: string) => {
    if (!selectedProject || !activeClass) return;
    const classSnapshot = { ...activeClass };

    if (window.confirm(`Remove "${className}" and all its deliverables from this project?`)) {
      ProjectManagementService.removeClassFromProject(selectedProject.id, classId);

      addAction({
        id: `del_class_${classId}`,
        name: `Remove Class "${className}"`,
        category: 'general',
        undo: () => {
          ProjectManagementService.addClassToProject(selectedProject.id, classSnapshot);
          refreshProjectsList(selectedProject.id);
        },
        redo: () => {
          ProjectManagementService.removeClassFromProject(selectedProject.id, classId);
          refreshProjectsList(selectedProject.id);
        }
      });

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
    setItemFormImageUrl('');
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
    setItemFormImageUrl(item.imageUrl || '');
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

    const currentThumbnail = itemFormImageUrl.trim() || getItemThumbnailUrl({
      name: itemFormName,
      category: itemFormCategory,
      sourcingChannel: itemFormSourcing
    });

    if (editingItem) {
      const prevItem = { ...editingItem };
      const updated = ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, editingItem.id, {
        name: itemFormName.trim(),
        category: itemFormCategory,
        specification: itemFormSpec.trim(),
        quantityPerBatchUnit: Math.max(1, Number(itemFormQty) || 1),
        unit: itemFormUnit.trim() || 'pcs',
        sourcingChannel: itemFormSourcing,
        status: itemFormStatus,
        unitCost: itemFormCost ? Number(itemFormCost) : undefined,
        imageUrl: currentThumbnail,
        leadAssignee: itemFormAssignee.trim(),
        sourceChapter: itemFormChapter.trim() || undefined,
        notes: itemFormNotes.trim() || undefined
      });

      addAction({
        id: `edit_item_${editingItem.id}_${Date.now()}`,
        name: `Edit deliverable "${itemFormName}"`,
        category: 'item',
        undo: () => {
          ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, editingItem.id, prevItem);
          refreshProjectsList(selectedProject.id);
        },
        redo: () => {
          if (updated) {
            ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, editingItem.id, updated);
            refreshProjectsList(selectedProject.id);
          }
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'DELIVERABLE_UPDATED',
        description: `Modified deliverable "${itemFormName}" in ${activeClass.name} (${selectedProject.name})`,
        items: [{ componentName: itemFormName, qtyDiff: Number(itemFormQty) }]
      }).catch(() => {});

      showToast(`Updated deliverable "${itemFormName}"`, 'success');
    } else {
      const added = ProjectManagementService.addWorkItem(selectedProject.id, activeClass.id, {
        name: itemFormName.trim(),
        category: itemFormCategory,
        specification: itemFormSpec.trim(),
        quantityPerBatchUnit: Math.max(1, Number(itemFormQty) || 1),
        unit: itemFormUnit.trim() || 'pcs',
        sourcingChannel: itemFormSourcing,
        status: itemFormStatus,
        unitCost: itemFormCost ? Number(itemFormCost) : undefined,
        imageUrl: currentThumbnail,
        leadAssignee: itemFormAssignee.trim(),
        sourceChapter: itemFormChapter.trim() || undefined,
        notes: itemFormNotes.trim() || undefined
      });

      if (added) {
        addAction({
          id: `add_item_${added.id}`,
          name: `Add "${itemFormName}" to ${activeClass.name}`,
          category: 'item',
          undo: () => {
            ProjectManagementService.deleteWorkItem(selectedProject.id, activeClass.id, added.id);
            refreshProjectsList(selectedProject.id);
          },
          redo: () => {
            ProjectManagementService.addWorkItem(selectedProject.id, activeClass.id, added);
            refreshProjectsList(selectedProject.id);
          }
        });

        logTransaction({
          id: `tx_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'DELIVERABLE_ADDED',
          description: `Added new deliverable "${itemFormName}" (${itemFormCategory}) to ${activeClass.name} in ${selectedProject.name}`,
          items: [{ componentName: itemFormName, qtyDiff: Number(itemFormQty) }]
        }).catch(() => {});
      }

      showToast(`Added "${itemFormName}" to ${activeClass.name}`, 'success');
    }

    refreshProjectsList(selectedProject.id);
    setIsAddEditItemModalOpen(false);
  };

  // Toggle Work Item Status
  const handleToggleItemStatus = (itemId: string, itemName: string, currentStatus: WorkItemStatus) => {
    if (!selectedProject || !activeClass) return;
    const updated = ProjectManagementService.cycleWorkItemStatus(selectedProject.id, activeClass.id, itemId);

    if (updated) {
      addAction({
        id: `toggle_status_${itemId}_${Date.now()}`,
        name: `Status "${itemName}": ${currentStatus} → ${updated.status}`,
        category: 'item',
        undo: () => {
          ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, itemId, { status: currentStatus });
          refreshProjectsList(selectedProject.id);
        },
        redo: () => {
          ProjectManagementService.updateWorkItem(selectedProject.id, activeClass.id, itemId, { status: updated.status });
          refreshProjectsList(selectedProject.id);
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'STATUS_CHANGED',
        description: `Deliverable "${itemName}" status changed from ${currentStatus} to ${updated.status} in ${activeClass.name}`,
        items: []
      }).catch(() => {});

      showToast(`Status updated to ${updated.status}`, 'info');
    }

    refreshProjectsList(selectedProject.id);
  };

  // Delete Work Item
  const handleDeleteItem = (item: ProjectWorkItem) => {
    if (!selectedProject || !activeClass) return;
    const itemSnapshot = { ...item };

    if (window.confirm(`Delete deliverable "${item.name}"?`)) {
      ProjectManagementService.deleteWorkItem(selectedProject.id, activeClass.id, item.id);

      addAction({
        id: `del_item_${item.id}`,
        name: `Delete deliverable "${item.name}"`,
        category: 'item',
        undo: () => {
          ProjectManagementService.addWorkItem(selectedProject.id, activeClass.id, itemSnapshot);
          refreshProjectsList(selectedProject.id);
        },
        redo: () => {
          ProjectManagementService.deleteWorkItem(selectedProject.id, activeClass.id, item.id);
          refreshProjectsList(selectedProject.id);
        }
      });

      logTransaction({
        id: `tx_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'DELIVERABLE_DELETED',
        description: `Removed deliverable "${item.name}" from ${activeClass.name} in ${selectedProject.name}`,
        items: []
      }).catch(() => {});

      refreshProjectsList(selectedProject.id);
      showToast(`Deleted "${item.name}"`, 'info');
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

  const getItemStatusButton = (status: WorkItemStatus, itemId: string, itemName: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId, itemName, status)}
            title="Click to cycle status to IN_PREP"
            className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Clock className="w-3 h-3 text-slate-400" /> Pending
          </button>
        );
      case 'IN_PREP':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId, itemName, status)}
            title="Click to cycle status to READY"
            className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" /> In Prep
          </button>
        );
      case 'READY':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId, itemName, status)}
            title="Click to cycle status to PACKED"
            className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" /> Ready
          </button>
        );
      case 'PACKED':
        return (
          <button
            onClick={() => handleToggleItemStatus(itemId, itemName, status)}
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
              100% customizable planning, visual thumbnail previews, and class-wise tracking. Monitor activity pouches, demonstration models, wall charts, laser-cut parts, chemicals, and hardware supplies with full Undo/Redo support.
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

      {/* ===== 3. Focused Project Workspace & Integrated Multi-Workstation Cockpit ===== */}
      {selectedProject && (
        <div ref={workspaceRef} className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl">
          {/* Project Header Banner with Batch Multiplier Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                  {selectedProject.code}
                </span>
                {getCategoryBadge(selectedProject.category)}
                {getStatusBadge(selectedProject.status)}
                <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  {selectedProject.classes?.length || 0} Classes Defined
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

            {/* Interactive Project-Level Batch Multiplier Station & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Project Multiplier Box */}
              <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-2.5 flex flex-wrap items-center gap-2.5 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-300">Project Batch:</span>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleProjectMultiplierChange((selectedProject.defaultBatchMultiplier || 1) - 1)}
                      className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold cursor-pointer"
                      title="Decrease project default batch multiplier"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={selectedProject.defaultBatchMultiplier || 1}
                      onChange={e => handleProjectMultiplierChange(Number(e.target.value))}
                      className="w-10 bg-transparent text-xs font-mono font-black text-indigo-400 focus:outline-none text-center"
                    />
                    <button
                      onClick={() => handleProjectMultiplierChange((selectedProject.defaultBatchMultiplier || 1) + 1)}
                      className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold cursor-pointer"
                      title="Increase project default batch multiplier"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-300 font-bold">sets</span>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 5, 10, 25, 50].map(mult => (
                    <button
                      key={mult}
                      onClick={() => handleProjectMultiplierChange(mult)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        (selectedProject.defaultBatchMultiplier || 1) === mult
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleProjectMultiplierChange(selectedProject.defaultBatchMultiplier || 1, true)}
                  className="inline-flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  title="Sync this multiplier to all class tabs"
                >
                  ⚡ Apply to All Classes
                </button>
              </div>

              {/* Edit & CSV Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenEditProject}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> Edit Metadata
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* ===== Integrated Navigation Sub-Tabs Bar ===== */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveProjectSubView('deliverables')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeProjectSubView === 'deliverables'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" /> 📋 Class Deliverables & Planning
            </button>

            <button
              onClick={() => setActiveProjectSubView('production_matrix')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeProjectSubView === 'production_matrix'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Factory className="w-4 h-4" /> 🏭 Production & Sourcing Matrix
            </button>

            <button
              onClick={() => setActiveProjectSubView('stickers')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeProjectSubView === 'stickers'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <QrCode className="w-4 h-4" /> 🏷️ Sticker & Labeling Hub (3-Tier)
            </button>

            <button
              onClick={() => setActiveProjectSubView('financials')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeProjectSubView === 'financials'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Coins className="w-4 h-4" /> 💰 P&L Financials & Conflicts
            </button>

            <button
              onClick={() => setActiveProjectSubView('audit')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeProjectSubView === 'audit'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <FileCheck className="w-4 h-4" /> 📜 21 CFR / ISO Audit Trail
            </button>
          </div>

          {/* ===== SUB-VIEW 1: Class Deliverables & Planning ===== */}
          {activeProjectSubView === 'deliverables' && (
            <div className="space-y-5">
              {/* Class Navigation Tabs & Class Multiplier Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
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

                {/* Class Multiplier Controls */}
                {activeClass && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold">{activeClass.name} Multiplier:</span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleClassMultiplierChange((activeClass.batchMultiplier || 1) - 1)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold cursor-pointer"
                        title="Decrease class batch multiplier"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={activeClass.batchMultiplier}
                        onChange={(e) => handleClassMultiplierChange(Number(e.target.value))}
                        className="w-12 bg-transparent text-xs font-mono font-bold text-indigo-400 focus:outline-none text-center"
                      />
                      <button
                        onClick={() => handleClassMultiplierChange((activeClass.batchMultiplier || 1) + 1)}
                        className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold cursor-pointer"
                        title="Increase class batch multiplier"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 font-bold">sets</span>

                    <div className="flex items-center gap-1">
                      {[1, 5, 10, 25, 50].map(mult => (
                        <button
                          key={mult}
                          onClick={() => handleClassMultiplierChange(mult)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            activeClass.batchMultiplier === mult
                              ? 'bg-indigo-600 text-white font-black'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {mult}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleDeleteClass(activeClass.id, activeClass.name)}
                      title="Remove this class"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer ml-1"
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
                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20 font-bold">
                          {activeClass.batchMultiplier}x Batch Active ({activeClass.items.length} deliverables scaled automatically)
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
                            <th className="py-3 px-3 w-12 text-center">Preview</th>
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
                            filteredClassItems.map(item => {
                              const thumbUrl = getItemThumbnailUrl(item);

                              return (
                                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                                  {/* Thumbnail Image Column */}
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImageItem(item)}
                                      title="Click to view full preview"
                                      className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 hover:border-indigo-500 transition-all group cursor-pointer"
                                    >
                                      <img
                                        src={thumbUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    </button>
                                  </td>

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
                                    {getItemStatusButton(item.status, item.id, item.name)}
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
                                        onClick={() => handleDeleteItem(item)}
                                        title="Delete Item"
                                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
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
          )}

          {/* ===== SUB-VIEW 2: Embedded Production & Sourcing Matrix ===== */}
          {activeProjectSubView === 'production_matrix' && (
            <div className="bg-slate-950/60 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Production & Sourcing Matrix — {selectedProject.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Live 236-item curriculum matrix, laser fabrication sheet nesting, and chemical dilution scaled to {selectedProject.defaultBatchMultiplier || 1}x sets.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold self-start sm:self-auto">
                  Project Run: {selectedProject.defaultBatchMultiplier || 1}x Batch
                </span>
              </div>
              <ProductionCommandCenterTab initialProjectId={selectedProject.id} initialGrade={activeClass?.name} embeddedMode={true} />
            </div>
          )}

          {/* ===== SUB-VIEW 3: Embedded Sticker & Labeling Hub ===== */}
          {activeProjectSubView === 'stickers' && (
            <div className="bg-slate-950/60 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-bold text-white">Sticker & Labeling Hub — {selectedProject.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Tier 1 (Master Box), Tier 2 (Activity Pouch), and Tier 3 (Item/Vial) QR labeling manifests scaled to {selectedProject.defaultBatchMultiplier || 1} sets.
                  </p>
                </div>
                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 font-bold self-start sm:self-auto">
                  Total Copies: {selectedProject.defaultBatchMultiplier || 1}x
                </span>
              </div>
              <StickerMonitoringHubTab initialProjectId={selectedProject.id} embeddedMode={true} />
            </div>
          )}

          {/* ===== SUB-VIEW 4: P&L Financials & Conflicts ===== */}
          {activeProjectSubView === 'financials' && selectedFinancials && (
            <div className="space-y-6">
              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Approved Budget</div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {selectedFinancials.budgetINR !== undefined ? `₹${selectedFinancials.budgetINR.toLocaleString('en-IN')}` : 'Optional'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Allocated Capital</div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Invoiced Revenue</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                    {selectedFinancials.invoicedRevenueINR !== undefined ? `₹${selectedFinancials.invoicedRevenueINR.toLocaleString('en-IN')}` : 'Optional'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Client Invoicing</div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Estimated BOM Cost</div>
                  <div className="text-xl font-black text-cyan-400 font-mono mt-1">
                    ₹{selectedFinancials.estimatedBOMCostINR.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Class Deliverable Sum</div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Gross Margin</div>
                  <div className="text-xl font-black text-indigo-400 font-mono mt-1">
                    ₹{selectedFinancials.grossMarginINR.toLocaleString('en-IN')} ({selectedFinancials.grossMarginPercent}%)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Net Realized Profit</div>
                </div>
              </div>

              {/* Logged Expenses & Material Inventory Conflicts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-cyan-400" /> Logged Physical Expenses
                    </h4>
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      Total: ₹{selectedFinancials.totalExpensesINR.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {selectedProject.expenses && selectedProject.expenses.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedProject.expenses.map(exp => (
                        <div key={exp.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-white">{exp.description}</div>
                            <div className="text-[10px] text-slate-400">{exp.category} • {exp.date} • by {exp.loggedByUserName}</div>
                          </div>
                          <div className="font-mono font-bold text-cyan-400 text-sm">₹{exp.amountINR.toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">No physical expense records logged yet for this project.</div>
                  )}
                </div>

                {/* Material Competition & Conflicts */}
                <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Portfolio Inventory Shortage Warnings
                    </h4>
                    <span className="text-xs text-slate-400">Cross-Project Deficits</span>
                  </div>

                  {ProjectManagementService.getPortfolioInventoryConflicts().length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {ProjectManagementService.getPortfolioInventoryConflicts().slice(0, 5).map((conf, idx) => (
                        <div key={idx} className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-amber-300">
                            <span>{conf.materialName}</span>
                            <span className="font-mono text-rose-400">Deficit: -{conf.globalDeficit} units</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Available: {conf.availableStock} • Required across projects: {conf.totalRequiredAcrossProjects}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-emerald-400 text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> All required materials have sufficient stock across projects!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== SUB-VIEW 5: 21 CFR / ISO Audit Trail ===== */}
          {activeProjectSubView === 'audit' && (
            <div className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-400" /> Immutable Audit Trail (21 CFR Part 11 & ISO 9001)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Every metadata change, multiplier scaling, and deliverable edit is cryptographically signed.</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-900 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
                  {selectedProject.auditLogs?.length || 0} Audit Entries
                </span>
              </div>

              {selectedProject.auditLogs && selectedProject.auditLogs.length > 0 ? (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {selectedProject.auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-300 text-xs">{log.details}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                        <span>Operator: <strong className="text-slate-400">{log.userName}</strong> ({log.userRole})</span>
                        <span className="font-mono text-[9px] text-indigo-400 truncate max-w-xs">{log.signatureDigest}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">No audit logs available for this project.</div>
              )}
            </div>
          )}
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

              {/* Multiplier with Quick Chips & Apply-to-all toggle */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold block">Default Batch Multiplier</label>
                  <div className="flex items-center gap-1">
                    {[1, 5, 10, 25, 50].map(mult => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setProjectFormBatchMultiplier(mult)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                          projectFormBatchMultiplier === mult
                            ? 'bg-indigo-600 text-white font-black'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={projectFormBatchMultiplier}
                      onChange={e => setProjectFormBatchMultiplier(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <input
                      type="date"
                      value={projectFormStartDate}
                      onChange={e => setProjectFormStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <input
                      type="date"
                      value={projectFormDeliveryDate}
                      onChange={e => setProjectFormDeliveryDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projectFormApplyToClasses}
                    onChange={e => setProjectFormApplyToClasses(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-indigo-300">
                    ⚡ Apply this batch multiplier to all existing classes in this project (rescales all item quantities)
                  </span>
                </label>
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

      {/* ===== 8. Modal: Add / Edit Deliverable Item with Smart Autocomplete & Visual Gallery ===== */}
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
              {/* Deliverable Name with Smart Autocomplete Combobox */}
              <div className="space-y-1 relative" ref={autocompleteRef}>
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold block">Deliverable / Component Name *</label>
                  <span className="text-[10px] text-indigo-400">💡 Type to search 236+ curriculum & inventory items</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={itemFormName}
                    onChange={e => {
                      setItemFormName(e.target.value);
                      setIsAutocompleteOpen(true);
                    }}
                    onFocus={() => setIsAutocompleteOpen(true)}
                    placeholder="Search or enter name (e.g. Convex Lens, 0.1M HCl Dropper, MDF Base...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {catalogSuggestions.length > 0 && isAutocompleteOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-800">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/60 sticky top-0 flex items-center justify-between">
                        <span>Matching Catalog Suggestions</span>
                        <span className="text-indigo-400 font-mono">{catalogSuggestions.length} found</span>
                      </div>
                      {catalogSuggestions.map(s => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectCatalogItem(s)}
                          className="p-2.5 hover:bg-indigo-950/50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={s.imageUrl}
                              alt={s.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">{s.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{s.spec}</div>
                              {s.chapter && (
                                <div className="text-[9px] text-indigo-400 font-mono">{s.chapter}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {getItemCategoryBadge(s.category)}
                            {s.unitCost > 0 && (
                              <div className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">₹{s.unitCost}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category and Sourcing */}
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

              {/* Quantities & Pricing */}
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

              {/* Image Preview & URL with Preset Picker */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> Deliverable Thumbnail / Preview Image
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPresetPickerOpen(!isPresetPickerOpen)}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    🎨 Choose from STEM Preset Gallery
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={itemFormImageUrl || getItemThumbnailUrl({ name: itemFormName, category: itemFormCategory, sourcingChannel: itemFormSourcing })}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                  />
                  <input
                    type="url"
                    value={itemFormImageUrl}
                    onChange={e => setItemFormImageUrl(e.target.value)}
                    placeholder="Custom Image URL (https://...)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Preset Gallery Picker Grid */}
                {isPresetPickerOpen && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800 max-h-36 overflow-y-auto">
                    {STEM_PRESET_IMAGES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPresetImage(p)}
                        className="p-1 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500 text-center transition-all cursor-pointer group"
                      >
                        <img src={p.url} alt={p.name} className="w-full h-10 object-cover rounded-lg" />
                        <div className="text-[9px] text-slate-300 truncate mt-1">{p.emoji} {p.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee & Status */}
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

      {/* ===== 9. Modal: High-Res Visual Zoom Preview ===== */}
      {previewImageItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white truncate max-w-sm">{previewImageItem.name}</h3>
              </div>
              <button
                onClick={() => setPreviewImageItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                <img
                  src={getItemThumbnailUrl(previewImageItem)}
                  alt={previewImageItem.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span>{getItemCategoryBadge(previewImageItem.category)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sourcing:</span>
                  <span>{getSourcingBadge(previewImageItem.sourcingChannel)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Specification:</span>
                  <span className="text-white font-medium text-right max-w-xs">{previewImageItem.specification}</span>
                </div>
                {previewImageItem.sourceChapter && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Chapter / Ref:</span>
                    <span className="font-mono text-indigo-400">{previewImageItem.sourceChapter}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span>{getItemStatusButton(previewImageItem.status, previewImageItem.id, previewImageItem.name)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = previewImageItem;
                    setPreviewImageItem(null);
                    handleOpenEditItem(itemToEdit);
                  }}
                  className="px-4 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-500 cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Item Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
