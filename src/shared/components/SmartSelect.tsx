import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SmartSelectProps {
  options: (SelectOption | string)[];
  value?: string;
  onChange: (value: string, selectedOption?: SelectOption) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownClassName?: string;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export function normalizeSelectOptions(rawOptions: (SelectOption | string)[]): SelectOption[] {
  return rawOptions.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });
}

export default function SmartSelect({
  options: rawOptions,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  disabled = false,
  required = false,
  className = '',
  dropdownClassName = '',
  id: customId,
  size = 'md',
  'aria-label': ariaLabel,
}: SmartSelectProps) {
  const generatedId = useId();
  const selectId = customId || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions = useMemo(() => normalizeSelectOptions(rawOptions), [rawOptions]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Click outside and escape handling
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }
  }, [isOpen]);

  // Auto-focus search input when opening if many options
  useEffect(() => {
    if (isOpen && normalizedOptions.length > 8) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, normalizedOptions.length]);

  // Scroll highlighted into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value, opt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs min-h-[34px]',
    md: 'px-3 py-2 text-xs md:text-sm min-h-[40px]',
    lg: 'px-4 py-2.5 text-sm md:text-base min-h-[44px]',
  }[size];

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border transition-all cursor-pointer font-medium text-left ${sizeClasses} ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-700'
            : isOpen
              ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
        } ${className}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{selectedOption.icon}</span>
          )}
          <span className={selectedOption ? 'font-medium truncate' : 'text-slate-400 dark:text-slate-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-full min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn ${dropdownClassName}`}
        >
          {/* Quick search if > 8 options */}
          {normalizedOptions.length > 8 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Filter options..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <ul
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 text-xs overscroll-contain"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                No matching options
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                          : isHighlighted
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0 text-slate-400">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                            opt.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </span>

                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
