import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);
router.use(authorize('CEO'));

// GET /ceo/overview - aggregate dashboard data
router.get('/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const [cycles, cards, users] = await Promise.all([
      prisma.performanceCycle.findMany({ orderBy: { created_at: 'desc' } }),
      prisma.performanceCard.findMany({
        include: {
          employee: { select: { id: true, name_ar: true, name_en: true, role: true, department: true } },
          goals: true,
          result: true,
          cycle: { select: { id: true, name: true, year: true, status: true } },
        },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.user.findMany({
        where: { is_active: true },
        select: { id: true, name_ar: true, name_en: true, role: true, department: true },
      }),
    ]);
    res.json({ cycles, cards, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

export default router;
