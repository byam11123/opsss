import { useState, useMemo } from 'react';

export type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export function useSortableData<T>(items: T[], config: SortConfig = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = (a as any)[sortConfig.key];
        let bValue = (b as any)[sortConfig.key];
        
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';
        
        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  return { items: sortedItems, requestSort, sortConfig };
}
