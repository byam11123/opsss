import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '../../hooks/useSortableData';

export const SortHeader = ({ label, sortKey, currentSort, requestSort }: { label: string, sortKey: string, currentSort: SortConfig, requestSort: (k: string) => void }) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <div 
      className="flex items-center gap-1 cursor-pointer select-none group w-full" 
      onClick={() => requestSort(sortKey)}
    >
      <span>{label}</span>
      <span className="text-slate-400 group-hover:text-indigo-500">
        {isActive ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </span>
    </div>
  );
};
