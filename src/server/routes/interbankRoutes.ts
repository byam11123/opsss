// OpsFlow 360 – Interbank Transfer Routes & Workflow Engine

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth/authMiddleware';
import { PERMISSION_CODES } from '../auth/permissions';

export const interbankRouter = Router();

// GET /api/interbank-transfers
interbankRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const query = req.query as any;

  const filters: any = {
    page: query.page ? parseInt(query.page) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize) : 20,
    search: query.search,
    status: query.status,
    priority: query.priority,
    site: query.site,
    department: query.department,
    minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
    maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
  };

  // Enforce role-based viewing boundaries:
  // Requester can only view their own submitted requests
  if (user.role === 'EMPLOYEE_REQUESTER' && !req.userPermissions?.has(PERMISSION_CODES.INTERBANK_VIEW_ALL)) {
    filters.requestedByUserId = user.id;
  } else if (user.role === 'DEPARTMENT_MANAGER' && !req.userPermissions?.has(PERMISSION_CODES.INTERBANK_VIEW_ALL)) {
    filters.department = user.department;
  }

  const result = await paymentRepository.listInterbankTransfers(filters);
  const summary = paymentRepository.getInterbankSummary ? await paymentRepository.getInterbankSummary() : null;
  res.json({
    success: true,
    message: 'Interbank transfers fetched successfully',
    data: {
      ...result,
      summary,
    },
  });
});

// GET /api/interbank-transfers/summary
interbankRouter.get('/summary', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const summary = paymentRepository.getInterbankSummary ? await paymentRepository.getInterbankSummary() : null;
  res.json({
    success: true,
    message: 'Interbank transfers summary fetched successfully',
    data: summary,
  });
});

// GET /api/interbank-transfers/:id
interbankRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getInterbankTransferById(req.params.id);
  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Interbank transfer not found' },
    });
    return;
  }

  // Requester privacy boundary
  if (req.user!.role === 'EMPLOYEE_REQUESTER' && item.requestedByUserId !== req.user!.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only view your own submitted requests.' },
    });
    return;
  }

  res.json({
    success: true,
    message: 'Interbank transfer details retrieved',
    data: item,
  });
});

// GET /api/interbank-transfers/:id/history
interbankRouter.get('/:id/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const history = await paymentRepository.getStatusHistory('INTERBANK', req.params.id);
  res.json({
    success: true,
    message: 'Status history retrieved',
    data: history,
  });
});

// POST /api/interbank-transfers
interbankRouter.post(
  '/',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_CREATE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { transferFrom, transferTo, purpose, amount, site, department, remarks, priority, attachmentFileIds } = req.body;

    const fields: string[] = [];
    if (!transferFrom?.trim()) fields.push('transferFrom');
    if (!transferTo?.trim()) fields.push('transferTo');
    if (transferFrom?.trim() && transferTo?.trim() && transferFrom.trim().toLowerCase() === transferTo.trim().toLowerCase()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transfer From and Transfer To accounts cannot be identical.',
          fields: ['transferFrom', 'transferTo'],
        },
      });
      return;
    }
    if (!purpose?.trim()) fields.push('purpose');
    if (!amount || isNaN(amount) || Number(amount) <= 0) fields.push('amount');
    if (!site?.trim()) fields.push('site');

    if (fields.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide all mandatory interbank transfer details.',
          fields,
        },
      });
      return;
    }

    const user = req.user!;
    const newRecord = await paymentRepository.createInterbankTransfer(
      {
        transferFrom: transferFrom.trim(),
        transferTo: transferTo.trim(),
        purpose: purpose.trim(),
        amount: Number(amount),
        site: site.trim(),
        department: department || user.department,
        remarks: remarks?.trim(),
        priority: priority || 'NORMAL',
        attachmentFileIds: attachmentFileIds || [],
      },
      user.id,
      user.name,
      user.role
    );

    res.status(201).json({
      success: true,
      message: `Interbank transfer request ${newRecord.sheetNo} submitted successfully!`,
      data: newRecord,
    });
  }
);

// POST /api/interbank-transfers/:id/review
interbankRouter.post(
  '/:id/review',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_REVIEW),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getInterbankTransferById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    if (item.status !== 'SUBMITTED') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot move to UNDER_REVIEW from ${item.status}` },
      });
      return;
    }

    const updated = await paymentRepository.updateInterbankTransfer(
      item.id,
      { status: 'UNDER_REVIEW' },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REVIEW',
      req.body.remarks || 'Request marked under review'
    );

    res.json({
      success: true,
      message: `Request ${item.sheetNo} moved to Under Review`,
      data: updated,
    });
  }
);

// POST /api/interbank-transfers/:id/approve
interbankRouter.post(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_APPROVE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getInterbankTransferById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    const allowedStatuses = ['SUBMITTED', 'UNDER_REVIEW'];
    if (!allowedStatuses.includes(item.status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot approve request with status ${item.status}` },
      });
      return;
    }

    const updated = await paymentRepository.updateInterbankTransfer(
      item.id,
      {
        status: 'APPROVED',
        approvalRemarks: req.body.remarks?.trim() || 'Approved by Finance Authority',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'APPROVE',
      req.body.remarks?.trim()
    );

    res.json({
      success: true,
      message: `Request ${item.sheetNo} approved successfully`,
      data: updated,
    });
  }
);

// POST /api/interbank-transfers/:id/reject
interbankRouter.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_REJECT),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getInterbankTransferById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    const { reason, remarks } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REJECTION_REASON_REQUIRED',
          message: 'A mandatory rejection reason must be provided.',
          fields: ['reason'],
        },
      });
      return;
    }

    const updated = await paymentRepository.updateInterbankTransfer(
      item.id,
      {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REJECT',
      remarks ? `${reason.trim()} - ${remarks.trim()}` : reason.trim()
    );

    res.json({
      success: true,
      message: `Request ${item.sheetNo} rejected`,
      data: updated,
    });
  }
);

// POST /api/interbank-transfers/:id/cancel
interbankRouter.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getInterbankTransferById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
    return;
  }

  // Only requester or admin can cancel
  if (req.user!.id !== item.requestedByUserId && req.user!.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only cancel your own submitted requests.' },
    });
    return;
  }

  const { reason } = req.body;
  if (!reason?.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'CANCELLATION_REASON_REQUIRED', message: 'Cancellation reason is mandatory.', fields: ['reason'] },
    });
    return;
  }

  const updated = await paymentRepository.updateInterbankTransfer(
    item.id,
    {
      status: 'CANCELLED',
      cancellationReason: reason.trim(),
    },
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CANCEL',
    reason.trim()
  );

  res.json({
    success: true,
    message: `Request ${item.sheetNo} cancelled`,
    data: updated,
  });
});

// POST /api/interbank-transfers/:id/start-processing
interbankRouter.post(
  '/:id/start-processing',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_START_PROCESSING),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getInterbankTransferById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    if (item.status !== 'APPROVED') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Only APPROVED requests can enter processing.' },
      });
      return;
    }

    const updated = await paymentRepository.updateInterbankTransfer(
      item.id,
      {
        status: 'PROCESSING',
        processingRemarks: req.body.remarks?.trim() || 'Bank transfer processing initiated',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'START_PROCESSING',
      req.body.remarks?.trim()
    );

    res.json({
      success: true,
      message: `Request ${item.sheetNo} is now PROCESSING`,
      data: updated,
    });
  }
);

// POST /api/interbank-transfers/:id/complete
interbankRouter.post(
  '/:id/complete',
  authenticate,
  requirePermission(PERMISSION_CODES.INTERBANK_COMPLETE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getInterbankTransferById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
      return;
    }

    if (!['APPROVED', 'PROCESSING'].includes(item.status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Cannot complete request that is not approved or processing.' },
      });
      return;
    }

    const { paymentReferenceNumber, processingRemarks } = req.body;
    if (!paymentReferenceNumber?.trim() && !processingRemarks?.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_REFERENCE_REQUIRED',
          message: 'Payment reference number (UTR) or completion remarks are required to mark complete.',
          fields: ['paymentReferenceNumber', 'processingRemarks'],
        },
      });
      return;
    }

    const updated = await paymentRepository.updateInterbankTransfer(
      item.id,
      {
        status: 'COMPLETED',
        paymentReferenceNumber: paymentReferenceNumber?.trim(),
        processingRemarks: processingRemarks?.trim() || 'Completed successfully',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'COMPLETE',
      `Completed with Ref: ${paymentReferenceNumber || processingRemarks}`
    );

    res.json({
      success: true,
      message: `Interbank transfer ${item.sheetNo} marked COMPLETED!`,
      data: updated,
    });
  }
);
