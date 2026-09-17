import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Check,
  Package,
  Layers,
  MapPin,
  Tag,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  icon?: React.ReactNode;
  category?: string;
  sku?: string;
  binLocation?: string;
  stockQty?: number;
  threshold?: number;
  disabled?: boolean;
}

export interface SmartComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string, selectedOption?: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  isClearable?: boolean;
  className?: string;
  dropdownClassName?: string;
  renderOption?: (option: ComboboxOption, isSelected: boolean, isHighlighted: boolean) => React.ReactNode;
  renderSelected?: (option: ComboboxOption) => React.ReactNode;
  emptyMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export default function SmartCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search items, SKUs, bins...',
  label,
  disabled = false,
  required = false,
  isClearable = false,
  className = '',
  dropdownClassName = '',
  renderOption,
  renderSelected,
  emptyMessage = 'No matching items found.',
  size = 'md',
  id: customId
}: SmartComboboxProps) {
  const generatedId = useId();
  const comboboxId = customId || generatedId;
  const inputId = `${comboboxId}-input`;
  const listboxId = `${comboboxId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value);
  }, [options, value]);

  // Filtered Options with smart multi-attribute substring matching
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const terms = searchQuery.toLowerCase().trim().split(/\s+/);
    return options.filter(option => {
      const targetStr = [
        option.label,
        option.value,
        option.subtitle,
        option.badge,
        option.category,
        option.sku,
        option.binLocation
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return terms.every(term => targetStr.includes(term));
    });
  }, [options, searchQuery]);

  // Auto-reset highlight on search query change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listboxRef.current && filteredOptions.length > 0) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev + 1) % (filteredOptions.length || 1));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            onChange(opt.value, opt);
            setIsOpen(false);
          }
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  const handleSelectOption = (option: ComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-indigo-500/30 text-indigo-200 font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl min-h-[34px]',
    md: 'px-3.5 py-2.5 text-xs rounded-xl min-h-[42px]',
    lg: 'px-4 py-3 text-sm rounded-2xl min-h-[48px]'
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/90 border transition-all text-left font-medium cursor-pointer shadow-xs select-none ${
          sizeClasses[size]
        } ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedOption ? (
            renderSelected ? (
              renderSelected(selectedOption)
            ) : (
              <div className="flex items-center gap-2 truncate">
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <div className="truncate flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="font-bold text-slate-900 dark:text-white truncate">
                    {selectedOption.label}
                  </span>
                  {selectedOption.sku && (
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                      {selectedOption.sku}
                    </span>
                  )}
                  {selectedOption.binLocation && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 shrink-0">
                      <MapPin className="w-2.5 h-2.5" />
                      {selectedOption.binLocation}
                    </span>
                  )}
                </div>
              </div>
            )
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {isClearable && selectedOption && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-500' : ''
            }`}
          />
        </div>
      </button>

      {/* Accessible Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-2 z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 space-y-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ${dropdownClassName}`}
        >
          {/* In-Dropdown Search Filter Bar */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              role="searchbox"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-8.5 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options Listbox */}
          <ul
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            aria-label={label || placeholder}
            className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar focus:outline-none"
          >
            {filteredOptions.length === 0 ? (
              <li className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                <span>{emptyMessage}</span>
                {searchQuery && (
                  <span className="text-[10px] text-slate-500">
                    No results matching &quot;{searchQuery}&quot;
                  </span>
                )}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    id={`${comboboxId}-opt-${index}`}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed bg-transparent'
                        : isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected, isHighlighted)
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {option.icon ? (
                          <span className="shrink-0">{option.icon}</span>
                        ) : (
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold truncate">
                              {searchQuery ? highlightMatch(option.label, searchQuery) : option.label}
                            </span>
                            {option.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                  isSelected
                                    ? 'bg-indigo-700 text-indigo-100'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                                }`}
                              >
                                {option.badge}
                              </span>
                            )}
                          </div>

                          {(option.subtitle || option.sku || option.binLocation) && (
                            <div className="flex items-center gap-2 text-[10px] mt-0.5 opacity-80 flex-wrap">
                              {option.sku && (
                                <span className="font-mono">
                                  SKU: {searchQuery ? highlightMatch(option.sku, searchQuery) : option.sku}
                                </span>
                              )}
                              {option.binLocation && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {option.binLocation}
                                </span>
                              )}
                              {option.subtitle && <span>{option.subtitle}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stock level indicator / checkmark */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {typeof option.stockQty === 'number' && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            isSelected
                              ? 'bg-indigo-700 text-white'
                              : option.stockQty <= (option.threshold ?? 5)
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                          }`}
                        >
                          {option.stockQty} in stock
                        </span>
                      )}

                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer info pill */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono px-1">
            <span>
              {filteredOptions.length} of {options.length} item(s)
            </span>
            <span>
              <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">↑↓</kbd> navigate •{' '}
              <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">Enter</kbd> select
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
