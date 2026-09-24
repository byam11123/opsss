import { Router } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { PurchaseFMSFilterParams } from '../../types';

const router = Router();

// Middleware to strip undefined/null from query
router.use((req, res, next) => {
  for (const key in req.query) {
    const val = req.query[key];
    if (val === 'undefined' || val === 'null' || val === 'ALL' || val === '') {
      delete req.query[key];
    }
  }
  next();
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await paymentRepository.getPurchaseSummary();
    res.json({ success: true, message: 'Purchase FMS summary fetched', data: summary });
  } catch (error: any) {
    console.error('Error fetching Purchase FMS summary:', error);
    res.status(500).json({ success: false, message: 'Server error', error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const filters: PurchaseFMSFilterParams = {
      search: req.query.search as string,
      siteName: req.query.siteName as string,
      priority: req.query.priority as string,
      status: req.query.status as string,
      dateStart: req.query.dateStart as string,
      dateEnd: req.query.dateEnd as string,
      page: parseInt((req.query.page as string) || '1', 10),
      pageSize: parseInt((req.query.pageSize as string) || '25', 10),
    };

    const data = await paymentRepository.getPurchasePipeline(filters);
    res.json({ success: true, message: 'Purchase pipeline fetched successfully', data });
  } catch (error: any) {
    console.error('Error fetching Purchase pipeline:', error);
    res.status(500).json({ success: false, message: 'Server error', error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

export default router;
