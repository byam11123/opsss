// OpsFlow 360 – Reports, Analytics & Export API Routes

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, AuthenticatedRequest } from '../auth/authMiddleware';

export const reportRouter = Router();

// GET /api/reports/dashboard
reportRouter.get('/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  const [ibRes, benRes, payRes, users] = await Promise.all([
    paymentRepository.listInterbankTransfers({ pageSize: 1000 }),
    paymentRepository.listBeneficiaries({ pageSize: 1000 }),
    paymentRepository.listVendorPayments({ pageSize: 1000 }),
    paymentRepository.getUsers(),
  ]);

  const ibList = ibRes.items;
  const benList = benRes.items;
  const payList = payRes.items;

  // Filter if user is Employee / Requester
  const isRequesterOnly = user.role === 'EMPLOYEE_REQUESTER';
  const myIb = ibList.filter(i => i.requestedByUserId === user.id);
  const myBen = benList.filter(b => b.submittedByUserId === user.id);
  const myPay = payList.filter(p => p.submittedByUserId === user.id);

  // Totals
  const relevantPay = isRequesterOnly ? myPay : payList;
  const relevantIb = isRequesterOnly ? myIb : ibList;
  const relevantBen = isRequesterOnly ? myBen : benList;

  let totalRequestedAmount = 0;
  let totalApprovedAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;
  let totalRejectedAmount = 0;

  for (const p of relevantPay) {
    totalRequestedAmount += p.amountToBePaid;
    if (p.status === 'APPROVED') totalApprovedAmount += p.amountToBePaid;
    if (p.paymentStatus === 'PAID') totalPaidAmount += p.amountToBePaid;
    if (['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)) totalPendingAmount += p.amountToBePaid;
    if (p.status === 'REJECTED') totalRejectedAmount += p.amountToBePaid;
  }

  for (const i of relevantIb) {
    totalRequestedAmount += i.amount;
    if (i.status === 'APPROVED' || i.status === 'COMPLETED') totalApprovedAmount += i.amount;
    if (i.status === 'COMPLETED') totalPaidAmount += i.amount;
    if (['SUBMITTED', 'UNDER_REVIEW'].includes(i.status)) totalPendingAmount += i.amount;
    if (i.status === 'REJECTED') totalRejectedAmount += i.amount;
  }

  // Pending counts
  const pendingApprovalsCount =
    payList.filter(p => ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)).length +
    ibList.filter(i => ['SUBMITTED', 'UNDER_REVIEW'].includes(i.status)).length +
    benList.filter(b => ['SUBMITTED', 'UNDER_REVIEW'].includes(b.status)).length;

  const pendingBeneficiaryAdditionsCount = benList.filter(
    b => b.status === 'APPROVED' && b.additionStatus !== 'DONE'
  ).length;

  const pendingPaymentEntriesCount = payList.filter(
    p => p.status === 'APPROVED' && p.paymentEntry !== 'DONE'
  ).length;

  const paymentsAwaitingVerificationCount = payList.filter(
    p => p.paymentEntry === 'DONE' && p.paymentStatus !== 'PAID' && p.paymentStatus !== 'FAILED'
  ).length;

  // Site-wise distribution
  const siteMap: Record<string, { count: number; amount: number }> = {};
  for (const p of payList) {
    const s = p.site || 'Unknown';
    if (!siteMap[s]) siteMap[s] = { count: 0, amount: 0 };
    siteMap[s].count += 1;
    siteMap[s].amount += p.amountToBePaid;
  }
  const siteDistribution = Object.entries(siteMap).map(([site, data]) => ({
    site,
    count: data.count,
    amount: data.amount,
  }));

  // Department distribution
  const deptMap: Record<string, { count: number; amount: number }> = {};
  for (const p of payList) {
    const d = p.department || 'Other';
    if (!deptMap[d]) deptMap[d] = { count: 0, amount: 0 };
    deptMap[d].count += 1;
    deptMap[d].amount += p.amountToBePaid;
  }
  const departmentDistribution = Object.entries(deptMap).map(([department, data]) => ({
    department,
    count: data.count,
    amount: data.amount,
  }));

  // Mode of payment distribution
  const modeMap: Record<string, number> = {};
  for (const p of payList) {
    modeMap[p.modeOfPayment] = (modeMap[p.modeOfPayment] || 0) + 1;
  }
  const modeDistribution = Object.entries(modeMap).map(([mode, count]) => ({
    mode,
    count,
  }));

  // Daily Trend (recent months/days)
  const trendMap: Record<string, number> = {};
  for (const p of payList) {
    const d = p.timestamp.substring(0, 10);
    trendMap[d] = (trendMap[d] || 0) + p.amountToBePaid;
  }
  const dailyTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, amount]) => ({
      date: date.substring(5), // MM-DD
      amount,
    }));

  // Aging analysis (< 3 days, 3-7 days, 7-14 days, > 14 days)
  const nowMs = Date.now();
  const aging = {
    lessThan3Days: 0,
    threeToSevenDays: 0,
    sevenToFourteenDays: 0,
    moreThan14Days: 0,
  };
  for (const p of payList) {
    if (['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)) {
      const ageDays = (nowMs - new Date(p.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 3) aging.lessThan3Days += p.amountToBePaid;
      else if (ageDays < 7) aging.threeToSevenDays += p.amountToBePaid;
      else if (ageDays < 14) aging.sevenToFourteenDays += p.amountToBePaid;
      else aging.moreThan14Days += p.amountToBePaid;
    }
  }

  res.json({
    success: true,
    message: 'Dashboard metrics calculated',
    data: {
      userRole: user.role,
      isRequesterOnly,
      metrics: {
        totalRequestedAmount,
        totalApprovedAmount,
        totalPaidAmount,
        totalPendingAmount,
        totalRejectedAmount,
        pendingApprovalsCount,
        pendingBeneficiaryAdditionsCount,
        pendingPaymentEntriesCount,
        paymentsAwaitingVerificationCount,
        totalUsersCount: users.length,
        mySubmittedCount: myIb.length + myBen.length + myPay.length,
      },
      siteDistribution,
      departmentDistribution,
      modeDistribution,
      dailyTrend,
      aging,
    },
  });
});

// GET /api/reports/export/csv
reportRouter.get('/export/csv', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const type = (req.query.type as string) || 'vendor-payments';

  let csvContent = '';
  let filename = `OpsFlow_Export_${Date.now()}.csv`;

  if (type === 'interbank') {
    filename = `Interbank_Transfers_${Date.now()}.csv`;
    const resIb = await paymentRepository.listInterbankTransfers({ pageSize: 2000 });
    const headers = ['Sheet No', 'Date', 'From Account', 'To Account', 'Amount', 'Site', 'Department', 'Status', 'UTR Ref'];
    const rows = resIb.items.map(i => [
      `"${i.sheetNo}"`,
      `"${i.timestamp.substring(0, 10)}"`,
      `"${i.transferFrom}"`,
      `"${i.transferTo}"`,
      i.amount,
      `"${i.site}"`,
      `"${i.department}"`,
      `"${i.status}"`,
      `"${i.paymentReferenceNumber || ''}"`,
    ]);
    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  } else if (type === 'beneficiaries') {
    filename = `Beneficiaries_${Date.now()}.csv`;
    const resBen = await paymentRepository.listBeneficiaries({ pageSize: 2000 });
    const headers = ['Sheet No', 'Beneficiary Name', 'Account No', 'IFSC', 'Bank Name', 'Status', 'Addition Status', 'Entry Ref'];
    const rows = resBen.items.map(b => [
      `"${b.sheetNo}"`,
      `"${b.nameOfBeneficiary}"`,
      `"${b.accountNo}"`,
      `"${b.ifscCode}"`,
      `"${b.bankName}"`,
      `"${b.status}"`,
      `"${b.additionStatus}"`,
      `"${b.entryReferenceNumber || ''}"`,
    ]);
    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  } else {
    filename = `Vendor_Payments_${Date.now()}.csv`;
    const resPay = await paymentRepository.listVendorPayments({ pageSize: 2000 });
    const headers = ['Sheet No', 'Date', 'Vendor Name', 'PO/Bill No', 'Mode', 'Amount', 'Site', 'Department', 'Status', 'Payment Status', 'UTR Ref'];
    const rows = resPay.items.map(p => [
      `"${p.sheetNo}"`,
      `"${p.timestamp.substring(0, 10)}"`,
      `"${p.vendorName}"`,
      `"${p.billNoPO}"`,
      `"${p.modeOfPayment}"`,
      p.amountToBePaid,
      `"${p.site}"`,
      `"${p.department}"`,
      `"${p.status}"`,
      `"${p.paymentStatus}"`,
      `"${p.paymentReferenceNumber || ''}"`,
    ]);
    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // Audit export
  await paymentRepository.createAuditLog({
    recordType: 'REPORT',
    recordId: type,
    sheetNo: filename,
    action: 'EXPORT',
    remarks: `Exported ${type} to CSV format`,
    performedByUserId: req.user!.id,
    performedByName: req.user!.name,
    userRole: req.user!.role,
    module: 'reports',
    successFlag: true,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// GET /api/reports/export/excel (Sends structured CSV/XML spreadsheet easily opened by Microsoft Excel)
reportRouter.get('/export/excel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const type = (req.query.type as string) || 'vendor-payments';
  const filename = `OpsFlow_${type.replace('-', '_').toUpperCase()}_${Date.now()}.csv`;

  // Provide proper Excel-compatible CSV with UTF-8 BOM
  const BOM = '\uFEFF';
  const resPay = await paymentRepository.listVendorPayments({ pageSize: 2000 });
  const headers = ['Sheet No', 'Date', 'Vendor Name', 'PO/Bill No', 'Mode', 'Amount', 'Site', 'Department', 'Status', 'Payment Status', 'UTR Ref'];
  const rows = resPay.items.map(p => [
    `"${p.sheetNo}"`,
    `"${p.timestamp.substring(0, 10)}"`,
    `"${p.vendorName}"`,
    `"${p.billNoPO}"`,
    `"${p.modeOfPayment}"`,
    p.amountToBePaid,
    `"${p.site}"`,
    `"${p.department}"`,
    `"${p.status}"`,
    `"${p.paymentStatus}"`,
    `"${p.paymentReferenceNumber || ''}"`,
  ]);
  const content = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

// GET /api/reports/export/audit-csv
reportRouter.get('/export/audit-csv', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const BOM = '\uFEFF';
  const result = await paymentRepository.listAuditLogs({ pageSize: 5000 });
  const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity Type', 'Sheet No / ID', 'Status Transition', 'Remarks'];
  const rows = result.items.map((l) => [
    `"${l.timestamp}"`,
    `"${l.performedByName.replace(/"/g, '""')}"`,
    `"${l.userRole}"`,
    `"${l.action}"`,
    `"${l.recordType}"`,
    `"${l.sheetNo || l.recordId}"`,
    `"${l.oldStatus ? `${l.oldStatus} -> ` : ''}${l.newStatus || ''}"`,
    `"${(l.remarks || '').replace(/"/g, '""')}"`,
  ]);
  const content = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="OpsFlow_Audit_Trail_${Date.now()}.csv"`);
  res.send(content);
});

