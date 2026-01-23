import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../security/jwt';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies } from '../middleware/cookies';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { authMiddleware } from '../middleware/auth';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import { logger } from '../lib/logger';

// Schema para validação de senha no primeiro acesso
const firstAccessPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Za-z]/, 'Senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

export function registerAuthRoutes(app: Express) {
  // Initial setup endpoint - creates admin user if none exists
  app.post('/api/auth/setup', asyncHandler(async (req: Request, res: Response) => {
    const { setupKey } = req.body;
    const expectedKey = process.env.SETUP_KEY;
    
    if (!expectedKey) {
      logger.warn('Setup endpoint accessed but SETUP_KEY not configured');
      throw new AppError(503, 'Setup not available - SETUP_KEY not configured');
    }
    
    if (!setupKey || setupKey !== expectedKey) {
      logger.warn('Invalid setup key attempted');
      throw new AppError(403, 'Invalid setup key');
    }
    
    const existingAdmin = await storage.getUserByUsername('admin');
    if (existingAdmin) {
      return res.json({ 
        success: true, 
        message: 'Admin user already exists',
        alreadySetup: true 
      });
    }
    
    // Use environment variables for default passwords, with secure fallbacks
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const defaultEnfermeiroPassword = process.env.DEFAULT_ENFERMEIRO_PASSWORD || 'enf123';
    
    const adminPassword = await bcryptjs.hash(defaultAdminPassword, 10);
    await storage.createUser({
      username: 'admin',
      email: 'admin@11care.com.br',
      password: adminPassword,
      name: 'Administrador',
      role: 'admin',
      isActive: true,
    });
    
    const enfermeiroPassword = await bcryptjs.hash(defaultEnfermeiroPassword, 10);
    const existingEnfermeiro = await storage.getUserByUsername('enfermeiro');
    if (!existingEnfermeiro) {
      await storage.createUser({
        username: 'enfermeiro',
        email: 'enfermagem@11care.com.br',
        password: enfermeiroPassword,
        name: 'Enfermeiro(a)',
        role: 'enfermagem',
        isActive: true,
      });
    }
    
    logger.info('Initial setup completed - admin user created');
    
    // Only return credentials if not in production (security measure)
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({ 
      success: true, 
      message: 'Setup completed successfully',
      credentials: isProduction ? undefined : {
        admin: { username: 'admin', password: defaultAdminPassword },
        enfermeiro: { username: 'enfermeiro', password: defaultEnfermeiroPassword }
      },
      note: isProduction ? 'Credentials configured via environment variables' : undefined
    });
  }));

  // Login endpoint
  app.post('/api/auth/login', asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError(400, 'Username and password required');
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const passwordValid = await bcryptjs.compare(password, user.password);
    if (!passwordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        firstAccess: user.firstAccess,
      },
      accessToken,
    });
  }));

  // First access password change endpoint
  app.post('/api/auth/first-access-password', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await storage.getUser(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.firstAccess) {
      throw new AppError(400, 'User has already changed their password');
    }

    // Validate password
    const validation = firstAccessPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { newPassword } = validation.data;

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update user with new password and set firstAccess to false
    await storage.updateUser(user.id, {
      password: hashedPassword,
      firstAccess: false,
    });

    // Clear old cookies and generate new tokens
    clearAuthCookies(res);

    const updatedUser = await storage.getUser(user.id);
    if (!updatedUser) {
      throw new AppError(500, 'Failed to refresh user data');
    }

    const newAccessToken = generateAccessToken(updatedUser);
    const newRefreshToken = generateRefreshToken(updatedUser);

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    logger.info(`User ${user.username} completed first access password change`);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        firstAccess: updatedUser.firstAccess,
      },
      accessToken: newAccessToken,
    });
  }));

  // Logout endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Refresh token endpoint
  app.post('/api/auth/refresh', asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, 'Refresh token required');
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new AppError(401, 'Invalid refresh token');
    }

    const user = await storage.getUser(payload.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const newAccessToken = generateAccessToken(user);
    setAccessTokenCookie(res, newAccessToken);

    res.json({ success: true, accessToken: newAccessToken });
  }));

  // Get current user endpoint
  app.get('/api/auth/me', asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await storage.getUser(req.user.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      firstAccess: user.firstAccess,
    });
  }));
}
