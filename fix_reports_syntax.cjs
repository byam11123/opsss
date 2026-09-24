const fs = require('fs');

let code = fs.readFileSync('src/client/components/ReportsView.tsx', 'utf-8');

const missingPart = `) : (
                sortedReports.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {row.sheetNo}
                      <p className="text-[10px] text-slate-400 mt-0.5">{row.timestamp}</p>
                    </td>
                    {reportType === 'VENDOR' ? (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 max-w-[150px] truncate">
                          {row.vendorName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.billNoPO}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.modeOfPayment}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(row.amountToBePaid)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.site}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.status}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={\`font-semibold \${
                              row.paymentStatus === 'PAID' ? 'text-teal-600' : 'text-slate-500'
                            }\`}
                          >
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.paymentReferenceNumber || '—'}
                        </td>
                      </>
                    ) : reportType === 'INTERBANK' ? (
                      <>
                        <td className="px-4 py-3 max-w-[150px] truncate">{row.transferFrom}</td>
                        <td className="px-4 py-3 max-w-[150px] truncate">{row.transferTo}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.site}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{row.status}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.paymentReferenceNumber || '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {row.nameOfBeneficiary}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{row.accountNo}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.ifscCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.bankName}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{row.status}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.additionStatus}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.entryReferenceNumber || '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

code = code.trim() + '\n' + missingPart;

fs.writeFileSync('src/client/components/ReportsView.tsx', code);
