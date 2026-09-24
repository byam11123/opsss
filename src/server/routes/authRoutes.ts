// OpsFlow 360 – Authentication API Routes

import { Router, Response } from 'express';
import { paymentRepository } from '../storage/googleSheetsRepository';
import { generateToken, authenticate, AuthenticatedRequest } from '../auth/authMiddleware';
import { ROLE_DEFINITIONS } from '../auth/permissions';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res): Promise<void> => {
  const { email, userId } = req.body;

  let targetUser = null;
  if (userId) {
    targetUser = await paymentRepository.getUserById(userId);
  } else if (email) {
    const users = await paymentRepository.getUsers();
    targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  if (!targetUser || !targetUser.active) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or inactive user account.',
      },
    });
    return;
  }

  const { accessToken, refreshToken } = generateToken(targetUser);

  // Log audit
  await paymentRepository.createAuditLog({
    recordType: 'SYSTEM',
    recordId: targetUser.id,
    sheetNo: 'AUTH/LOGIN',
    action: 'LOGIN',
    remarks: `User ${targetUser.name} (${targetUser.role}) logged in`,
    performedByUserId: targetUser.id,
    performedByName: targetUser.name,
    userRole: targetUser.role,
    module: 'auth',
    successFlag: true,
  });

  const roleDef = ROLE_DEFINITIONS[targetUser.role];
  const permissions = roleDef ? roleDef.permissions : [];

  res.json({
    success: true,
    message: `Welcome, ${targetUser.name}!`,
    data: {
      user: targetUser,
      permissions,
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res): Promise<void> => {
  const { refreshToken, userId } = req.body;
  const user = await paymentRepository.getUserById(userId || 'usr-1');
  if (!user || !user.active) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'User not found or inactive.' },
    });
    return;
  }

  const tokens = generateToken(user);
  res.json({
    success: true,
    message: 'Token refreshed',
    data: tokens,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    await paymentRepository.createAuditLog({
      recordType: 'SYSTEM',
      recordId: req.user.id,
      sheetNo: 'AUTH/LOGOUT',
      action: 'LOGOUT',
      remarks: `User ${req.user.name} logged out`,
      performedByUserId: req.user.id,
      performedByName: req.user.name,
      userRole: req.user.role,
      module: 'auth',
      successFlag: true,
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } });
    return;
  }

  const roleDef = ROLE_DEFINITIONS[req.user.role];
  const permissions = Array.from(req.userPermissions || []);

  res.json({
    success: true,
    message: 'Current profile retrieved',
    data: {
      user: req.user,
      permissions,
      roleDefinition: roleDef,
    },
  });
});
