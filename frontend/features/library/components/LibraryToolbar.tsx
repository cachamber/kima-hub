"use client";

import { Shuffle } from "lucide-react";
import { cn } from "@/utils/cn";
import { LibraryFilter, SortOption } from "@/hooks/useQueries";
import { Tab } from "../types";

interface LibraryToolbarProps {
  activeTab: Tab;
  filter: LibraryFilter;
  sortBy: SortOption;
  itemsPerPage: number;
  onFilterChange: (filter: LibraryFilter) => void;
  onSortChange: (sort: SortOption) => void;
  onItemsPerPageChange: (items: number) => void;
  onShuffleLibrary: () => void;
}

const FILTER_PILLS: { label: string; value: LibraryFilter; color: string }[] = [
  { label: "Owned", value: "owned", color: "#eab308" },
  { label: "Discovery", value: "discovery", color: "#a855f7" },
  { label: "All", value: "all", color: "#ffffff" },
];

export function LibraryToolbar({
  activeTab,
  filter,
  sortBy,
  itemsPerPage,
  onFilterChange,
  onSortChange,
  onItemsPerPageChange,
  onShuffleLibrary,
}: LibraryToolbarProps) {
  const showFilters = activeTab === "artists" || activeTab === "albums";

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-white/5">
      {/* Filter pills - only for artists/albums */}
      {showFilters && (
        <div className="flex gap-1.5">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => onFilterChange(pill.value)}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                filter === pill.value
                  ? "bg-white/20 text-white border-2 border-white/30"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border-2 border-transparent"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* Sort dropdown */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="bg-[#181818] text-sm font-mono text-gray-300 rounded-lg px-4 py-2 border-2 border-white/10 focus:outline-none focus:border-[#eab308]/50 hover:border-white/20 transition-colors"
      >
        <option value="name">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        {activeTab === "albums" && <option value="recent">Year (Newest)</option>}
        {activeTab === "artists" && <option value="tracks">Most Tracks</option>}
      </select>

      {/* Items per page */}
      <select
        value={itemsPerPage}
        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        className="bg-[#181818] text-sm font-mono text-gray-300 rounded-lg px-4 py-2 border-2 border-white/10 focus:outline-none focus:border-[#eab308]/50 hover:border-white/20 transition-colors"
      >
        <option value={24}>24 / page</option>
        <option value={40}>40 / page</option>
        <option value={80}>80 / page</option>
        <option value={200}>200 / page</option>
      </select>

      {/* Shuffle button */}
      <button
        onClick={onShuffleLibrary}
        className="ml-auto p-2.5 rounded-lg bg-[#eab308] hover:bg-[#d4a000] text-black transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#eab308]/20"
        title="Shuffle entire library"
      >
        <Shuffle className="w-4 h-4" />
      </button>
    </div>
  );
}
