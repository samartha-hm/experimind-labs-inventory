import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';

import { useAuth } from '@/src/AuthContext';
import UserProfileModal from '@/src/shared/components/UserProfileModal';
import {
  getGroupDefaultTab,
  getGroupForTab,
  getVisibleGroups,
} from '@/src/features/core/navigation';
import { normalizePlatformRole, type PlatformRole } from '@/src/features/core/workspacePolicy';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string | null;
  onSignOut: () => void;
  lowStockCount?: number;
  openPoCount?: number;
  openSoCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const roleLabels: Record<PlatformRole, string> = {
  admin: 'Administrator',
  inventory_staff: 'Inventory Staff',
  project_staff: 'Project Staff',
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  role,
  onSignOut,
  lowStockCount = 0,
  openPoCount = 0,
  openSoCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const groups = getVisibleGroups(role);
  const activeGroup = getGroupForTab(activeTab);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(activeGroup ? [activeGroup.id] : []),
  );

  const activeGroupId = activeGroup?.id;
  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroups((prev) => {
        if (prev.has(activeGroupId)) return prev;
        const next = new Set(prev);
        next.add(activeGroupId);
        return next;
      });
    }
  }, [activeGroupId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;
    if (deltaX > 45 && onCloseMobile) {
      onCloseMobile();
    }
    touchStartX.current = null;
  };

  const badgeFor = (tabId: string): { text: string; classes: string } | undefined => {
    if (tabId === 'inventory' && lowStockCount > 0) {
      return {
        text: `${lowStockCount}`,
        classes: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
      };
    }
    if (tabId === 'purchase_orders' && openPoCount > 0) {
      return {
        text: `${openPoCount}`,
        classes: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
      };
    }
    if (tabId === 'sales_orders' && openSoCount > 0) {
      return {
        text: `${openSoCount}`,
        classes: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
      };
    }
    return undefined;
  };

  const navigate = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const itemClasses = (isActive: boolean): string =>
    `w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
      isActive
        ? 'bg-indigo-600 text-white font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  const renderBadge = (tabId: string, isActive: boolean) => {
    const badge = badgeFor(tabId);
    if (!badge) return null;
    return (
      <span
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
          isActive ? 'bg-white/20 text-white border-white/30' : badge.classes
        }`}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-64 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex flex-col h-screen fixed md:sticky top-0 shrink-0 border-r border-slate-200 dark:border-slate-800 z-50 transition-transform duration-300 ease-out overscroll-contain ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="block font-extrabold text-slate-900 dark:text-white tracking-tight text-sm">
                Experimind Labs
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Inventory Operations</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-target flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 overscroll-contain">
          {groups.map((group) => {
            const isActiveGroup = activeGroup?.id === group.id;
            const isExpanded = expandedGroups.has(group.id);

            if (group.items.length === 1) {
              const item = group.items[0];
              const isActive = activeTab === item.tabId;
              const ItemIcon = item.icon;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => navigate(item.tabId)}
                  className={itemClasses(isActive)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <ItemIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.label}</span>
                  </span>
                  {renderBadge(item.tabId, isActive)}
                </button>
              );
            }

            const GroupIcon = group.icon;
            const defaultTab = getGroupDefaultTab(group);
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedGroups((prev) => new Set(prev).add(group.id));
                    navigate(defaultTab);
                  }}
                  className={itemClasses(isActiveGroup && activeTab === defaultTab)}
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-2.5">
                    <GroupIcon
                      className={`w-4 h-4 ${
                        isActiveGroup ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{group.label}</span>
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.tabId;
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.tabId}
                          type="button"
                          onClick={() => navigate(item.tabId)}
                          className={itemClasses(isActive)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="flex items-center gap-2.5">
                            <ItemIcon
                              className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                            />
                            <span>{item.label}</span>
                          </span>
                          {renderBadge(item.tabId, isActive)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: Profile, Role, Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer text-left group"
            title="Manage profile & password"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'My Profile'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {roleLabels[normalizePlatformRole(role)]}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
