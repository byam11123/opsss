// OpsFlow 360 – Enterprise Backend Server Entry Point

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './src/server/routes/authRoutes';
import { interbankRouter } from './src/server/routes/interbankRoutes';
import { beneficiaryRouter } from './src/server/routes/beneficiaryRoutes';
import { vendorPaymentRouter } from './src/server/routes/vendorPaymentRoutes';
import { fileRouter } from './src/server/routes/fileRoutes';
import { reportRouter } from './src/server/routes/reportRoutes';
import { systemRouter } from './src/server/routes/systemRoutes';
import { itChecklistRouter } from './src/server/routes/itChecklistRoutes';
import purchaseFMSRoutes from './src/server/routes/purchaseFMSRoutes';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Export app for Vercel Serverless Functions
export default app;

async function startServer() {
  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Basic security and request timing header
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'OpsFlow 360 – Payment Process Management Module',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Mount API modules FIRST before Vite
  app.use('/api/auth', authRouter);
  app.use('/api/interbank-transfers', interbankRouter);
  app.use('/api/beneficiaries', beneficiaryRouter);
  app.use('/api/vendor-payments', vendorPaymentRouter);
  app.use('/api/it-checklist', itChecklistRouter);
  app.use('/api/purchase-fms', purchaseFMSRoutes);
  app.use('/api/files', fileRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api', systemRouter);

  // Centralized Error Handling
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[OpsFlow 360 Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred processing your payment request.',
        fields: err.fields || [],
      },
    });
  });

  // Vite Middleware for client frontend
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[OpsFlow 360] Server active on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
} else {
  // If on Vercel, just run the setup without listening
  startServer().catch(console.error);
}
