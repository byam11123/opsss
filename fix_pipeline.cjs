const fs = require('fs');
let code = fs.readFileSync('src/client/components/PurchaseFMSView.tsx', 'utf-8');

// Inject useSortableData for the main items
code = code.replace(
  /const pageSize = 25;/,
  `const pageSize = 25;
  const { items: sortedItems, requestSort: requestSortPipeline, sortConfig: sortConfigPipeline } = useSortableData(items);`
);

// We need to pass sortedItems to the pipeline table mapping
code = code.replace(
  /\{items\.map\(\(item\) => \(/,
  '{sortedItems.map((item) => ('
);

// We also need to update the DelayedTaskReport call to use the ORIGINAL items? Or sortedItems?
// The original `items` is fine for DelayedTaskReport since it does its own processing.
// Wait, DelayedTaskReport gets all items? No, it gets `items` which is the current page... Actually let's look at DelayedTaskReport.

// Now replace headers in pipeline view:
// <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
//    Indent & Requisition
//  </th>
code = code.replace(
  /<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1\/4">\s*Indent & Requisition\s*<\/th>/g,
  `<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Indent & Requisition" sortKey="indentNo" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>`
);

code = code.replace(
  /<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1\/4">\s*PO & Vendor\s*<\/th>/g,
  `<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="PO & Vendor" sortKey="poNumber" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>`
);

code = code.replace(
  /<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1\/4">\s*Current Bottleneck\s*<\/th>/g,
  `<th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Current Bottleneck" sortKey="currentBottleneck" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>`
);

code = code.replace(
  /<th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-1\/4">\s*Current Status\s*<\/th>/g,
  `<th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4"><SortHeader label="Current Status" sortKey="status" currentSort={sortConfigPipeline} requestSort={requestSortPipeline} /></th>`
);

// We also have an inner table for stages in the pipeline view!
// let's check its headers
fs.writeFileSync('src/client/components/PurchaseFMSView.tsx', code);
