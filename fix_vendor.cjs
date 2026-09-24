const fs = require('fs');

let code = fs.readFileSync('src/client/components/VendorPaymentView.tsx', 'utf-8');

code = code.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} \/><\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Vendor Name<\/th>/, '<th className="px-4 py-3"><SortHeader label="Vendor Name" sortKey="vendorName" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Bill \/ PO No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bill / PO No" sortKey="billNoPO" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Mode<\/th>/, '<th className="px-4 py-3"><SortHeader label="Mode" sortKey="modeOfPayment" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3 text-right"><SortHeader label="Amount \(₹\)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} \/><\/th>/, '<th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amountToBePaid" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3"><SortHeader label="Site \/ Dept" sortKey="siteId" currentSort={sortConfig} requestSort={requestSort} \/><\/th>/, '<th className="px-4 py-3"><SortHeader label="Site / Dept" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Approval<\/th>/, '<th className="px-4 py-3"><SortHeader label="Approval" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Bank Entry<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank Entry" sortKey="paymentEntry" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Settlement<\/th>/, '<th className="px-4 py-3"><SortHeader label="Settlement" sortKey="paymentStatus" currentSort={sortConfig} requestSort={requestSort} /></th>');

fs.writeFileSync('src/client/components/VendorPaymentView.tsx', code);
