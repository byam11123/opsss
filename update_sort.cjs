const fs = require('fs');
let code = fs.readFileSync('src/client/components/PurchaseFMSView.tsx', 'utf-8');

// We need a sorting utility
const sortConfigStr = `
type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

function useSortableData<T>(items: T[], config: SortConfig = null) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(config);

  const sortedItems = React.useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = (a as any)[sortConfig.key];
        let bValue = (b as any)[sortConfig.key];
        
        // Handle undefined or null
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';
        
        // Try parsing to numbers if both are numeric strings
        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
}

const SortHeader = ({ label, sortKey, currentSort, requestSort }: { label: string, sortKey: string, currentSort: SortConfig, requestSort: (k: string) => void }) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <div 
      className="flex items-center gap-1 cursor-pointer select-none group" 
      onClick={() => requestSort(sortKey)}
    >
      <span>{label}</span>
      <span className="text-slate-400 group-hover:text-indigo-500">
        {isActive ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
      </span>
    </div>
  );
};
`;

// Insert the utility right after imports
code = code.replace(/function DelayedTaskReport/g, sortConfigStr + '\nfunction DelayedTaskReport');

// Modify DelayedTaskReport to use sorting
code = code.replace(/const summaryByStage = delayedStages\.reduce\(/g, `
  const { items: sortedDelayedStages, requestSort: requestSortDelayed, sortConfig: sortConfigDelayed } = useSortableData(delayedStages);
  const summaryByStageRaw = delayedStages.reduce(`);

code = code.replace(/\} as Record<string, any>\);/g, `} as Record<string, any>);
  const { items: sortedSummary, requestSort: requestSortSummary, sortConfig: sortConfigSummary } = useSortableData(Object.values(summaryByStageRaw));
`);

// Replace table headers in DelayedTaskReport (Details)
const detailHeaders = [
  ['S.No', 'id'], // Fake sort key for S.No, maybe just index? Actually let's not sort S.No
  ['FMS Name', 'fmsName'],
  ['Stage / Checkpoint', 'stageName'],
  ['Stage Owner (Who)', 'responsible'],
  ['Amount', 'amount'],
  ['Payment Method', 'paymentMethod'],
  ['PO / Indent No.', 'poNumber'],
  ['Site', 'siteName'],
  ['Delay Time', 'delay'],
  ['Max Delay (Days)', 'delayInDays'],
  ['Status', 'status']
];

// Instead of string replaces for every TH, let's just use regex to wrap header text in SortHeader.
// Wait, the table code is specific. I'll manually write a script to replace the standard th's.

fs.writeFileSync('src/client/components/PurchaseFMSView.tsx', code);
