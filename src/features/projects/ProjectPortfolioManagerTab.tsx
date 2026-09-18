import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Briefcase,
  Layers,
  Coins,
  Users,
  Calendar,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  TrendingUp,
  Building2,
  FileText,
  Lock,
  Download,
  X,
  Sparkles,
  ChevronRight,
  Package,
  Scissors,
  FlaskConical,
  Truck,
  DollarSign,
  Square
} from 'lucide-react';
import {
  INITIAL_PROJECTS,
  Project,
  ProjectCategory,
  ProjectStatus,
  ProjectExpense
} from '../../data/projectsDataset';
import {
  ProjectManagementService,
  ProjectFinancials,
  InventoryConflictItem,
  PortfolioSummary
} from '../../services/ProjectManagementService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../AuthContext';

export default function ProjectPortfolioManagerTab() {
  const { showToast } = useToast();
  const { user } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeProjectTab, setActiveProjectTab] = useState<'sourcing' | 'financials' | 'team' | 'timeline'>('sourcing');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'ALL'>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState<boolean>(false);

  // New Project Form State
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProjectCategory>('STEM_CURRICULUM');
  const [newClient, setNewClient] = useState<string>('');
  const [newBudget, setNewBudget] = useState<number>(100000);
  const [newRevenue, setNewRevenue] = useState<number>(150000);
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // Expense Form State
  const [expCategory, setExpCategory] = useState<'MATERIAL' | 'LASER_MACHINE' | 'CHEMICAL_PREP' | 'VENDOR_PO' | 'SHIPPING' | 'LABOR'>('MATERIAL');
  const [expDescription, setExpDescription] = useState<string>('');
  const [expAmount, setExpAmount] = useState<number>(5000);
  const [expRef, setExpRef] = useState<string>('');

  // Sign-off Form State
  const [signOffComments, setSignOffComments] = useState<string>('');

  // Selected Project & Calculations
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const selectedFinancials: ProjectFinancials | null = useMemo(() => {
    if (!selectedProject) return null;
    return ProjectManagementService.getProjectFinancials(selectedProject.id);
  }, [selectedProject]);

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    return ProjectManagementService.getPortfolioSummary();
  }, [projects]);

  const conflicts: InventoryConflictItem[] = useMemo(() => {
    return ProjectManagementService.detectInventoryConflicts();
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
          p.leadUserName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, selectedCategory, selectedStatus, searchQuery]);

  // Handlers
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Project name is required', 'error');
      return;
    }
    const created = ProjectManagementService.createProject(
      {
        code: newCode || `PRJ-EXP-${Date.now().toString().slice(-4)}`,
        name: newName,
        category: newCategory,
        clientName: newClient || 'General Institutional Client',
        budgetINR: newBudget,
        invoicedRevenueINR: newRevenue,
        priority: newPriority,
        startDate: newStartDate,
        targetDeliveryDate: newDeliveryDate,
        leadUserId: user?.id || 'usr-admin-01',
        leadUserName: user?.name || 'Dr. Samartha HM',
        assignedUserIds: [user?.id || 'usr-admin-01'],
        assignedUserNames: [user?.name || 'Dr. Samartha HM'],
        batchConfigurations: [
          { gradeOrKitId: 'Grade 10', kitName: 'Grade 10 STEM Science & Math', targetQuantity: 10 }
        ]
      },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: user?.role || 'admin' }
    );

    setProjects([...ProjectManagementService.getAllProjects()]);
    setSelectedProjectId(created.id);
    setIsCreateModalOpen(false);
    showToast(`Project ${created.name} initiated successfully!`, 'success');
  };

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !expDescription.trim() || expAmount <= 0) {
      showToast('Valid description and amount required', 'error');
      return;
    }

    const exp = ProjectManagementService.logProjectExpense(
      selectedProject.id,
      {
        date: new Date().toISOString().split('T')[0],
        category: expCategory,
        description: expDescription,
        amountINR: expAmount,
        loggedByUserId: user?.id || 'usr-admin-01',
        loggedByUserName: user?.name || 'Dr. Samartha HM',
        receiptOrPoRef: expRef || undefined
      },
      { id: user?.id || 'usr-admin-01', name: user?.name || 'Dr. Samartha HM', role: user?.role || 'admin' }
    );

    if (exp) {
      setProjects([...ProjectManagementService.getAllProjects()]);
      setIsExpenseModalOpen(false);
      setExpDescription('');
      setExpAmount(5000);
      setExpRef('');
      showToast(`Logged ₹${exp.amountINR.toLocaleString('en-IN')} under ${exp.category}!`, 'success');
    }
  };

  const handleExecuteSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const updated = ProjectManagementService.signOffProjectQA(selectedProject.id, {
      userId: user?.id || 'usr-admin-01',
      userName: user?.name || 'Dr. Samartha HM',
      role: user?.role || 'admin',
      comments: signOffComments || 'All batch kits inspected, packaged, and verified under 21 CFR Part 11 standards.'
    });

    if (updated) {
      setProjects([...ProjectManagementService.getAllProjects()]);
      setIsSignOffModalOpen(false);
      setSignOffComments('');
      showToast(`21 CFR Part 11 Electronic Signature executed for ${updated.name}!`, 'success');
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'ASSEMBLY_QC':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Assembly & QC</span>;
      case 'IN_PREP':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> In Prep</span>;
      case 'PROCURING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Truck className="w-3 h-3" /> Procuring</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Planning</span>;
    }
  };

  const getCategoryBadge = (cat: ProjectCategory) => {
    switch (cat) {
      case 'STEM_CURRICULUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">STEM Curriculum</span>;
      case 'IOT_HARDWARE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">IoT Hardware</span>;
      case 'CUSTOM_INSTITUTIONAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Custom B2B</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">R&D Prototype</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== 1. Portfolio Cockpit Header ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 md:p-8 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
                <FolderKanban className="w-3.5 h-3.5" /> Multi-Project Portfolio Command
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> 21 CFR Part 11 Audit
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Projects & Financial Cost Accounting Hub
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Manage multiple concurrent manufacturing runs, school curriculum batches, and IoT hardware projects with isolated cost centers, live P&L accounting, and operator traceability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all scale-105"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
            <button
              onClick={() => setIsConflictModalOpen(true)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                conflicts.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Stock Conflicts ({conflicts.length})</span>
            </button>
          </div>
        </div>

        {/* Global Portfolio KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Active Initiatives</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">{portfolioSummary.activeProjectsCount} / {portfolioSummary.totalProjects}</div>
            <div className="text-[10px] text-slate-400 mt-1">Concurrent production runs</div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Portfolio Revenue</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">₹{portfolioSummary.totalRevenueINR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400 mt-1">Invoiced Institutional Orders</div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Expenses</div>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">₹{portfolioSummary.totalExpensesINR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400 mt-1">Material, Laser & Aliquots</div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Portfolio Gross Margin</div>
            <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">{portfolioSummary.overallGrossMarginPercent}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Net: ₹{portfolioSummary.overallGrossMarginINR.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* ===== 2. Multi-Project Selector & Cards ===== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" /> Active Project Roster
            </h2>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {filteredProjects.length}
            </span>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Categories</option>
              <option value="STEM_CURRICULUM">STEM Curriculum</option>
              <option value="IOT_HARDWARE">IoT Hardware</option>
              <option value="CUSTOM_INSTITUTIONAL">Custom B2B</option>
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(p => {
            const isSelected = p.id === selectedProjectId;
            const expTotal = p.expenses.reduce((a, b) => a + b.amountINR, 0);
            const budgetUsedPct = p.budgetINR > 0 ? Math.min(100, Math.round((expTotal / p.budgetINR) * 100)) : 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {p.code}
                      </span>
                      {getCategoryBadge(p.category)}
                    </div>
                    <h3 className="font-bold text-white text-sm mt-1.5 line-clamp-1">{p.name}</h3>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Budget / Spent</div>
                    <div className="font-bold text-slate-200 font-mono text-[11px]">
                      ₹{expTotal.toLocaleString('en-IN')} / ₹{p.budgetINR.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Target Delivery</div>
                    <div className="font-bold text-amber-300 font-mono text-[11px]">
                      📅 {p.targetDeliveryDate}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetUsedPct > 90 ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${budgetUsedPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Lead: <strong className="text-slate-200">{p.leadUserName}</strong></span>
                  <span className="text-indigo-400 font-bold flex items-center gap-0.5 hover:underline">
                    View Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 3. Focused Project Workspace ===== */}
      {selectedProject && selectedFinancials && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {selectedProject.code}
                </span>
                {getCategoryBadge(selectedProject.category)}
                {getStatusBadge(selectedProject.status)}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{selectedProject.name}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Client: <strong className="text-slate-200">{selectedProject.clientName}</strong></span>
                <span>•</span>
                <span>Lead: <strong className="text-indigo-300">{selectedProject.leadUserName}</strong></span>
              </div>
            </div>

            {/* Action Buttons for Selected Project */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <DollarSign className="w-4 h-4" /> Log Expense
              </button>
              <button
                onClick={() => setIsSignOffModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Lock className="w-4 h-4" /> 21 CFR Sign-Off
              </button>
            </div>
          </div>

          {/* Sub-Tabs for Focused Project */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveProjectTab('sourcing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProjectTab === 'sourcing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> Sourcing & Batch Config
            </button>
            <button
              onClick={() => setActiveProjectTab('financials')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProjectTab === 'financials'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-4 h-4" /> Project Financials & P&L
            </button>
            <button
              onClick={() => setActiveProjectTab('team')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProjectTab === 'team'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Operator Profiles & Audit ({selectedProject.auditLogs.length})
            </button>
            <button
              onClick={() => setActiveProjectTab('timeline')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeProjectTab === 'timeline'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" /> Milestones & Timeline
            </button>
          </div>

          {/* Sub-Tab 1: Sourcing & Batch Config */}
          {activeProjectTab === 'sourcing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {selectedProject.batchConfigurations.map((batch, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-indigo-400 font-mono uppercase">{batch.gradeOrKitId}</div>
                    <div className="text-sm font-bold text-white">{batch.kitName}</div>
                    <div className="text-xs text-slate-400">Target Production: <strong className="text-white font-mono">{batch.targetQuantity} complete sets</strong></div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">Direct Production Execution</div>
                  <div className="text-xs text-slate-400">Jump directly to the interactive 5-channel sourcing workbench filtered for this project.</div>
                </div>
                <button
                  onClick={() => showToast('Switched project filter in Production Matrix!', 'success')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" /> Open in Production Matrix
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Financials & Cost Center */}
          {activeProjectTab === 'financials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Approved Budget</div>
                  <div className="text-xl font-black text-white font-mono mt-1">₹{selectedFinancials.budgetINR.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Expenses</div>
                  <div className="text-xl font-black text-purple-400 font-mono mt-1">₹{selectedFinancials.totalExpensesINR.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Invoiced Revenue</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">₹{selectedFinancials.invoicedRevenueINR.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Gross Margin</div>
                  <div className="text-xl font-black text-cyan-400 font-mono mt-1">{selectedFinancials.grossMarginPercent}%</div>
                  <div className="text-[10px] text-slate-400">Net: ₹{selectedFinancials.grossMarginINR.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Cost Center Category Breakdown */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-400" /> Cost Center Allocation Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(selectedFinancials.expensesByCategory).map(([cat, amount]) => (
                    <div key={cat} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{cat.replace('_', ' ')}</div>
                      <div className="text-sm font-bold text-white font-mono mt-1">₹{amount.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logged Expenses List */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Expense Ledger ({selectedProject.expenses.length})</h3>
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white"
                  >
                    + Add Entry
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                  {selectedProject.expenses.map(exp => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{exp.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {exp.date} • {exp.category} • Logged by {exp.loggedByUserName}
                          {exp.receiptOrPoRef && ` • Ref: ${exp.receiptOrPoRef}`}
                        </div>
                      </div>
                      <div className="font-bold text-emerald-400 font-mono text-sm">
                        ₹{exp.amountINR.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Team & Operator Profiles */}
          {activeProjectTab === 'team' && (
            <div className="space-y-6">
              {/* QA Sign-off Banner if present */}
              {selectedProject.qaSignOff && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-4 h-4" /> 21 CFR Part 11 Electronic Signature Verified
                    </div>
                    <div className="text-sm font-bold text-white">Signed by {selectedProject.qaSignOff.signedBy} ({selectedProject.qaSignOff.role})</div>
                    <div className="text-xs text-slate-400 font-mono">Digest: {selectedProject.qaSignOff.signatureDigest}</div>
                    <div className="text-xs text-slate-300 italic">"{selectedProject.qaSignOff.comments}"</div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    Compliant
                  </span>
                </div>
              )}

              {/* Assigned Operators */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Assigned Team & Operators
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.assignedUserNames.map((name, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                      👤 {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chronological Audit Trail */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" /> Chronological Operator Audit Trail
                </h3>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedProject.auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-300 font-mono">👤 {log.userName} ({log.userRole})</span>
                        <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-slate-200">{log.details}</div>
                      {log.signatureDigest && (
                        <div className="text-[10px] text-slate-500 font-mono">Digest: {log.signatureDigest}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Milestones & Timeline */}
          {activeProjectTab === 'timeline' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Project Milestones & Delivery Schedule</h3>
                  <div className="text-xs font-mono text-amber-400">Target: {selectedProject.targetDeliveryDate}</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Phase 1: BOM Requisition & Sourcing Allocation</span>
                    </div>
                    <span className="text-emerald-400 font-bold">Done</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white">Phase 2: Chemical Aliquots & FabLab Laser Cutting</span>
                    </div>
                    <span className="text-purple-400 font-bold">In Progress</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-400">Phase 3: Color-Coded Pouch Bagging & Master Crate Packing</span>
                    </div>
                    <span className="text-slate-500 font-bold">Pending</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-400">Phase 4: 21 CFR Part 11 Electronic Signature QA Sign-Off</span>
                    </div>
                    <span className="text-slate-500 font-bold">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 4. Modal: Create New Project ===== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Initiate New Educational Project
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Project Code</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder="e.g. PRJ-HUBLI-006"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="STEM_CURRICULUM">STEM Curriculum</option>
                    <option value="IOT_HARDWARE">IoT Hardware</option>
                    <option value="CUSTOM_INSTITUTIONAL">Custom B2B</option>
                    <option value="R_AND_D_PROTOTYPE">R&D Prototype</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Hubli ATL Tinkering Lab Deployment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Client / School</label>
                <input
                  type="text"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  placeholder="e.g. Hubli Public School Cluster"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Approved Budget (₹)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={e => setNewBudget(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Invoiced Revenue (₹)</label>
                  <input
                    type="number"
                    value={newRevenue}
                    onChange={e => setNewRevenue(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Target Delivery</label>
                  <input
                    type="date"
                    value={newDeliveryDate}
                    onChange={e => setNewDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 5. Modal: Log Expense ===== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" /> Log Project Cost / Expense
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Cost Center Category</label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="MATERIAL">Material / Inventory</option>
                  <option value="LASER_MACHINE">Laser Cutting & Machine Time</option>
                  <option value="CHEMICAL_PREP">Chemical Aliquoting & Dilutions</option>
                  <option value="VENDOR_PO">Vendor Purchase Order</option>
                  <option value="SHIPPING">Shipping & Logistics</option>
                  <option value="LABOR">Direct Labor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  placeholder="e.g. 50x Dropper Bottles + Dilute HCl transfer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={expAmount}
                    onChange={e => setExpAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Receipt / PO Ref</label>
                  <input
                    type="text"
                    value={expRef}
                    onChange={e => setExpRef(e.target.value)}
                    placeholder="e.g. PO-2026-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                >
                  Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 6. Modal: Cross-Project Inventory Conflict Analyzer ===== */}
      {isConflictModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" /> Cross-Project Inventory Conflict Analyzer
                </h3>
                <div className="text-xs text-slate-400">Components where total demand across all active concurrent projects exceeds warehouse stock.</div>
              </div>
              <button onClick={() => setIsConflictModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No stock contention detected! All active projects are fully supported by warehouse inventory.
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.slice(0, 10).map((conf, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-rose-400 font-bold">{conf.activityCode}</span> • <strong className="text-white">{conf.materialName}</strong>
                      </div>
                      <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Deficit: {conf.globalDeficit} units (₹{conf.estimatedCostINR.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Total Demand: <strong className="text-slate-200">{conf.totalRequiredAcrossProjects}</strong> | Available Stock: <strong className="text-slate-200">{conf.availableStock}</strong>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {conf.competingProjects.map((comp, j) => (
                        <span key={j} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                          {comp.projectCode}: {comp.qtyRequired} units
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    showToast('Consolidated Purchase Order generated for all deficit items!', 'success');
                    setIsConflictModalOpen(false);
                  }}
                  className="w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-600/30 text-xs flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" /> Generate Consolidated Vendor Purchase Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 7. Modal: 21 CFR Part 11 Electronic Signature QA Sign-Off ===== */}
      {isSignOffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" /> 21 CFR Part 11 Electronic Signature Sign-Off
                </h3>
                <div className="text-xs text-slate-400">Final Quality Assurance verification and immutable sign-off.</div>
              </div>
              <button onClick={() => setIsSignOffModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSignOff} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] text-slate-400">Signing Operator: <strong className="text-white">{user?.name || 'Dr. Samartha HM'} ({user?.role || 'admin'})</strong></div>
                <div className="text-[11px] text-slate-400">Project: <strong className="text-emerald-300">{selectedProject?.name} ({selectedProject?.code})</strong></div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Inspector Verification Comments *</label>
                <textarea
                  rows={3}
                  value={signOffComments}
                  onChange={e => setSignOffComments(e.target.value)}
                  placeholder="e.g. Verified all 10 STEM sets for Karwar region. Lenses checked for clarity, chemicals leak-tested, and laser parts sanded."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                By submitting, a SHA-256 cryptographic digest will be generated and bound to your user account profile, sealing the project as COMPLETED.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSignOffModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                >
                  Sign & Authorize Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
