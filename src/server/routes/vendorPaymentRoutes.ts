// OpsFlow 360 – Vendor Payment Workflow Routes

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth/authMiddleware';
import { PERMISSION_CODES } from '../auth/permissions';

export const vendorPaymentRouter = Router();

// GET /api/vendor-payments
vendorPaymentRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const query = req.query as any;

  const filters: any = {
    page: query.page ? parseInt(query.page) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize) : 20,
    search: query.search,
    status: query.status,
    paymentEntryStatus: query.paymentEntryStatus,
    paymentStatus: query.paymentStatus,
    modeOfPayment: query.modeOfPayment,
    department: query.department,
    site: query.site,
    minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
    maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
  };

  if (user.role === 'EMPLOYEE_REQUESTER' && !req.userPermissions?.has(PERMISSION_CODES.VENDOR_PAYMENT_VIEW_ALL)) {
    filters.requestedByUserId = user.id;
  } else if (user.role === 'DEPARTMENT_MANAGER' && !req.userPermissions?.has(PERMISSION_CODES.VENDOR_PAYMENT_VIEW_ALL)) {
    filters.department = user.department;
  }

  const result = await paymentRepository.listVendorPayments(filters);
  const summary = paymentRepository.getVendorPaymentSummary ? await paymentRepository.getVendorPaymentSummary() : null;
  res.json({
    success: true,
    message: 'Vendor payments fetched successfully',
    data: {
      ...result,
      summary,
    },
  });
});

// GET /api/vendor-payments/summary
vendorPaymentRouter.get('/summary', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const summary = paymentRepository.getVendorPaymentSummary ? await paymentRepository.getVendorPaymentSummary() : null;
  res.json({
    success: true,
    message: 'Vendor payment summary fetched successfully',
    data: summary,
  });
});

// GET /api/vendor-payments/:id
vendorPaymentRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getVendorPaymentById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
    return;
  }

  if (req.user!.role === 'EMPLOYEE_REQUESTER' && item.submittedByUserId !== req.user!.id) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  res.json({
    success: true,
    message: 'Vendor payment details retrieved',
    data: item,
  });
});

// GET /api/vendor-payments/:id/history
vendorPaymentRouter.get('/:id/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const history = await paymentRepository.getStatusHistory('VENDOR_PAYMENT', req.params.id);
  res.json({
    success: true,
    message: 'Payment history retrieved',
    data: history,
  });
});

// POST /api/vendor-payments
vendorPaymentRouter.post(
  '/',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_CREATE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      vendorName,
      beneficiaryId,
      billNoPO,
      purposeOfPayment,
      site,
      department,
      modeOfPayment,
      poBillInvoiceUrl,
      amountToBePaid,
      remark,
      paymentProofFileIds,
    } = req.body;

    const fields: string[] = [];
    if (!vendorName?.trim()) fields.push('vendorName');
    if (!billNoPO?.trim()) fields.push('billNoPO');
    if (!purposeOfPayment?.trim()) fields.push('purposeOfPayment');
    if (!site?.trim()) fields.push('site');
    if (!amountToBePaid || isNaN(amountToBePaid) || Number(amountToBePaid) <= 0) fields.push('amountToBePaid');
    if (!poBillInvoiceUrl?.trim()) fields.push('poBillInvoiceUrl');

    const mode = modeOfPayment || 'ACCOUNT';
    // For account transfer modes, link to approved beneficiary is required
    if (['ACCOUNT', 'NEFT', 'RTGS', 'IMPS'].includes(mode)) {
      if (!beneficiaryId?.trim()) {
        fields.push('beneficiaryId');
      } else {
        const ben = await paymentRepository.getBeneficiaryById(beneficiaryId.trim());
        if (!ben || ben.status !== 'APPROVED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'BENEFICIARY_NOT_APPROVED',
              message: 'The selected beneficiary must be in APPROVED status for account transfer payments.',
              fields: ['beneficiaryId'],
            },
          });
          return;
        }
      }
    }

    if (fields.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please complete all required fields including bill/PO document and approved beneficiary.',
          fields,
        },
      });
      return;
    }

    const user = req.user!;
    const newRecord = await paymentRepository.createVendorPayment(
      {
        vendorName: vendorName.trim(),
        beneficiaryId: beneficiaryId?.trim(),
        billNoPO: billNoPO.trim(),
        purposeOfPayment: purposeOfPayment.trim(),
        site: site.trim(),
        department: department || user.department,
        modeOfPayment: mode,
        poBillInvoiceUrl: poBillInvoiceUrl.trim(),
        amountToBePaid: Number(amountToBePaid),
        remark: remark?.trim(),
        paymentProofFileIds: paymentProofFileIds || [],
      },
      user.id,
      user.name,
      user.role
    );

    res.status(201).json({
      success: true,
      message: `Vendor payment request ${newRecord.sheetNo} submitted successfully!`,
      data: newRecord,
    });
  }
);

// POST /api/vendor-payments/:id/review
vendorPaymentRouter.post(
  '/:id/review',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_REVIEW),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      { status: 'UNDER_REVIEW' },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REVIEW',
      req.body.remarks || 'Payment request marked under review'
    );

    res.json({
      success: true,
      message: `Payment request ${item.sheetNo} moved to Under Review`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/approve
vendorPaymentRouter.post(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_APPROVE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        status: 'APPROVED',
        approvalRemarks: req.body.remarks?.trim() || 'Approved for payment entry',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'APPROVE',
      req.body.remarks?.trim()
    );

    res.json({
      success: true,
      message: `Payment request ${item.sheetNo} approved successfully`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/reject
vendorPaymentRouter.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_REJECT),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const { reason, remarks } = req.body;
    if (!reason?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'REJECTION_REASON_REQUIRED', message: 'Rejection reason is mandatory.', fields: ['reason'] },
      });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
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
      message: `Payment request ${item.sheetNo} rejected`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/cancel
vendorPaymentRouter.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getVendorPaymentById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
    return;
  }

  if (req.user!.id !== item.submittedByUserId && req.user!.role !== 'SUPER_ADMIN') {
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

  const updated = await paymentRepository.updateVendorPayment(
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
    message: `Payment request ${item.sheetNo} cancelled`,
    data: updated,
  });
});

// POST /api/vendor-payments/:id/start-payment-entry
vendorPaymentRouter.post(
  '/:id/start-payment-entry',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_START_PAYMENT_ENTRY),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    if (item.status !== 'APPROVED') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Payment must be in APPROVED status to start payment entry.' },
      });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        paymentEntry: 'IN_PROGRESS',
        paymentEntryTimestamp: new Date().toISOString(),
        paymentEntryRemarks: req.body.remarks?.trim() || 'Payment entry started in banking portal',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'START_PAYMENT_ENTRY',
      req.body.remarks?.trim()
    );

    res.json({
      success: true,
      message: `Payment entry for ${item.sheetNo} marked IN_PROGRESS`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/complete-payment-entry
vendorPaymentRouter.post(
  '/:id/complete-payment-entry',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_COMPLETE_PAYMENT_ENTRY),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const { paymentReferenceNumber, paymentEntryRemarks } = req.body;

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        paymentEntry: 'DONE',
        paymentEntryTimestamp: new Date().toISOString(),
        paymentStatus: 'PROCESSING',
        paymentReferenceNumber: paymentReferenceNumber?.trim() || item.paymentReferenceNumber,
        paymentEntryRemarks: paymentEntryRemarks?.trim() || 'Payment submitted to bank',
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'COMPLETE_PAYMENT_ENTRY',
      `Payment entry done. Ref: ${paymentReferenceNumber || ''}`
    );

    res.json({
      success: true,
      message: `Payment entry completed. Request ${item.sheetNo} moved to PROCESSING`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/mark-paid
vendorPaymentRouter.post(
  '/:id/mark-paid',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_MARK_PAID),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const { paymentReferenceNumber, paymentRemarks, paymentProofFileIds } = req.body;

    if (!paymentReferenceNumber?.trim() && !paymentRemarks?.trim() && (!paymentProofFileIds || paymentProofFileIds.length === 0)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_PROOF_OR_REF_REQUIRED',
          message: 'Payment reference number (UTR), payment remarks, or payment proof attachment is required to mark as PAID.',
          fields: ['paymentReferenceNumber', 'paymentRemarks'],
        },
      });
      return;
    }

    const now = new Date().toISOString();
    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        paymentStatus: 'PAID',
        paymentDoneTimestamp: now,
        paymentReferenceNumber: paymentReferenceNumber?.trim() || item.paymentReferenceNumber,
        paymentRemarks: paymentRemarks?.trim() || item.paymentRemarks || 'Payment verified and settled',
        paymentVerificationRemarks: req.body.verificationRemarks?.trim() || 'Bank statement debit verified',
        paymentProofFileIds: paymentProofFileIds || item.paymentProofFileIds || [],
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_PAID',
      `Payment marked PAID with UTR ${paymentReferenceNumber || ''}`
    );

    res.json({
      success: true,
      message: `Vendor payment ${item.sheetNo} marked as PAID!`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/mark-failed
vendorPaymentRouter.post(
  '/:id/mark-failed',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_MARK_FAILED),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const { remarks } = req.body;
    if (!remarks?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'REMARKS_REQUIRED', message: 'Failure reason is required.', fields: ['remarks'] },
      });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        paymentStatus: 'FAILED',
        paymentRemarks: remarks.trim(),
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_FAILED',
      remarks.trim()
    );

    res.json({
      success: true,
      message: `Payment ${item.sheetNo} marked as FAILED`,
      data: updated,
    });
  }
);

// POST /api/vendor-payments/:id/mark-reversed
vendorPaymentRouter.post(
  '/:id/mark-reversed',
  authenticate,
  requirePermission(PERMISSION_CODES.VENDOR_PAYMENT_MARK_REVERSED),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getVendorPaymentById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor payment not found' } });
      return;
    }

    const { remarks } = req.body;
    if (!remarks?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'REMARKS_REQUIRED', message: 'Reversal reason is required.', fields: ['remarks'] },
      });
      return;
    }

    const updated = await paymentRepository.updateVendorPayment(
      item.id,
      {
        paymentStatus: 'REVERSED',
        paymentRemarks: `Reversed: ${remarks.trim()}`,
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_REVERSED',
      remarks.trim()
    );

    res.json({
      success: true,
      message: `Payment ${item.sheetNo} marked as REVERSED`,
      data: updated,
    });
  }
);
