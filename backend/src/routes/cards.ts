import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { RATING_LABELS } from '../types';

interface GoalRow {
  id: string;
  card_id: string;
  order: number;
  title_ar: string;
  title_en: string;
  description: string;
  employee_rating: number | null;
  employee_comment: string | null;
  manager_rating: number | null;
  manager_comment: string | null;
  final_score: unknown;
}

const router = Router({ mergeParams: true });

router.use(authenticate);

// ─── Schemas ────────────────────────────────────────────────────────────────

const createCardsSchema = z.object({
  employee_ids: z.array(z.string()).min(1),
});

const addGoalSchema = z.object({
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  description: z.string().optional().default(''),
});

const updateGoalSchema = z.object({
  title_ar: z.string().optional(),
  title_en: z.string().optional(),
  description: z.string().optional(),
  employee_rating: z.number().int().min(1).max(5).optional().nullable(),
  employee_comment: z.string().optional().nullable(),
  manager_rating: z.number().int().min(1).max(5).optional().nullable(),
  manager_comment: z.string().optional().nullable(),
});

const requestChangesSchema = z.object({
  comment: z.string().min(1),
});

const nextCycleGoalsSchema = z.object({
  goals: z.array(z.object({
    title_ar: z.string().min(1),
    title_en: z.string().min(1),
    description: z.string().optional().default(''),
  })).min(1).max(5),
});

const checkInSchema = z.object({
  quarter: z.enum(['Q1', 'Q3']),
  notes: z.string().min(1),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRatingLabel(score: number): string {
  for (const entry of RATING_LABELS) {
    if (score >= entry.min && score <= entry.max) {
      return `${entry.label_ar} (${entry.label_en})`;
    }
  }
  return 'غير محدد (Undetermined)';
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /cycles/:cycleId/cards
router.get('/:cycleId/cards', async (req: AuthRequest, res: Response) => {
  try {
    const { cycleId } = req.params;
    const { role, userId } = req.user!;

    let whereClause: Record<string, unknown> = { cycle_id: cycleId };

    if (role === 'EMPLOYEE') {
      whereClause = { ...whereClause, employee_id: userId };
    } else if (role === 'MANAGER') {
      const directReports = await prisma.user.findMany({
        where: { manager_id: userId, is_active: true },
        select: { id: true },
      });
      const reportIds = directReports.map((u: { id: string }) => u.id);
      whereClause = { ...whereClause, employee_id: { in: reportIds } };
    }

    const cards = await prisma.performanceCard.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, name_ar: true, name_en: true, email: true, department: true, role: true },
        },
        result: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cycles/:cycleId/cards — HR creates cards
router.post('/:cycleId/cards', authorize('HR_ADMIN'), validateBody(createCardsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { cycleId } = req.params;
    const { employee_ids } = req.body;

    const cycle = await prisma.performanceCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      res.status(404).json({ error: 'Cycle not found', code: 'NOT_FOUND' });
      return;
    }

    const cards = await Promise.all(
      employee_ids.map((employee_id: string) =>
        prisma.performanceCard.upsert({
          where: { cycle_id_employee_id: { cycle_id: cycleId, employee_id } },
          create: { cycle_id: cycleId, employee_id },
          update: {},
        }),
      ),
    );
    res.status(201).json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// GET /cards/:id — get single card with full details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, name_ar: true, name_en: true, email: true, department: true, manager_id: true } },
        goals: { orderBy: { order: 'asc' } },
        competencies: { orderBy: { order: 'asc' } },
        check_ins: { orderBy: { submitted_at: 'asc' } },
        result: true,
        next_cycle_goals: { orderBy: { order: 'asc' } },
      },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }

    const { role, userId } = req.user!;

    if (role === 'EMPLOYEE' && card.employee_id !== userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (role === 'MANAGER') {
      const report = await prisma.user.findFirst({ where: { id: card.employee_id, manager_id: userId } });
      if (!report) {
        res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
        return;
      }
    }

    res.json({ card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/goals — Employee adds a goal
router.post('/:id/goals', authorize('EMPLOYEE'), validateBody(addGoalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.employee_id !== req.user!.userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (card.status !== 'PENDING') {
      res.status(400).json({ error: 'Goals can only be added when card is PENDING', code: 'INVALID_STATE' });
      return;
    }
    if (card.goals.length >= 5) {
      res.status(400).json({ error: 'Maximum 5 goals allowed', code: 'MAX_GOALS' });
      return;
    }

    const nextOrder = card.goals.length + 1;
    const goal = await prisma.goal.create({
      data: {
        card_id: req.params.id,
        order: nextOrder,
        title_ar: req.body.title_ar,
        title_en: req.body.title_en,
        description: req.body.description || '',
      },
    });
    res.status(201).json({ goal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// PUT /cards/:id/goals/:goalId — update goal
router.put('/:id/goals/:goalId', validateBody(updateGoalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }

    const { role, userId } = req.user!;
    const update = req.body;

    if (role === 'EMPLOYEE') {
      if (card.employee_id !== userId) {
        res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
        return;
      }

      const titleFields = ['title_ar', 'title_en', 'description'];
      const ratingFields = ['employee_rating', 'employee_comment'];
      const titleUpdates = Object.keys(update).filter((k) => titleFields.includes(k));
      const ratingUpdates = Object.keys(update).filter((k) => ratingFields.includes(k));

      if (titleUpdates.length > 0 && card.status !== 'PENDING') {
        res.status(400).json({ error: 'Goal title/description can only be edited when card is PENDING', code: 'STAGE_LOCKED' });
        return;
      }
      if (ratingUpdates.length > 0 && card.status !== 'GOALS_APPROVED') {
        res.status(400).json({ error: 'Self-assessment ratings can only be set when card is GOALS_APPROVED', code: 'STAGE_LOCKED' });
        return;
      }

      const allowed = [...titleFields, ...ratingFields];
      const disallowed = Object.keys(update).filter((k) => !allowed.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Employees can only update employee fields', code: 'FORBIDDEN' });
        return;
      }
    } else if (role === 'MANAGER') {
      if (card.status !== 'REVIEW_SUBMITTED') {
        res.status(400).json({ error: 'Manager ratings can only be set when card is REVIEW_SUBMITTED', code: 'STAGE_LOCKED' });
        return;
      }
      const allowed = ['manager_rating', 'manager_comment'];
      const disallowed = Object.keys(update).filter((k) => !allowed.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Managers can only update manager fields', code: 'FORBIDDEN' });
        return;
      }
    }
    // HR_ADMIN can update anything

    const goal = await prisma.goal.update({
      where: { id: req.params.goalId },
      data: update,
    });
    res.json({ goal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// DELETE /cards/:id/goals/:goalId — Employee deletes a goal
router.delete('/:id/goals/:goalId', authorize('EMPLOYEE'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.employee_id !== req.user!.userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (card.status !== 'PENDING') {
      res.status(400).json({ error: 'Goals can only be deleted when card is PENDING', code: 'INVALID_STATE' });
      return;
    }
    await prisma.goal.delete({ where: { id: req.params.goalId } });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/submit-goals — Employee: PENDING → GOALS_SUBMITTED
router.post('/:id/submit-goals', authorize('EMPLOYEE'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.employee_id !== req.user!.userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (card.status !== 'PENDING') {
      res.status(400).json({ error: 'Card is not in PENDING status', code: 'INVALID_STATE' });
      return;
    }
    if (card.goals.length < 1) {
      res.status(400).json({ error: 'At least 1 goal is required', code: 'INCOMPLETE_GOALS' });
      return;
    }
    const allValid = card.goals.every((g: GoalRow) => g.title_ar && g.title_en);
    if (!allValid) {
      res.status(400).json({ error: 'All goals must have Arabic and English titles', code: 'INCOMPLETE_GOALS' });
      return;
    }

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'GOALS_SUBMITTED', goals_manager_comment: null },
    });
    res.json({ message: 'Goals submitted for manager approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/approve-goals — Manager: GOALS_SUBMITTED → GOALS_APPROVED
router.post('/:id/approve-goals', authorize('MANAGER', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'GOALS_SUBMITTED') {
      res.status(400).json({ error: 'Card is not in GOALS_SUBMITTED status', code: 'INVALID_STATE' });
      return;
    }
    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'GOALS_APPROVED', goals_manager_comment: null },
    });
    res.json({ message: 'Goals approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/request-goal-changes — Manager: GOALS_SUBMITTED → PENDING (with comment)
router.post('/:id/request-goal-changes', authorize('MANAGER', 'HR_ADMIN'), validateBody(requestChangesSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'GOALS_SUBMITTED') {
      res.status(400).json({ error: 'Card is not in GOALS_SUBMITTED status', code: 'INVALID_STATE' });
      return;
    }
    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'PENDING', goals_manager_comment: req.body.comment },
    });
    res.json({ message: 'Goal changes requested' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/submit-review — Employee: GOALS_APPROVED → REVIEW_SUBMITTED
router.post('/:id/submit-review', authorize('EMPLOYEE'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.employee_id !== req.user!.userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (card.status !== 'GOALS_APPROVED') {
      res.status(400).json({ error: 'Card is not in GOALS_APPROVED status', code: 'INVALID_STATE' });
      return;
    }
    const allRated = card.goals.every((g: GoalRow) => g.employee_rating !== null);
    if (!allRated) {
      res.status(400).json({ error: 'All goals must have employee self-assessment ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'REVIEW_SUBMITTED' },
    });
    res.json({ message: 'Review submitted to manager' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/approve-review — Manager: REVIEW_SUBMITTED → MANAGER_REVIEWED
router.post('/:id/approve-review', authorize('MANAGER', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'REVIEW_SUBMITTED') {
      res.status(400).json({ error: 'Card is not in REVIEW_SUBMITTED status', code: 'INVALID_STATE' });
      return;
    }
    const allRated = card.goals.every((g: GoalRow) => g.manager_rating !== null);
    if (!allRated) {
      res.status(400).json({ error: 'All goals must have manager ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'MANAGER_REVIEWED' },
    });
    res.json({ message: 'Manager review submitted to HR' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/finalize — HR: MANAGER_REVIEWED → FINAL
router.post('/:id/finalize', authorize('HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true, employee: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'MANAGER_REVIEWED') {
      res.status(400).json({ error: 'Card is not in MANAGER_REVIEWED status', code: 'INVALID_STATE' });
      return;
    }

    const allManagerRated = card.goals.every((g: GoalRow) => g.manager_rating !== null);
    if (!allManagerRated) {
      res.status(400).json({ error: 'All goals must have manager ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    // total_score = average of all goal manager_ratings (1–5)
    const managerRatings = card.goals.map((g: GoalRow) => g.manager_rating as number);
    const totalScore = managerRatings.reduce((sum: number, r: number) => sum + r, 0) / managerRatings.length;
    const roundedScore = parseFloat(totalScore.toFixed(4));
    const ratingLabel = getRatingLabel(roundedScore);

    const hr_notes = (req.body?.hr_notes as string) || '';

    const result = await prisma.appraisalResult.upsert({
      where: { card_id: req.params.id },
      create: {
        card_id: req.params.id,
        goals_score: roundedScore,
        competencies_score: 0,
        total_score: roundedScore,
        rating_label: ratingLabel,
        hr_notes,
        finalized_by: req.user!.userId,
      },
      update: {
        goals_score: roundedScore,
        competencies_score: 0,
        total_score: roundedScore,
        rating_label: ratingLabel,
        hr_notes,
        finalized_by: req.user!.userId,
        finalized_at: new Date(),
      },
    });

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'FINAL' },
    });

    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// GET /cards/:id/next-goals — get next cycle goals
router.get('/:id/next-goals', async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    const nextGoals = await prisma.nextCycleGoal.findMany({
      where: { card_id: req.params.id },
      orderBy: { order: 'asc' },
    });
    res.json({ nextGoals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/next-goals — Employee saves next cycle goals (replaces all)
router.post('/:id/next-goals', authorize('EMPLOYEE'), validateBody(nextCycleGoalsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.employee_id !== req.user!.userId) {
      res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    if (card.status !== 'GOALS_APPROVED') {
      res.status(400).json({ error: 'Next cycle goals can only be saved when card is GOALS_APPROVED', code: 'INVALID_STATE' });
      return;
    }

    const { goals } = req.body as { goals: Array<{ title_ar: string; title_en: string; description?: string }> };

    await prisma.nextCycleGoal.deleteMany({ where: { card_id: req.params.id } });
    const nextGoals = await Promise.all(
      goals.map((g, i) =>
        prisma.nextCycleGoal.create({
          data: {
            card_id: req.params.id,
            order: i + 1,
            title_ar: g.title_ar,
            title_en: g.title_en,
            description: g.description || '',
          },
        }),
      ),
    );

    res.json({ nextGoals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// GET /cards/:id/checkins
router.get('/:id/checkins', async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    const checkIns = await prisma.checkIn.findMany({
      where: { card_id: req.params.id },
      include: { submitter: { select: { id: true, name_ar: true, name_en: true } } },
      orderBy: { submitted_at: 'asc' },
    });
    res.json({ checkIns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/checkins
router.post('/:id/checkins', authorize('MANAGER', 'HR_ADMIN'), validateBody(checkInSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { cycle: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.cycle.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Check-ins can only be added in active cycles', code: 'INVALID_STATE' });
      return;
    }
    const checkIn = await prisma.checkIn.create({
      data: { ...req.body, card_id: req.params.id, submitted_by: req.user!.userId },
    });
    res.status(201).json({ checkIn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
