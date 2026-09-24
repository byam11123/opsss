const fs = require('fs');

let code = fs.readFileSync('src/client/components/ReportsView.tsx', 'utf-8');

// Vendor headers
code = code.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Date<\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Vendor<\/th>/, '<th className="px-4 py-3"><SortHeader label="Vendor" sortKey="vendorName" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Bill \/ PO<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bill / PO" sortKey="billNoPO" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Mode<\/th>/, '<th className="px-4 py-3"><SortHeader label="Mode" sortKey="modeOfPayment" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3 text-right">Amount \(₹\)<\/th>/, '<th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amountToBePaid" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Site<\/th>/, '<th className="px-4 py-3"><SortHeader label="Site" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>');
// `<SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} />` is already there for Vendor Status
code = code.replace(/<th className="px-4 py-3">Settlement<\/th>/, '<th className="px-4 py-3"><SortHeader label="Settlement" sortKey="paymentStatus" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Bank UTR<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank UTR" sortKey="paymentReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>');

// Interbank headers
// They are identical strings "Sheet No", "Date", "Site", "Status", "Bank UTR" so replacing them again:
// Since replace only replaces the first occurrence, let's use global replace carefully, or just match exactly:

let parts = code.split("reportType === 'INTERBANK' ? (");
let vendorPart = parts[0];
let rest = parts[1];
let interbankEnd = rest.split(") : (");
let interbankPart = interbankEnd[0];
let beneficiaryPart = interbankEnd[1];

// Interbank replacements
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Date<\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Transfer From<\/th>/, '<th className="px-4 py-3"><SortHeader label="Transfer From" sortKey="transferFrom" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Transfer To<\/th>/, '<th className="px-4 py-3"><SortHeader label="Transfer To" sortKey="transferTo" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3 text-right">Amount \(₹\)<\/th>/, '<th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Site<\/th>/, '<th className="px-4 py-3"><SortHeader label="Site" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
interbankPart = interbankPart.replace(/<th className="px-4 py-3">Bank UTR<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank UTR" sortKey="paymentReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>');

// Beneficiary replacements
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Date<\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Beneficiary Name<\/th>/, '<th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="nameOfBeneficiary" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Account No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Account No" sortKey="accountNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">IFSC<\/th>/, '<th className="px-4 py-3"><SortHeader label="IFSC" sortKey="ifscCode" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Bank<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank" sortKey="bankName" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Approval<\/th>/, '<th className="px-4 py-3"><SortHeader label="Approval" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Bank Addition<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank Addition" sortKey="additionStatus" currentSort={sortConfig} requestSort={requestSort} /></th>');
beneficiaryPart = beneficiaryPart.replace(/<th className="px-4 py-3">Ref ID<\/th>/, '<th className="px-4 py-3"><SortHeader label="Ref ID" sortKey="entryReferenceNumber" currentSort={sortConfig} requestSort={requestSort} /></th>');

code = vendorPart + "reportType === 'INTERBANK' ? (" + interbankPart + ") : (" + beneficiaryPart;

fs.writeFileSync('src/client/components/ReportsView.tsx', code);
