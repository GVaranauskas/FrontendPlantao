import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { insertUserSchema, updateUserSchema, userRoles } from '@shared/schema';
import { requireRoleWithAuth } from '../middleware/rbac';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';

// Use combined middleware: auth + firstAccess check + admin role
const requireAdmin = requireRoleWithAuth('admin');

export function registerUserRoutes(app: Express) {
  app.get('/api/users', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    }));
    res.json(sanitizedUsers);
  }));

  app.get('/api/users/:id', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  }));

  app.post('/api/users', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const createUserSchema = insertUserSchema.extend({
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const validatedData = createUserSchema.parse(req.body);

    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      throw new AppError(409, 'Username already exists');
    }

    const hashedPassword = await bcryptjs.hash(validatedData.password, 10);
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  }));

  app.patch('/api/users/:id', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const validatedData = updateUserSchema.parse(req.body);

    if (validatedData.username && validatedData.username !== user.username) {
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        throw new AppError(409, 'Username already exists');
      }
    }

    const updateData: Record<string, any> = { ...validatedData };
    if (validatedData.password) {
      updateData.password = await bcryptjs.hash(validatedData.password, 10);
    }

    const updatedUser = await storage.updateUser(req.params.id, updateData);
    if (!updatedUser) {
      throw new AppError(500, 'Failed to update user');
    }

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    });
  }));

  app.delete('/api/users/:id', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (req.user?.userId === req.params.id) {
      throw new AppError(400, 'Cannot deactivate your own account');
    }

    const success = await storage.deactivateUser(req.params.id);
    if (!success) {
      throw new AppError(500, 'Failed to deactivate user');
    }

    res.json({ success: true, message: 'User deactivated successfully' });
  }));

  app.get('/api/roles', ...requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    res.json(userRoles);
  }));
}
