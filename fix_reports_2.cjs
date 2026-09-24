const fs = require('fs');

let code = fs.readFileSync('src/client/components/ReportsView.tsx', 'utf-8');

code = code.replace(
    /const \[loading, setLoading\] = useState\(true\);/,
    `const [loading, setLoading] = useState(true);\n  const { items: sortedReports, requestSort, sortConfig } = useSortableData(reports);`
);

fs.writeFileSync('src/client/components/ReportsView.tsx', code);
