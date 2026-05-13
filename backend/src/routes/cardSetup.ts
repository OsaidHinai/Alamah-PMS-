import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const initCardSchema = z.object({
  goals: z.array(z.object({
    title_ar: z.string().min(1),
    title_en: z.string().min(1),
    description: z.string().default(''),
  })).length(3),
  competencies: z.array(z.object({
    title_ar: z.string().min(1),
    title_en: z.string().min(1),
    description: z.string().default(''),
  })).length(3),
});

// POST /cards/:id/init — initialise goals and competencies (HR_ADMIN or MANAGER)
router.post('/:id/init', authenticate, authorize('HR_ADMIN', 'MANAGER'), validateBody(initCardSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id }, include: { goals: true, competencies: true } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'PENDING') {
      res.status(400).json({ error: 'Card goals can only be set in PENDING status', code: 'INVALID_STATE' });
      return;
    }

    const { goals, competencies } = req.body;

    // Delete existing goals/competencies
    await prisma.goal.deleteMany({ where: { card_id: req.params.id } });
    await prisma.competency.deleteMany({ where: { card_id: req.params.id } });

    // Create new
    await prisma.goal.createMany({
      data: goals.map((g: { title_ar: string; title_en: string; description: string }, i: number) => ({
        card_id: req.params.id,
        order: i + 1,
        title_ar: g.title_ar,
        title_en: g.title_en,
        description: g.description,
        weight: 20.0,
      })),
    });

    await prisma.competency.createMany({
      data: competencies.map((c: { title_ar: string; title_en: string; description: string }, i: number) => ({
        card_id: req.params.id,
        order: i + 1,
        title_ar: c.title_ar,
        title_en: c.title_en,
        description: c.description,
        weight: 13.33,
      })),
    });

    const updated = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: { orderBy: { order: 'asc' } }, competencies: { orderBy: { order: 'asc' } } },
    });
    res.json({ card: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
