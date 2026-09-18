import React, { useState, useMemo, useEffect } from 'react';
import {
  Tag,
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  Box,
  Package,
  Search,
  Filter,
  QrCode,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
  ArrowUpRight,
  ExternalLink,
  Barcode,
  Calendar,
  UserCheck,
  Info,
  Sliders,
  Eye,
  RefreshCw,
  FolderKanban
} from 'lucide-react';
import {
  StickerRecord,
  StickerTier,
  StickerStatus,
  ChapterBoxMapping,
  DEFAULT_CHAPTER_BOX_MAPPINGS
} from '../../data/stickerDataset';
import { StickerTrackingService, StickerProjectSummary } from '../../services/StickerTrackingService';
import { INITIAL_PROJECTS, Project } from '../../data/projectsDataset';
import { ProjectManagementService } from '../../services/ProjectManagementService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../AuthContext';

interface StickerMonitoringHubTabProps {
  initialProjectId?: string;
  embeddedMode?: boolean;
}

export default function StickerMonitoringHubTab({
  initialProjectId,
  embeddedMode = false
}: StickerMonitoringHubTabProps = {}) {
  const { showToast } = useToast();
  const { user } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>(() => ProjectManagementService.getAllProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || 'PRJ-001'
  );
  const [stickers, setStickers] = useState<StickerRecord[]>(() =>
    StickerTrackingService.getStickersByProject(initialProjectId || projects[0]?.id || 'PRJ-001')
  );
  const [selectedTier, setSelectedTier] = useState<StickerTier | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StickerStatus | 'ALL'>('ALL');
  const [selectedBoxId, setSelectedBoxId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStickerIds, setSelectedStickerIds] = useState<Set<string>>(new Set());
  const [previewSticker, setPreviewSticker] = useState<StickerRecord | null>(null);
  const [scanBarcodeQuery, setScanBarcodeQuery] = useState<string>('');
  const [boxMappings] = useState<ChapterBoxMapping[]>(() => StickerTrackingService.getChapterBoxMappings());

  // Listen to project updates
  useEffect(() => {
    const handleProjectsUpdate = () => {
      const updatedProjects = ProjectManagementService.getAllProjects();
      setProjects(updatedProjects);
      if (selectedProjectId) {
        setStickers(StickerTrackingService.getStickersByProject(selectedProjectId));
      }
    };
    window.addEventListener('experimind_projects_updated', handleProjectsUpdate);
    window.addEventListener('experimind_stickers_updated', handleProjectsUpdate);
    return () => {
      window.removeEventListener('experimind_projects_updated', handleProjectsUpdate);
      window.removeEventListener('experimind_stickers_updated', handleProjectsUpdate);
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
      setStickers(StickerTrackingService.getStickersByProject(initialProjectId));
    }
  }, [initialProjectId]);

  // Selected Project Details
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Switch project handler
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const updated = StickerTrackingService.getStickersByProject(projId);
    setStickers(updated);
    setSelectedStickerIds(new Set());
  };

  // Summary Metrics
  const summary: StickerProjectSummary = useMemo(() => {
    return StickerTrackingService.getStickerSummary(selectedProjectId);
  }, [selectedProjectId, stickers]);

  // Filtered Stickers
  const filteredStickers = useMemo(() => {
    return stickers.filter(s => {
      if (selectedTier !== 'ALL' && s.tier !== selectedTier) return false;
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
      if (selectedBoxId !== 'ALL' && s.boxId !== selectedBoxId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.labelTitle.toLowerCase().includes(q);
        const matchesSubtitle = s.subtitle.toLowerCase().includes(q);
        const matchesCode = s.activityCode?.toLowerCase().includes(q);
        const matchesItem = s.itemName?.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesBox = s.boxNumber?.toString().includes(q);
        if (!matchesTitle && !matchesSubtitle && !matchesCode && !matchesItem && !matchesId && !matchesBox) {
          return false;
        }
      }
      return true;
    });
  }, [stickers, selectedTier, selectedStatus, selectedBoxId, searchQuery]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedStickerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStickerIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedStickerIds.size === filteredStickers.length) {
      setSelectedStickerIds(new Set());
    } else {
      setSelectedStickerIds(new Set(filteredStickers.map(s => s.id)));
    }
  };

  // Status transitions
  const handleMarkSelectedPrinted = () => {
    if (selectedStickerIds.size === 0) return;
    const operator = {
      id: user?.id || 'usr-tech-01',
      name: user?.name || 'Lead Technician'
    };

    const ids: string[] = Array.from(selectedStickerIds);
    StickerTrackingService.batchUpdateStatus(ids, 'PRINTED', operator);
    setStickers(StickerTrackingService.getStickersByProject(selectedProjectId));
    setSelectedStickerIds(new Set<string>());
    showToast(`Marked ${ids.length} stickers as Printed & Ready to Affix`, 'success');
  };

  const handleMarkSelectedAffixed = () => {
    if (selectedStickerIds.size === 0) return;
    const operator = {
      id: user?.id || 'usr-qa-01',
      name: user?.name || 'QA Verification Specialist'
    };

    const ids: string[] = Array.from(selectedStickerIds);
    StickerTrackingService.batchUpdateStatus(ids, 'AFFIXED_AND_VERIFIED', operator, 'Operator verified affixed to target surface');
    setStickers(StickerTrackingService.getStickersByProject(selectedProjectId));
    setSelectedStickerIds(new Set<string>());
    showToast(`Marked ${ids.length} stickers as Affixed & Verified on physical items`, 'success');
  };

  // Quick single update
  const handleSingleStatusUpdate = (sticker: StickerRecord, newStatus: StickerStatus) => {
    const operator = {
      id: user?.id || 'usr-op-01',
      name: user?.name || 'Assembly Operator'
    };

    StickerTrackingService.updateStickerStatus(sticker.id, newStatus, operator, `Updated via Sticker Cockpit to ${newStatus}`);
    setStickers(StickerTrackingService.getStickersByProject(selectedProjectId));
    showToast(`Sticker ${sticker.id} updated to ${newStatus.replace('_', ' ')}`, 'info');
  };

  // Quick Scan to Affix
  const handleScanBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBarcodeQuery.trim()) return;

    const query = scanBarcodeQuery.trim().toUpperCase();
    const found = stickers.find(s => s.id.toUpperCase() === query || s.itemId?.toUpperCase() === query || s.activityCode?.toUpperCase() === query);

    if (found) {
      handleSingleStatusUpdate(found, 'AFFIXED_AND_VERIFIED');
      setScanBarcodeQuery('');
      setPreviewSticker(found);
      showToast(`Scanned & Verified: ${found.labelTitle}`, 'success');
    } else {
      showToast(`No matching sticker found for barcode payload "${query}"`, 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-300 shadow-inner">
                <Tag className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Sticker & Label Lifecycle Monitor
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    3-Tier Verification
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Monitor all required Activity Pack, Chapter Box, and Component labels from Print Queue to Physical Affixing.
                </p>
              </div>
            </div>
          </div>

          {/* Project Context Switcher */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 shadow-lg">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Active Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                aria-label="Select Project"
                className="bg-transparent font-bold text-white outline-none cursor-pointer text-sm"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stickers Required</span>
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{summary.totalRequired}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Box: {summary.tierBreakdown.BOX_CRATE.total}</span> •
            <span>Pouch: {summary.tierBreakdown.ACTIVITY_POUCH.total}</span> •
            <span>Item: {summary.tierBreakdown.COMPONENT_ITEM.total}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Print Queue Status</span>
            <Printer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{summary.printedCount}</span>
            <span className="text-xs text-slate-400 font-bold">/ {summary.totalRequired} ({summary.overallPrintedPercentage}%)</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.overallPrintedPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Physical Affixed & Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{summary.affixedCount}</span>
            <span className="text-xs text-slate-400 font-bold">/ {summary.totalRequired} ({summary.overallAffixedPercentage}%)</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.overallAffixedPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Affixing</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">{summary.totalRequired - summary.affixedCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.queuedCount} unprinted • {summary.printedCount - summary.affixedCount} printed awaiting placement
          </div>
        </div>
      </div>

      {/* Chapter-to-Box Grouping Visual Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Chapter-to-Box Grouping & Packing Progress</h2>
          </div>
          <span className="text-xs text-slate-400">
            {boxMappings.length} Configured Boxes & Master Crate
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {summary.boxBreakdown.map((box) => {
            const isSelected = selectedBoxId === box.boxId;
            return (
              <button
                key={box.boxId}
                onClick={() => setSelectedBoxId(isSelected ? 'ALL' : box.boxId)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      Box {box.boxNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{box.grade}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{box.boxName}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {DEFAULT_CHAPTER_BOX_MAPPINGS.find(m => m.boxId === box.boxId)?.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Stickers Affixed:</span>
                    <span className="font-bold text-emerald-400">
                      {box.affixedCount} / {box.totalStickers} ({box.affixedPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${box.affixedPercentage}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Operations Matrix & Filter Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Tier Filters */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedTier('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedTier === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Tiers
              </button>
              <button
                onClick={() => setSelectedTier('BOX_CRATE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  selectedTier === 'BOX_CRATE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" /> Box ({summary.tierBreakdown.BOX_CRATE.total})
              </button>
              <button
                onClick={() => setSelectedTier('ACTIVITY_POUCH')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  selectedTier === 'ACTIVITY_POUCH' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Activity Pack ({summary.tierBreakdown.ACTIVITY_POUCH.total})
              </button>
              <button
                onClick={() => setSelectedTier('COMPONENT_ITEM')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  selectedTier === 'COMPONENT_ITEM' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" /> Component ({summary.tierBreakdown.COMPONENT_ITEM.total})
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              aria-label="Filter by Status"
              className="bg-slate-950 text-xs font-bold text-slate-300 border border-slate-800 px-3 py-2 rounded-xl outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="QUEUED_TO_PRINT">⏳ Queued to Print</option>
              <option value="PRINTED">🖨️ Printed (Awaiting Placement)</option>
              <option value="AFFIXED_AND_VERIFIED">✅ Affixed & Verified</option>
            </select>
          </div>

          {/* Search & Quick Barcode Scan */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sticker title, SKU, chapter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Quick Barcode Scan Input */}
            <form onSubmit={handleScanBarcodeSubmit} className="flex items-center gap-1">
              <div className="relative">
                <Barcode className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Scan to Affix..."
                  value={scanBarcodeQuery}
                  onChange={(e) => setScanBarcodeQuery(e.target.value)}
                  className="pl-9 pr-2 py-1.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 placeholder-emerald-500/60 outline-none focus:border-emerald-500 w-36 font-mono"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Batch Action Toolbar (When Items Selected) */}
        {selectedStickerIds.size > 0 && (
          <div className="bg-indigo-950/70 border border-indigo-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>{selectedStickerIds.size} stickers selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkSelectedPrinted}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Mark as Printed
              </button>
              <button
                onClick={handleMarkSelectedAffixed}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Mark as Affixed & Verified
              </button>
            </div>
          </div>
        )}

        {/* Table of Stickers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10">
                  <button
                    onClick={handleSelectAllFiltered}
                    className="text-slate-400 hover:text-white"
                  >
                    {selectedStickerIds.size === filteredStickers.length && filteredStickers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Tier & ID</th>
                <th className="py-3 px-3">Label Title & Details</th>
                <th className="py-3 px-3">Box / Placement</th>
                <th className="py-3 px-3">Dimensions</th>
                <th className="py-3 px-3">Lifecycle Status</th>
                <th className="py-3 px-3">Operator Verification</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStickers.map((sticker) => {
                const isSelected = selectedStickerIds.has(sticker.id);
                return (
                  <tr
                    key={sticker.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-950/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleSelect(sticker.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Tier & ID */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {sticker.tier === 'BOX_CRATE' && (
                          <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            <Box className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {sticker.tier === 'ACTIVITY_POUCH' && (
                          <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <Package className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {sticker.tier === 'COMPONENT_ITEM' && (
                          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Tag className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 block">{sticker.id}</span>
                          <span className="text-[11px] font-bold text-slate-300">{sticker.tier.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Label Title & Details */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs">{sticker.labelTitle}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{sticker.subtitle}</div>
                      {sticker.hazardBadges && sticker.hazardBadges.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {sticker.hazardBadges.map((h, i) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ⚠️ {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Box Placement */}
                    <td className="py-3 px-3">
                      {sticker.boxNumber ? (
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 font-bold text-[11px]">
                          Box {sticker.boxNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Universal Crate</span>
                      )}
                    </td>

                    {/* Dimensions */}
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {sticker.dimensionsMm.width} × {sticker.dimensionsMm.height} mm
                    </td>

                    {/* Lifecycle Status */}
                    <td className="py-3 px-3">
                      {sticker.status === 'QUEUED_TO_PRINT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" /> Queued
                        </span>
                      )}
                      {sticker.status === 'PRINTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Printer className="w-3 h-3 text-amber-400" /> Printed
                        </span>
                      )}
                      {sticker.status === 'AFFIXED_AND_VERIFIED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Affixed
                        </span>
                      )}
                    </td>

                    {/* Operator Verification */}
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {sticker.affixedByUserName ? (
                        <div>
                          <span className="text-emerald-400 font-bold block">{sticker.affixedByUserName}</span>
                          <span className="text-[10px] text-slate-500">{new Date(sticker.affixedAt!).toLocaleDateString()}</span>
                        </div>
                      ) : sticker.printedByUserName ? (
                        <div>
                          <span className="text-amber-400 font-bold block">{sticker.printedByUserName}</span>
                          <span className="text-[10px] text-slate-500">Printed: {new Date(sticker.printedAt!).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewSticker(sticker)}
                          title="Preview Sticker Layout"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {sticker.status === 'QUEUED_TO_PRINT' && (
                          <button
                            onClick={() => handleSingleStatusUpdate(sticker, 'PRINTED')}
                            title="Mark as Printed"
                            className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white text-[10px] font-bold border border-amber-500/40 transition-colors"
                          >
                            Mark Printed
                          </button>
                        )}

                        {sticker.status === 'PRINTED' && (
                          <button
                            onClick={() => handleSingleStatusUpdate(sticker, 'AFFIXED_AND_VERIFIED')}
                            title="Mark as Affixed"
                            className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold border border-emerald-500/40 transition-colors"
                          >
                            Mark Affixed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Sticker Preview Modal */}
      {previewSticker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Sticker Layout & Physical Label Spec</h3>
              </div>
              <button
                onClick={() => setPreviewSticker(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Virtual Physical Sticker Preview (Simulated Printed Label) */}
            <div className="p-5 bg-white text-slate-950 rounded-xl shadow-2xl border-4 border-slate-300 font-sans space-y-3">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    EXPERIMIND LABS • {previewSticker.tier.replace('_', ' ')}
                  </div>
                  <h4 className="text-base font-black leading-tight">{previewSticker.labelTitle}</h4>
                  <div className="text-xs font-semibold text-slate-600">{previewSticker.subtitle}</div>
                </div>
                <div className="p-2 bg-slate-100 border border-slate-300 rounded flex flex-col items-center">
                  <QrCode className="w-12 h-12 text-slate-950" />
                  <span className="text-[8px] font-mono mt-0.5">SCAN VERIFIED</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {previewSticker.details.map((d, i) => (
                  <div key={i} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">{d.key}</span>
                    <span className="font-bold text-slate-900 text-xs">{d.value}</span>
                  </div>
                ))}
              </div>

              {previewSticker.hazardBadges && previewSticker.hazardBadges.length > 0 && (
                <div className="p-2 bg-rose-50 border border-rose-300 rounded flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>SAFETY NOTICE: {previewSticker.hazardBadges.join(', ')}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                <span>SKU: {previewSticker.id}</span>
                <span>SIZE: {previewSticker.dimensionsMm.width}x{previewSticker.dimensionsMm.height}mm</span>
                <span>STATUS: {previewSticker.status}</span>
              </div>
            </div>

            {/* Verification Metadata */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Project Code:</span>
                <span className="font-mono text-white font-bold">{previewSticker.projectCode}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Print Queue Timestamp:</span>
                <span className="text-slate-300">{previewSticker.printedAt ? new Date(previewSticker.printedAt).toLocaleString() : 'Not Yet Printed'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Affixed By Operator:</span>
                <span className="text-emerald-400 font-bold">{previewSticker.affixedByUserName || 'Pending Operator Action'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewSticker(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Close Preview
              </button>
              {previewSticker.status !== 'AFFIXED_AND_VERIFIED' && (
                <button
                  onClick={() => {
                    handleSingleStatusUpdate(previewSticker, 'AFFIXED_AND_VERIFIED');
                    setPreviewSticker(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  Verify & Affix Label
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
