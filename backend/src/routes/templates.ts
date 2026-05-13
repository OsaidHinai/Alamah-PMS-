import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.competencyTemplate.findMany({ orderBy: { title_en: 'asc' } });
    res.json({ templates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
