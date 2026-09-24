const fs = require('fs');

function processFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf-8');
    if (code.includes('useSortableData')) return; // Already processed

    // Add imports
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;

    // We need to inject useSortableData hook invocation inside the component.
    // Finding the main component name can be done by looking for `export default function XYZ` or `export function XYZ`.
    const compMatch = code.match(/export (?:default )?function ([A-Za-z0-9_]+)\s*\(/);
    if (!compMatch) return;
    
    // Most tables map over an array (like `items.map`, `logs.map`, `beneficiaries.map`).
    // We need to know the variable name. Let's look for `.map((` inside tbody.
    const mapMatch = code.match(/([a-zA-Z0-9_]+)\.map\(\s*\(/);
    
    // Instead of completely automating it, let's write custom replacements for each known view.
    // Because state variables vary: logs, beneficiaries, items, etc.
}

// Custom processors:
function processInterbank() {
    let code = fs.readFileSync('src/client/components/InterbankView.tsx', 'utf-8');
    if(code.includes('useSortableData')) return;
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;
    
    // It maps over `items.map((item) => ...)`
    code = code.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [loading, setLoading] = useState(true);\n  const { items: sortedItems, requestSort, sortConfig } = useSortableData(items);`
    );
    code = code.replace(/\{items\.map\(/g, `{sortedItems.map(`);
    
    // Replace THs
    code = code.replace(/<th className="px-4 py-3">Sheet No<\/th>/, `<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Date<\/th>/, `<th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Transfer From<\/th>/, `<th className="px-4 py-3"><SortHeader label="Transfer From" sortKey="transferFrom" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">To<\/th>/, `<th className="px-4 py-3"><SortHeader label="To" sortKey="to" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-right">Amount<\/th>/, `<th className="px-4 py-3 text-right"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, `<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Maker<\/th>/, `<th className="px-4 py-3"><SortHeader label="Maker" sortKey="maker" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Checker<\/th>/, `<th className="px-4 py-3"><SortHeader label="Checker" sortKey="checker" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    
    fs.writeFileSync('src/client/components/InterbankView.tsx', code);
}

function processBeneficiary() {
    let code = fs.readFileSync('src/client/components/BeneficiaryView.tsx', 'utf-8');
    if(code.includes('useSortableData')) return;
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;
    
    code = code.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [loading, setLoading] = useState(true);\n  const { items: sortedBeneficiaries, requestSort, sortConfig } = useSortableData(beneficiaries);`
    );
    code = code.replace(/\{beneficiaries\.map\(/g, `{sortedBeneficiaries.map(`);
    
    code = code.replace(/<th className="px-4 py-3">Beneficiary Name<\/th>/, `<th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="name" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Account Number<\/th>/, `<th className="px-4 py-3"><SortHeader label="Account Number" sortKey="accountNumber" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">IFSC Code<\/th>/, `<th className="px-4 py-3"><SortHeader label="IFSC Code" sortKey="ifscCode" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Bank Name<\/th>/, `<th className="px-4 py-3"><SortHeader label="Bank Name" sortKey="bankName" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, `<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Created By<\/th>/, `<th className="px-4 py-3"><SortHeader label="Created By" sortKey="createdBy" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    
    fs.writeFileSync('src/client/components/BeneficiaryView.tsx', code);
}

function processVendor() {
    let code = fs.readFileSync('src/client/components/VendorPaymentView.tsx', 'utf-8');
    if(code.includes('useSortableData')) return;
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;
    
    code = code.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [loading, setLoading] = useState(true);\n  const { items: sortedItems, requestSort, sortConfig } = useSortableData(items);`
    );
    code = code.replace(/\{items\.map\(/g, `{sortedItems.map(`);
    
    code = code.replace(/<th className="px-4 py-3">Date<\/th>/, `<th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Beneficiary<\/th>/, `<th className="px-4 py-3"><SortHeader label="Beneficiary" sortKey="beneficiaryName" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Project\/Site<\/th>/, `<th className="px-4 py-3"><SortHeader label="Project/Site" sortKey="projectSite" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-right">Amount<\/th>/, `<th className="px-4 py-3 text-right"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-center">Drive Link<\/th>/, `<th className="px-4 py-3 text-center"><SortHeader label="Drive Link" sortKey="driveLink" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, `<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Maker<\/th>/, `<th className="px-4 py-3"><SortHeader label="Maker" sortKey="maker" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Checker<\/th>/, `<th className="px-4 py-3"><SortHeader label="Checker" sortKey="checker" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    
    fs.writeFileSync('src/client/components/VendorPaymentView.tsx', code);
}

function processITChecklist() {
    let code = fs.readFileSync('src/client/components/ITChecklistView.tsx', 'utf-8');
    if(code.includes('useSortableData')) return;
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;
    
    code = code.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [loading, setLoading] = useState(true);\n  const { items: sortedItems, requestSort, sortConfig } = useSortableData(items);`
    );
    code = code.replace(/\{items\.map\(/g, `{sortedItems.map(`);
    
    code = code.replace(/<th className="px-4 py-3">Hardware ID<\/th>/, `<th className="px-4 py-3"><SortHeader label="Hardware ID" sortKey="hardwareId" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Type<\/th>/, `<th className="px-4 py-3"><SortHeader label="Type" sortKey="type" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Assigned To<\/th>/, `<th className="px-4 py-3"><SortHeader label="Assigned To" sortKey="assignedTo" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Department<\/th>/, `<th className="px-4 py-3"><SortHeader label="Department" sortKey="department" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Location<\/th>/, `<th className="px-4 py-3"><SortHeader label="Location" sortKey="location" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, `<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3">Last Checked<\/th>/, `<th className="px-4 py-3"><SortHeader label="Last Checked" sortKey="lastChecked" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-center">Health<\/th>/, `<th className="px-4 py-3 text-center"><SortHeader label="Health" sortKey="healthScore" currentSort={sortConfig} requestSort={requestSort} /></th>`);

    fs.writeFileSync('src/client/components/ITChecklistView.tsx', code);
}

function processAudit() {
    let code = fs.readFileSync('src/client/components/AuditView.tsx', 'utf-8');
    if(code.includes('useSortableData')) return;
    code = `import { useSortableData, SortConfig } from '../hooks/useSortableData';\nimport { SortHeader } from './common/SortHeader';\n` + code;
    
    code = code.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [loading, setLoading] = useState(true);\n  const { items: sortedLogs, requestSort, sortConfig } = useSortableData(logs);`
    );
    code = code.replace(/\{logs\.map\(/g, `{sortedLogs.map(`);
    
    code = code.replace(/<th className="px-4 py-3 text-left">Timestamp<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="Timestamp" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-left">User<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="User" sortKey="user" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-left">Module<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="Module" sortKey="module" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-left">Action<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="Action" sortKey="action" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-left">Target<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="Target" sortKey="targetId" currentSort={sortConfig} requestSort={requestSort} /></th>`);
    code = code.replace(/<th className="px-4 py-3 text-left">IP Address<\/th>/, `<th className="px-4 py-3 text-left"><SortHeader label="IP Address" sortKey="ipAddress" currentSort={sortConfig} requestSort={requestSort} /></th>`);

    fs.writeFileSync('src/client/components/AuditView.tsx', code);
}

processInterbank();
processBeneficiary();
processVendor();
processITChecklist();
processAudit();

