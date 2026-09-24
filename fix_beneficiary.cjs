const fs = require('fs');
let code = fs.readFileSync('src/client/components/BeneficiaryView.tsx', 'utf-8');

code = code.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="sheetNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="name".*?\/><\/th>/, '<th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="nameOfBeneficiary" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3"><SortHeader label="Account Number" sortKey="accountNumber".*?\/><\/th>/, '<th className="px-4 py-3"><SortHeader label="Account Number" sortKey="accountNo" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Approval Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Approval Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="px-4 py-3">Bank Addition<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank Addition" sortKey="additionStatus" currentSort={sortConfig} requestSort={requestSort} /></th>');

fs.writeFileSync('src/client/components/BeneficiaryView.tsx', code);
