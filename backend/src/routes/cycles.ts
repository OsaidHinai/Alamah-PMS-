import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const createCycleSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
});

router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const cycles = await prisma.performanceCycle.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { cards: true } } },
    });
    res.json({ cycles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.post('/', authorize('HR_ADMIN'), validateBody(createCycleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const cycle = await prisma.performanceCycle.create({
      data: { ...req.body, created_by: req.user!.userId, status: 'DRAFT' },
    });
    res.status(201).json({ cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.put('/:id/activate', authorize('HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.performanceCycle.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Cycle not found', code: 'NOT_FOUND' });
      return;
    }
    if (existing.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT cycles can be activated', code: 'INVALID_STATE' });
      return;
    }
    const cycle = await prisma.performanceCycle.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });

    // Auto-create cards for all active employees, managers, and HR admins
    const participants = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'] }, is_active: true },
    });
    await Promise.all(
      participants.map((u: { id: string }) =>
        prisma.performanceCard.upsert({
          where: { cycle_id_employee_id: { cycle_id: req.params.id, employee_id: u.id } },
          create: { cycle_id: req.params.id, employee_id: u.id },
          update: {},
        }),
      ),
    );

    // Notify participants
    const { sendCycleActivatedEmail } = await import('../services/email.service');
    for (const u of participants) {
      await sendCycleActivatedEmail(u as unknown as import('../types').User);
    }

    res.json({ cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.put('/:id/close', authorize('HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.performanceCycle.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Cycle not found', code: 'NOT_FOUND' });
      return;
    }
    if (existing.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Only ACTIVE cycles can be closed', code: 'INVALID_STATE' });
      return;
    }
    const cycle = await prisma.performanceCycle.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json({ cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// PUT /cycles/:id/phases — HR sets phase dates
router.put('/:id/phases', authorize('HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { phase1_start, phase1_end, phase2_start, phase2_end } = req.body;
    const cycle = await prisma.performanceCycle.update({
      where: { id: req.params.id },
      data: {
        phase1_start: phase1_start ? new Date(phase1_start) : null,
        phase1_end:   phase1_end   ? new Date(phase1_end)   : null,
        phase2_start: phase2_start ? new Date(phase2_start) : null,
        phase2_end:   phase2_end   ? new Date(phase2_end)   : null,
      },
    });
    res.json({ cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
