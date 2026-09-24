const fs = require('fs');

let code = fs.readFileSync('src/client/components/ReportsView.tsx', 'utf-8');
if(code.includes('useSortableData')) return;
code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;

code = code.replace(
    /const \[loading, setLoading\] = useState\(false\);/,
    `const [loading, setLoading] = useState(false);\n  const { items: sortedReports, requestSort, sortConfig } = useSortableData(reports);`
);
code = code.replace(/\{reports\.map\(/g, `{sortedReports.map(`);

code = code.replace(/<th className="px-4 py-3">Report ID<\/th>/, `<th className="px-4 py-3"><SortHeader label="Report ID" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>`);
code = code.replace(/<th className="px-4 py-3">Type<\/th>/, `<th className="px-4 py-3"><SortHeader label="Type" sortKey="type" currentSort={sortConfig} requestSort={requestSort} /></th>`);
code = code.replace(/<th className="px-4 py-3">Generated At<\/th>/, `<th className="px-4 py-3"><SortHeader label="Generated At" sortKey="generatedAt" currentSort={sortConfig} requestSort={requestSort} /></th>`);
code = code.replace(/<th className="px-4 py-3">Requested By<\/th>/, `<th className="px-4 py-3"><SortHeader label="Requested By" sortKey="requestedBy" currentSort={sortConfig} requestSort={requestSort} /></th>`);
code = code.replace(/<th className="px-4 py-3">Status<\/th>/, `<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>`);

fs.writeFileSync('src/client/components/ReportsView.tsx', code);

