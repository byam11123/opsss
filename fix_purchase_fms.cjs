const fs = require('fs');
let code = fs.readFileSync('src/client/components/PurchaseFMSView.tsx', 'utf-8');

// Find the definition of useSortableData and SortHeader in PurchaseFMSView.tsx and remove it
const sortConfigMatch = code.match(/type SortConfig =.*?};\n/s);
if (sortConfigMatch) {
    code = code.replace(sortConfigMatch[0], '');
}

// Ensure the imports are added
if (!code.includes('useSortableData')) {
    // wait, it is used in the component, so it MUST include it.
}

code = "import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n" + code;

fs.writeFileSync('src/client/components/PurchaseFMSView.tsx', code);
