import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { hashPassword, generateTemporaryPassword } from '../utils/password';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { sendWelcomeEmail } from '../services/email.service';
import { User } from '../types';

const router = Router();

const createUserSchema = z.object({
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']),
  manager_id: z.string().optional().nullable(),
  department: z.string().min(1),
});

const updateUserSchema = z.object({
  name_ar: z.string().min(1).optional(),
  name_en: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  manager_id: z.string().optional().nullable(),
  department: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

const userSelect = {
  id: true, name_ar: true, name_en: true, email: true,
  role: true, manager_id: true, department: true,
  is_active: true, force_password_change: true,
  created_at: true, updated_at: true,
};

router.use(authenticate, authorize('HR_ADMIN'));

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { created_at: 'desc' } });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.post('/', validateBody(createUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name_ar, name_en, email, role, manager_id, department } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already in use', code: 'EMAIL_CONFLICT' });
      return;
    }
    const temporaryPassword = generateTemporaryPassword();
    const password_hash = await hashPassword(temporaryPassword);
    const user = await prisma.user.create({
      data: { name_ar, name_en, email, password_hash, role, manager_id: manager_id || null, department, force_password_change: true },
      select: userSelect,
    });
    await sendWelcomeEmail(user as unknown as User, temporaryPassword);
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userSelect });
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.put('/:id', validateBody(updateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: userSelect,
    });
    res.json({ user });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { is_active: false },
    });
    res.json({ message: 'User deactivated' });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
