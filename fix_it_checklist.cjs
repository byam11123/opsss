const fs = require('fs');
let code = fs.readFileSync('src/client/components/ITChecklistView.tsx', 'utf-8');

code = code.replace(/<th className="py-3 px-4">Task ID<\/th>/, '<th className="py-3 px-4"><SortHeader label="Task ID" sortKey="taskId" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Equipment & Category<\/th>/, '<th className="py-3 px-4"><SortHeader label="Equipment & Category" sortKey="equipmentType" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Maintenance Action<\/th>/, '<th className="py-3 px-4"><SortHeader label="Maintenance Action" sortKey="task" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Site Location<\/th>/, '<th className="py-3 px-4"><SortHeader label="Site Location" sortKey="site" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Freq<\/th>/, '<th className="py-3 px-4"><SortHeader label="Freq" sortKey="frequency" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Doer \/ Assignee<\/th>/, '<th className="py-3 px-4"><SortHeader label="Doer / Assignee" sortKey="doerName" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Planned<\/th>/, '<th className="py-3 px-4"><SortHeader label="Planned" sortKey="plannedDate" currentSort={sortConfig} requestSort={requestSort} /></th>');
code = code.replace(/<th className="py-3 px-4">Status<\/th>/, '<th className="py-3 px-4"><SortHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} /></th>');

fs.writeFileSync('src/client/components/ITChecklistView.tsx', code);
