// OpsFlow 360 – System, Users, Audit, Notifications & Google Sheets Status Routes

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth/authMiddleware';
import { PERMISSION_CODES } from '../auth/permissions';
import { googleIntegrationService } from '../google/sheetsClient';
import { SHEET_TABS } from '../google/sheetsSchema';

export const systemRouter = Router();

// GET /api/audit-logs
systemRouter.get(
  '/audit-logs',
  authenticate,
  requirePermission(PERMISSION_CODES.AUDIT_VIEW),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = req.query as any;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : (query.limit ? parseInt(query.limit, 10) : 50);
    const result = await paymentRepository.listAuditLogs({
      page,
      pageSize,
      search: query.search || query.searchTerm,
      status: query.status,
      action: query.action,
      entityType: query.entityType,
    });

    res.json({
      success: true,
      message: 'Audit logs retrieved',
      data: result,
    });
  }
);

// GET /api/audit-logs/:recordType/:recordId
systemRouter.get(
  '/audit-logs/:recordType/:recordId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await paymentRepository.listAuditLogs({ pageSize: 500 });
    const matched = result.items.filter(
      l =>
        l.recordType.toUpperCase() === req.params.recordType.toUpperCase() &&
        l.recordId === req.params.recordId
    );

    res.json({
      success: true,
      message: 'Record audit logs retrieved',
      data: matched,
    });
  }
);

// GET /api/notifications
systemRouter.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const list = await paymentRepository.listNotifications(req.user!.id);
  res.json({
    success: true,
    message: 'Notifications retrieved',
    data: list,
  });
});

// POST /api/notifications/:id/read
systemRouter.post('/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await paymentRepository.markNotificationRead(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Notification marked read' });
});

// POST /api/notifications/read-all
systemRouter.post('/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await paymentRepository.markAllNotificationsRead(req.user!.id);
  res.json({ success: true, message: 'All notifications marked read' });
});

// Master Data Endpoints
systemRouter.get('/users', authenticate, async (_req, res): Promise<void> => {
  const users = await paymentRepository.getUsers();
  res.json({ success: true, message: 'Users retrieved', data: users });
});

systemRouter.get('/roles', authenticate, async (_req, res): Promise<void> => {
  const roles = await paymentRepository.getRoles();
  res.json({ success: true, message: 'Roles retrieved', data: roles });
});

systemRouter.get('/permissions', authenticate, async (_req, res): Promise<void> => {
  const perms = await paymentRepository.getPermissions();
  res.json({ success: true, message: 'Permissions retrieved', data: perms });
});

systemRouter.get('/departments', authenticate, async (_req, res): Promise<void> => {
  const depts = await paymentRepository.getDepartments();
  res.json({ success: true, message: 'Departments retrieved', data: depts });
});

systemRouter.get('/locations', authenticate, async (_req, res): Promise<void> => {
  const locs = await paymentRepository.getLocations();
  res.json({ success: true, message: 'Locations retrieved', data: locs });
});

// Google Sheets Operational Database status endpoint
systemRouter.get('/sheets/status', authenticate, async (_req, res): Promise<void> => {
  const status = googleIntegrationService.getStatus();
  const repo = paymentRepository as any;
  const liveCount = repo.liveLoadedCount || 0;
  const liveTotal = repo.liveTotalAmount || 0;
  const liveInterbankCount = repo.liveInterbankCount || 0;
  const liveInterbankAmount = repo.liveInterbankAmount || 0;
  const liveBeneficiaryCount = repo.liveBeneficiaryCount || 0;
  const liveITChecklistCount = repo.liveITChecklistCount || 0;
  const vpRes = await paymentRepository.listVendorPayments({ pageSize: 1 });
  const ibRes = await paymentRepository.listInterbankTransfers({ pageSize: 1 });
  const benRes = await paymentRepository.listBeneficiaries({ pageSize: 1 });
  const itRes = paymentRepository.listITTasks ? await paymentRepository.listITTasks({ pageSize: 1 }) : { pagination: { totalItems: 0 } };

  const totalLiveRecords =
    (liveCount || vpRes.pagination.totalItems) +
    (liveInterbankCount || ibRes.pagination.totalItems) +
    (liveBeneficiaryCount || benRes.pagination.totalItems) +
    (liveITChecklistCount || itRes.pagination.totalItems);

  res.json({
    success: true,
    message: 'Google Sheets integration status retrieved',
    data: {
      ...status,
      spreadsheetName: 'Ops BANK Payment Approval Form (Responses)',
      interbankSpreadsheetName: 'Ops INTERBANK (IBT) Transfer Form (Responses)',
      beneficiarySpreadsheetName: 'Ops BENEFICIARY Approval Form (Responses)',
      itChecklistSpreadsheetName: 'IT Checklist 52-Weeks Master',
      configuredTabs: Object.values(SHEET_TABS),
      liveIngestedCount: liveCount || vpRes.pagination.totalItems,
      liveTotalAmount: liveTotal,
      liveInterbankCount: liveInterbankCount || ibRes.pagination.totalItems,
      liveInterbankAmount: liveInterbankAmount,
      liveBeneficiaryCount: liveBeneficiaryCount || benRes.pagination.totalItems,
      liveITChecklistCount: liveITChecklistCount || itRes.pagination.totalItems,
      liveAuditCount: repo.liveAuditCount || 0,
      totalLiveRecords,
      details: totalLiveRecords > 0
        ? `Connected to 4 live sheets: Vendor Payments (${liveCount || vpRes.pagination.totalItems}), Interbank Transfers (${liveInterbankCount || ibRes.pagination.totalItems}), Beneficiaries (${liveBeneficiaryCount || benRes.pagination.totalItems}), IT Checklist (${liveITChecklistCount || itRes.pagination.totalItems}).`
        : status.details,
      localSeedCount: {
        users: 20,
        departments: 5,
        locations: (await paymentRepository.getLocations()).length,
        interbankTransfers: ibRes.pagination.totalItems,
        beneficiaries: benRes.pagination.totalItems,
        vendorPayments: vpRes.pagination.totalItems,
        itChecklistTasks: itRes.pagination.totalItems,
      },
    },
  });
});

// Google Sheets Operational Database manual synchronization check
systemRouter.post('/sheets/sync', authenticate, async (_req, res): Promise<void> => {
  const repo = paymentRepository as any;
  let syncResult = { count: 0, totalAmount: 0 };
  if (typeof repo.loadFromLiveGoogleSheets === 'function') {
    syncResult = await repo.loadFromLiveGoogleSheets();
  }
  const status = googleIntegrationService.getStatus();
  const ibRes = await paymentRepository.listInterbankTransfers({ pageSize: 1 });
  const benRes = await paymentRepository.listBeneficiaries({ pageSize: 1 });
  const vpRes = await paymentRepository.listVendorPayments({ pageSize: 1 });
  const itRes = paymentRepository.listITTasks ? await paymentRepository.listITTasks({ pageSize: 1 }) : { pagination: { totalItems: 0 } };

  res.json({
    success: true,
    message: `Synchronized ${syncResult.count} live operational records across Vendor Payments (${vpRes.pagination.totalItems}), Interbank (${ibRes.pagination.totalItems}), Beneficiaries (${benRes.pagination.totalItems}), and IT Checklist (${itRes.pagination.totalItems}).`,
    data: {
      ...status,
      syncedCount: syncResult.count,
      totalAmount: syncResult.totalAmount,
      vendorPaymentsCount: vpRes.pagination.totalItems,
      interbankCount: ibRes.pagination.totalItems,
      beneficiariesCount: benRes.pagination.totalItems,
      itChecklistCount: itRes.pagination.totalItems,
    },
  });
});

// OpenAPI 3.0 specification endpoint
systemRouter.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'OpsFlow 360 – Payment Operations API',
      version: '1.0.0',
      description: 'REST API documentation for OpsFlow 360 Payment Process Management module backed by Google Sheets operational database.',
    },
    paths: {
      '/api/auth/login': { post: { summary: 'Login and acquire JWT tokens' } },
      '/api/interbank-transfers': {
        get: { summary: 'List interbank transfer requests' },
        post: { summary: 'Create and submit an interbank transfer' },
      },
      '/api/beneficiaries': {
        get: { summary: 'List beneficiaries' },
        post: { summary: 'Create new beneficiary request' },
      },
      '/api/vendor-payments': {
        get: { summary: 'List vendor payment requests' },
        post: { summary: 'Create new vendor payment request' },
      },
      '/api/reports/dashboard': { get: { summary: 'Aggregated metrics and charts' } },
      '/api/audit-logs': { get: { summary: 'Immutable audit log entries' } },
    },
  });
});
