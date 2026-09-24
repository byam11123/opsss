// OpsFlow 360 – IT Checklist Module Routes
import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { authenticate, AuthenticatedRequest } from '../auth/authMiddleware';

export const itChecklistRouter = Router();

// GET /api/it-checklist/tasks
itChecklistRouter.get('/tasks', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as any;

    const sanitize = (val: any): string | undefined => {
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        val === 'undefined' ||
        val === 'null' ||
        val === 'ALL'
      ) {
        return undefined;
      }
      return String(val).trim();
    };

    const filters = {
      page: query.page && query.page !== 'undefined' ? Math.max(1, parseInt(query.page, 10) || 1) : 1,
      pageSize: query.pageSize && query.pageSize !== 'undefined' ? Math.max(1, parseInt(query.pageSize, 10) || 25) : 25,
      search: sanitize(query.search),
      doerName: sanitize(query.doerName),
      site: sanitize(query.site),
      frequency: sanitize(query.frequency),
      equipmentType: sanitize(query.equipmentType),
      status: sanitize(query.status),
    };

    const result = await paymentRepository.listITTasks!(filters);
    res.json({
      success: true,
      message: 'IT Checklist tasks fetched successfully',
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch IT checklist tasks',
    });
  }
});

// GET /api/it-checklist/summary
itChecklistRouter.get('/summary', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const summary = await paymentRepository.getITChecklistSummary!();
    res.json({
      success: true,
      message: 'IT Checklist summary fetched successfully',
      data: summary,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch IT checklist summary',
    });
  }
});

// GET /api/it-checklist/doers
itChecklistRouter.get('/doers', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doers = await paymentRepository.getITDoers!();
    res.json({
      success: true,
      message: 'IT Checklist doers fetched successfully',
      data: doers,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch IT checklist doers',
    });
  }
});

// POST /api/it-checklist/tasks/:taskId/complete
itChecklistRouter.post('/tasks/:taskId/complete', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { remarks, actualDate } = req.body;
    const user = req.user!;

    const updatedTask = await paymentRepository.completeITTask!(
      taskId,
      user.id,
      user.name,
      remarks,
      actualDate
    );

    res.json({
      success: true,
      message: `Task #${updatedTask.taskId} marked as completed`,
      data: updatedTask,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to mark task as completed',
    });
  }
});

// POST /api/it-checklist/sync
itChecklistRouter.post('/sync', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const syncRes = await paymentRepository.syncITChecklist!();
    res.json({
      success: true,
      message: syncRes.success
        ? `Successfully synced ${syncRes.totalLoaded} tasks from Google Sheets`
        : `Synced locally: ${syncRes.totalLoaded} tasks ready`,
      data: syncRes,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to sync IT checklist',
    });
  }
});
