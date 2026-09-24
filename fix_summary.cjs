const fs = require('fs');
let code = fs.readFileSync('src/client/components/PurchaseFMSView.tsx', 'utf-8');

// The summary table is inside <div className="bg-slate-700
// Let's split by that to only replace in the summary table
const parts = code.split('Pending/Delayed Task Count By FMS / Stage</h3>');

let summaryPart = parts[1];

// Fix the SortHeaders in the summary part
summaryPart = summaryPart.replace(
  /<SortHeader label="FMS Name" sortKey="fmsName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="FMS Name" sortKey="sheet" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);
summaryPart = summaryPart.replace(
  /<SortHeader label="Stage \/ Checkpoint" sortKey="stageName" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="Stage / Checkpoint" sortKey="stage" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);
summaryPart = summaryPart.replace(
  /<SortHeader label="Stage Owner \(Who\)" sortKey="responsible" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="Stage Owner (Who)" sortKey="owner" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);
summaryPart = summaryPart.replace(
  /<SortHeader label="Amount" sortKey="amount" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="Amount" sortKey="amount" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);
summaryPart = summaryPart.replace(
  /<SortHeader label="Payment Method" sortKey="paymentMethod" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="Payment Method" sortKey="paymentMethod" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);
summaryPart = summaryPart.replace(
  /<SortHeader label="Max Delay \(Days\)" sortKey="delayInDays" currentSort={sortConfigDelayed} requestSort={requestSortDelayed} \/>/,
  '<SortHeader label="Max Delay (Days)" sortKey="maxDelay" currentSort={sortConfigSummary} requestSort={requestSortSummary} />'
);

// Add missing SortHeaders for the last two columns
summaryPart = summaryPart.replace(
  /Currently Pending<\/th>/,
  '<SortHeader label="Currently Pending" sortKey="pendingCount" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>'
);
summaryPart = summaryPart.replace(
  /Completed Late<\/th>/,
  '<SortHeader label="Completed Late" sortKey="completedDelayCount" currentSort={sortConfigSummary} requestSort={requestSortSummary} /></th>'
);

code = parts[0] + 'Pending/Delayed Task Count By FMS / Stage</h3>' + summaryPart;

fs.writeFileSync('src/client/components/PurchaseFMSView.tsx', code);
