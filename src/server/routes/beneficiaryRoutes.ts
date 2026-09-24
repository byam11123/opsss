// OpsFlow 360 – Beneficiary Creation Workflow Routes

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, requirePermission, AuthenticatedRequest } from '../auth/authMiddleware';
import { PERMISSION_CODES } from '../auth/permissions';

export const beneficiaryRouter = Router();

// Indian IFSC validator: 4 letters, '0', 6 alphanumerics
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// GET /api/beneficiaries
beneficiaryRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const query = req.query as any;

  const filters: any = {
    page: query.page ? parseInt(query.page) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize) : 20,
    search: query.search,
    status: query.status,
    additionStatus: query.additionStatus,
    department: query.department,
  };

  if (user.role === 'EMPLOYEE_REQUESTER' && !req.userPermissions?.has(PERMISSION_CODES.BENEFICIARY_VIEW_ALL)) {
    filters.requestedByUserId = user.id;
  }

  const result = await paymentRepository.listBeneficiaries(filters);
  const summary = paymentRepository.getBeneficiarySummary ? await paymentRepository.getBeneficiarySummary() : null;
  res.json({
    success: true,
    message: 'Beneficiaries fetched successfully',
    data: {
      ...result,
      summary,
    },
  });
});

// GET /api/beneficiaries/summary
beneficiaryRouter.get('/summary', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const summary = paymentRepository.getBeneficiarySummary ? await paymentRepository.getBeneficiarySummary() : null;
  res.json({
    success: true,
    message: 'Beneficiary summary fetched successfully',
    data: summary,
  });
});

// GET /api/beneficiaries/:id
beneficiaryRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getBeneficiaryById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
    return;
  }

  if (req.user!.role === 'EMPLOYEE_REQUESTER' && item.submittedByUserId !== req.user!.id) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  res.json({
    success: true,
    message: 'Beneficiary details retrieved',
    data: item,
  });
});

// GET /api/beneficiaries/:id/history
beneficiaryRouter.get('/:id/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const history = await paymentRepository.getStatusHistory('BENEFICIARY', req.params.id);
  res.json({
    success: true,
    message: 'Beneficiary history retrieved',
    data: history,
  });
});

// POST /api/beneficiaries
beneficiaryRouter.post(
  '/',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_CREATE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { nameOfBeneficiary, accountNo, ifscCode, bankName, purpose, cancelledChequeUrl, remark, department } = req.body;

    const fields: string[] = [];
    if (!nameOfBeneficiary?.trim()) fields.push('nameOfBeneficiary');
    if (!accountNo?.trim()) fields.push('accountNo');
    if (!ifscCode?.trim()) fields.push('ifscCode');
    if (!bankName?.trim()) fields.push('bankName');
    if (!purpose?.trim()) fields.push('purpose');
    if (!cancelledChequeUrl?.trim()) fields.push('cancelledChequeUrl');

    if (fields.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All beneficiary fields including cancelled cheque upload are mandatory.',
          fields,
        },
      });
      return;
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!IFSC_REGEX.test(cleanIfsc)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IFSC_CODE',
          message: 'Invalid IFSC code format. Must be 4 uppercase letters, 0, followed by 6 alphanumeric characters (e.g., ICIC0000161, SBIN0004283).',
          fields: ['ifscCode'],
        },
      });
      return;
    }

    const cleanAcc = accountNo.trim().replace(/\s+/g, '');
    if (cleanAcc.length < 9 || cleanAcc.length > 18 || !/^\d+$/.test(cleanAcc)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACCOUNT_NUMBER',
          message: 'Account number must be numeric and between 9 to 18 digits.',
          fields: ['accountNo'],
        },
      });
      return;
    }

    // Duplicate detection
    const existingList = await paymentRepository.listBeneficiaries({ pageSize: 500 });
    const duplicate = existingList.items.find(
      b => b.accountNo === cleanAcc && b.ifscCode.toUpperCase() === cleanIfsc && b.status !== 'REJECTED' && b.status !== 'CANCELLED'
    );
    if (duplicate) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_BENEFICIARY',
          message: `A beneficiary record with this Account Number and IFSC already exists (${duplicate.sheetNo} - ${duplicate.nameOfBeneficiary}).`,
          fields: ['accountNo', 'ifscCode'],
        },
      });
      return;
    }

    const user = req.user!;
    const newRecord = await paymentRepository.createBeneficiary(
      {
        nameOfBeneficiary: nameOfBeneficiary.trim(),
        accountNo: cleanAcc,
        ifscCode: cleanIfsc,
        bankName: bankName.trim(),
        purpose: purpose.trim(),
        cancelledChequeUrl: cancelledChequeUrl.trim(),
        remark: remark?.trim(),
        department: department || user.department,
      },
      user.id,
      user.name,
      user.role
    );

    res.status(201).json({
      success: true,
      message: `Beneficiary request ${newRecord.sheetNo} created successfully!`,
      data: newRecord,
    });
  }
);

// POST /api/beneficiaries/:id/review
beneficiaryRouter.post(
  '/:id/review',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_REVIEW),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
      return;
    }

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      { status: 'UNDER_REVIEW' },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REVIEW',
      req.body.remarks || 'Beneficiary marked under review'
    );

    res.json({
      success: true,
      message: `Beneficiary ${item.sheetNo} is now Under Review`,
      data: updated,
    });
  }
);

// POST /api/beneficiaries/:id/approve
beneficiaryRouter.post(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_APPROVE),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
      return;
    }

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      { status: 'APPROVED' },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'APPROVE',
      req.body.remarks || 'Approved by Finance'
    );

    res.json({
      success: true,
      message: `Beneficiary ${item.sheetNo} approved for bank entry`,
      data: updated,
    });
  }
);

// POST /api/beneficiaries/:id/reject
beneficiaryRouter.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_REJECT),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
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

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      { status: 'REJECTED', rejectionReason: reason.trim() },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'REJECT',
      remarks ? `${reason.trim()} - ${remarks.trim()}` : reason.trim()
    );

    res.json({
      success: true,
      message: `Beneficiary ${item.sheetNo} rejected`,
      data: updated,
    });
  }
);

// POST /api/beneficiaries/:id/cancel
beneficiaryRouter.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const item = await paymentRepository.getBeneficiaryById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
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

  const updated = await paymentRepository.updateBeneficiary(
    item.id,
    { status: 'CANCELLED', cancellationReason: reason.trim() },
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'CANCEL',
    reason.trim()
  );

  res.json({
    success: true,
    message: `Beneficiary request ${item.sheetNo} cancelled`,
    data: updated,
  });
});

// POST /api/beneficiaries/:id/start-entry
beneficiaryRouter.post(
  '/:id/start-entry',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_START_ENTRY),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
      return;
    }

    if (item.status !== 'APPROVED') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Beneficiary must be APPROVED before starting entry.' },
      });
      return;
    }

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      { additionStatus: 'IN_PROGRESS', beneficiaryEntry: 'In Progress' },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'START_BENEFICIARY_ENTRY',
      req.body.remarks || 'Started bank portal entry'
    );

    res.json({
      success: true,
      message: `Beneficiary ${item.sheetNo} entry marked IN_PROGRESS`,
      data: updated,
    });
  }
);

// POST /api/beneficiaries/:id/complete-entry
beneficiaryRouter.post(
  '/:id/complete-entry',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_COMPLETE_ENTRY),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
      return;
    }

    const { entryReferenceNumber, entryRemarks } = req.body;
    if (!entryReferenceNumber?.trim() && !entryRemarks?.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ENTRY_REFERENCE_REQUIRED',
          message: 'Bank beneficiary reference number or entry remarks are mandatory to mark addition complete.',
          fields: ['entryReferenceNumber', 'entryRemarks'],
        },
      });
      return;
    }

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      {
        additionStatus: 'DONE',
        beneficiaryEntry: 'Done',
        entryReferenceNumber: entryReferenceNumber?.trim(),
        entryRemarks: entryRemarks?.trim(),
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'COMPLETE_BENEFICIARY_ENTRY',
      `Beneficiary registered with Ref: ${entryReferenceNumber || entryRemarks}`
    );

    res.json({
      success: true,
      message: `Beneficiary ${item.nameOfBeneficiary} successfully marked DONE!`,
      data: updated,
    });
  }
);

// POST /api/beneficiaries/:id/mark-failed
beneficiaryRouter.post(
  '/:id/mark-failed',
  authenticate,
  requirePermission(PERMISSION_CODES.BENEFICIARY_MARK_FAILED),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const item = await paymentRepository.getBeneficiaryById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Beneficiary not found' } });
      return;
    }

    const { remarks } = req.body;
    if (!remarks?.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'REMARKS_REQUIRED', message: 'Failure reason/remarks are required.', fields: ['remarks'] },
      });
      return;
    }

    const updated = await paymentRepository.updateBeneficiary(
      item.id,
      {
        additionStatus: 'FAILED',
        beneficiaryEntry: 'Failed',
        entryRemarks: remarks.trim(),
      },
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_FAILED',
      remarks.trim()
    );

    res.json({
      success: true,
      message: `Beneficiary addition marked FAILED`,
      data: updated,
    });
  }
);
