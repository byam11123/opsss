const fs = require('fs');

function fixInterbank() {
    let code = fs.readFileSync('src/client/components/InterbankView.tsx', 'utf-8');
    code = code.replace(/transfers\.map\(\(item\)/g, 'sortedItems.map((item)');
    
    // Replace all th with proper SortHeader
    // First, let's revert the ths to raw text or just handle them.
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Sheet No".*?\/><\/th>/, '<th className="px-4 py-3">Sheet No</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Date".*?\/><\/th>/, '<th className="px-4 py-3">Date</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Transfer From".*?\/><\/th>/, '<th className="px-4 py-3">Transfer From</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Status".*?\/><\/th>/, '<th className="px-4 py-3">Status</th>');
    
    code = code.replace(/<th className="px-4 py-3">Sheet No<\/th>/, '<th className="px-4 py-3"><SortHeader label="Sheet No" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Date<\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Transfer From<\/th>/, '<th className="px-4 py-3"><SortHeader label="Transfer From" sortKey="transferFrom" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Transfer To<\/th>/, '<th className="px-4 py-3"><SortHeader label="Transfer To" sortKey="transferTo" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-right">Amount \(₹\)<\/th>/, '<th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Site \/ Dept<\/th>/, '<th className="px-4 py-3"><SortHeader label="Site / Dept" sortKey="siteId" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Requested By<\/th>/, '<th className="px-4 py-3"><SortHeader label="Requested By" sortKey="requestedBy" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Priority<\/th>/, '<th className="px-4 py-3"><SortHeader label="Priority" sortKey="priority" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
    
    fs.writeFileSync('src/client/components/InterbankView.tsx', code);
}

function fixVendor() {
    let code = fs.readFileSync('src/client/components/VendorPaymentView.tsx', 'utf-8');
    code = code.replace(/payments\.map\(\(item\)/g, 'sortedItems.map((item)');
    
    // Clear old
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Date".*?\/><\/th>/, '<th className="px-4 py-3">Date</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Status".*?\/><\/th>/, '<th className="px-4 py-3">Status</th>');
    
    code = code.replace(/<th className="px-4 py-3">Payment ID<\/th>/, '<th className="px-4 py-3"><SortHeader label="Payment ID" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Date<\/th>/, '<th className="px-4 py-3"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Beneficiary<\/th>/, '<th className="px-4 py-3"><SortHeader label="Beneficiary" sortKey="beneficiaryName" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Site \/ Dept<\/th>/, '<th className="px-4 py-3"><SortHeader label="Site / Dept" sortKey="siteId" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Requested By<\/th>/, '<th className="px-4 py-3"><SortHeader label="Requested By" sortKey="requestedBy" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-right">Amount \(₹\)<\/th>/, '<th className="px-4 py-3 text-right"><SortHeader label="Amount (₹)" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Method<\/th>/, '<th className="px-4 py-3"><SortHeader label="Method" sortKey="paymentMethod" currentSort={sortConfig} requestSort={requestSort} /></th>');
    
    fs.writeFileSync('src/client/components/VendorPaymentView.tsx', code);
}

function fixBeneficiary() {
    let code = fs.readFileSync('src/client/components/BeneficiaryView.tsx', 'utf-8');
    // It's using beneficiaries.map? Let's verify BeneficiaryView later.
    code = code.replace(/beneficiaries\.map\(\(item\)/g, 'sortedBeneficiaries.map((item)');
    
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Beneficiary Name".*?\/><\/th>/, '<th className="px-4 py-3">Beneficiary Name</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Account Number".*?\/><\/th>/, '<th className="px-4 py-3">Account Number</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="IFSC Code".*?\/><\/th>/, '<th className="px-4 py-3">IFSC Code</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Bank Name".*?\/><\/th>/, '<th className="px-4 py-3">Bank Name</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Status".*?\/><\/th>/, '<th className="px-4 py-3">Status</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Created By".*?\/><\/th>/, '<th className="px-4 py-3">Created By</th>');
    
    code = code.replace(/<th className="px-4 py-3">Beneficiary ID<\/th>/, '<th className="px-4 py-3"><SortHeader label="Beneficiary ID" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Beneficiary Name<\/th>/, '<th className="px-4 py-3"><SortHeader label="Beneficiary Name" sortKey="name" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Account Number<\/th>/, '<th className="px-4 py-3"><SortHeader label="Account Number" sortKey="accountNumber" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">IFSC Code<\/th>/, '<th className="px-4 py-3"><SortHeader label="IFSC Code" sortKey="ifscCode" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Bank Name<\/th>/, '<th className="px-4 py-3"><SortHeader label="Bank Name" sortKey="bankName" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Type<\/th>/, '<th className="px-4 py-3"><SortHeader label="Type" sortKey="beneficiaryType" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Added By<\/th>/, '<th className="px-4 py-3"><SortHeader label="Added By" sortKey="createdBy" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');

    fs.writeFileSync('src/client/components/BeneficiaryView.tsx', code);
}

function fixITChecklist() {
    let code = fs.readFileSync('src/client/components/ITChecklistView.tsx', 'utf-8');
    code = code.replace(/tasks\.map\(\(task\)/g, 'sortedItems.map((task)');
    
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Hardware ID".*?\/><\/th>/, '<th className="px-4 py-3">Hardware ID</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Type".*?\/><\/th>/, '<th className="px-4 py-3">Type</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Assigned To".*?\/><\/th>/, '<th className="px-4 py-3">Assigned To</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Department".*?\/><\/th>/, '<th className="px-4 py-3">Department</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Location".*?\/><\/th>/, '<th className="px-4 py-3">Location</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Status".*?\/><\/th>/, '<th className="px-4 py-3">Status</th>');
    code = code.replace(/<th className="px-4 py-3"><SortHeader label="Last Checked".*?\/><\/th>/, '<th className="px-4 py-3">Last Checked</th>');
    
    code = code.replace(/<th className="px-4 py-3">Hardware ID<\/th>/, '<th className="px-4 py-3"><SortHeader label="Hardware ID" sortKey="id" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Device Type<\/th>/, '<th className="px-4 py-3"><SortHeader label="Device Type" sortKey="type" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">User\/Assignee<\/th>/, '<th className="px-4 py-3"><SortHeader label="User/Assignee" sortKey="assignedTo" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Department<\/th>/, '<th className="px-4 py-3"><SortHeader label="Department" sortKey="department" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Location<\/th>/, '<th className="px-4 py-3"><SortHeader label="Location" sortKey="location" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">OS Version<\/th>/, '<th className="px-4 py-3"><SortHeader label="OS Version" sortKey="osVersion" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Antivirus<\/th>/, '<th className="px-4 py-3"><SortHeader label="Antivirus" sortKey="antivirusStatus" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">AnyDesk ID<\/th>/, '<th className="px-4 py-3"><SortHeader label="AnyDesk ID" sortKey="anyDeskId" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Last Maintenance<\/th>/, '<th className="px-4 py-3"><SortHeader label="Last Maintenance" sortKey="lastMaintenanceDate" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3">Status<\/th>/, '<th className="px-4 py-3"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
    
    fs.writeFileSync('src/client/components/ITChecklistView.tsx', code);
}

function fixAudit() {
    let code = fs.readFileSync('src/client/components/AuditView.tsx', 'utf-8');
    code = code.replace(/logs\.map\(\(log\)/g, 'sortedLogs.map((log)');
    // No clearing since my original script already targeted standard fields, wait, my original script didn't apply properly?
    // Let's check headers in AuditView.
    code = code.replace(/<th className="px-4 py-3 text-left">Timestamp<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="Timestamp" sortKey="timestamp" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left">User<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="User" sortKey="user" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left">Module<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="Module" sortKey="module" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left">Action<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="Action" sortKey="action" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left">Target<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="Target" sortKey="targetId" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left">IP Address<\/th>/, '<th className="px-4 py-3 text-left"><SortHeader label="IP Address" sortKey="ipAddress" currentSort={sortConfig} requestSort={requestSort} /></th>');

    fs.writeFileSync('src/client/components/AuditView.tsx', code);
}

function fixReports() {
    let code = fs.readFileSync('src/client/components/ReportsView.tsx', 'utf-8');
    code = code.replace(/reportData\.map\(\(report/g, 'sortedReports.map((report');
    
    code = code.replace(/<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type<\/th>/, '<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><SortHeader label="Type" sortKey="type" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date<\/th>/, '<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><SortHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity<\/th>/, '<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><SortHeader label="Entity" sortKey="entity" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount<\/th>/, '<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><SortHeader label="Amount" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} /></th>');
    code = code.replace(/<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status<\/th>/, '<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');
    
    fs.writeFileSync('src/client/components/ReportsView.tsx', code);
}

try { fixInterbank(); } catch(e) { console.error('Interbank', e); }
try { fixVendor(); } catch(e) { console.error('Vendor', e); }
try { fixBeneficiary(); } catch(e) { console.error('Beneficiary', e); }
try { fixITChecklist(); } catch(e) { console.error('ITChecklist', e); }
try { fixAudit(); } catch(e) { console.error('Audit', e); }
try { fixReports(); } catch(e) { console.error('Reports', e); }
