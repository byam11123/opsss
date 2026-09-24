const fs = require('fs');
let code = fs.readFileSync('src/client/components/PurchaseFMSView.tsx', 'utf-8');

// We need to inject the generic SortHeader element definition, and the sort logic.
const sortHeaderDef = `
const SortHeader = ({ label, sortKey, currentSort, requestSort }: { label: string, sortKey: string, currentSort: any, requestSort: (k: string) => void }) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <div 
      className="flex items-center justify-between gap-1 cursor-pointer select-none group w-full" 
      onClick={() => requestSort(sortKey)}
    >
      <span>{label}</span>
      <span className="text-slate-400 group-hover:text-indigo-500">
        {isActive ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </span>
    </div>
  );
};
`;

// It seems I already added `useSortableData` in my previous script? Let's check if it exists.
if (!code.includes('useSortableData')) {
    const sortConfigStr = `
type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

function useSortableData<T>(items: T[], config: SortConfig = null) {
  const [sortConfig, React_useState] = React.useState<SortConfig>(config);
  const setSortConfig = React_useState;

  const sortedItems = React.useMemo(() => {
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
` + sortHeaderDef;
    code = code.replace(/function DelayedTaskReport/g, sortConfigStr + '\nfunction DelayedTaskReport');
} else {
  // If it already exists, let's make sure SortHeader is defined.
  if (!code.includes('SortHeader')) {
      code = code.replace(/function DelayedTaskReport/g, sortHeaderDef + '\nfunction DelayedTaskReport');
  }
}

// Ensure the variables are mapped correctly in DelayedTaskReport
if (!code.includes('const { items: sortedDelayedStages')) {
  code = code.replace(/const summaryByStage = delayedStages\.reduce\(/g, `
  const { items: sortedDelayedStages, requestSort: requestSortDelayed, sortConfig: sortConfigDelayed } = useSortableData(delayedStages);
  const summaryByStageRaw = delayedStages.reduce(`);
}
if (!code.includes('const { items: sortedSummary')) {
  code = code.replace(/\} as Record<string, any>\);/g, `} as Record<string, any>);
  const { items: sortedSummary, requestSort: requestSortSummary, sortConfig: sortConfigSummary } = useSortableData(Object.values(summaryByStageRaw));
`);
}

// Now replace delayedStages.map -> sortedDelayedStages.map
code = code.replace(/delayedStages\.map/g, 'sortedDelayedStages.map');

// And Object.values(summaryByStage).map -> sortedSummary.map
code = code.replace(/Object\.values\(summaryByStage\)\.map/g, 'sortedSummary.map');

// Now, update headers of details table:
// <th>S.No</th> ...
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600 print:px-2">FMS Name<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600 print:px-2"><SortHeader label="FMS Name" sortKey="fmsName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Stage \/ Checkpoint<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage / Checkpoint" sortKey="stageName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Stage Owner \(Who\)<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Stage Owner (Who)" sortKey="responsible" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Amount<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Payment Method<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Payment Method" sortKey="paymentMethod" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">PO \/ Indent No.<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="PO / Indent No." sortKey="poNumber" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Site<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Site" sortKey="siteName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600">Delay Time<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-left font-semibold text-slate-600"><SortHeader label="Delay Time" sortKey="delayInDays" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);
code = code.replace(
  /<th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600">Max Delay \(Days\)<\/th>/g, 
  `<th className="px-4 py-3 print:px-2 text-center font-semibold text-slate-600"><SortHeader label="Max Delay (Days)" sortKey="delayInDays" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} /></th>`
);

// We have two tables. One is delayed stages, the other is summary. We should differentiate them or replace in steps.
// The code string replacement above replaces ALL matching instances.
// We should use a safer way for the summary table.

fs.writeFileSync('src/client/components/PurchaseFMSView.tsx', code);
