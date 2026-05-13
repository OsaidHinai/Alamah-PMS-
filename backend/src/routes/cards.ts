import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateBody } from '../middleware/validateBody';
import { computeCardScores } from '../services/scoring.service';
import {
  sendEmployeeSubmittedEmail,
  sendManagerSubmittedEmail,
  sendCardFinalizedEmail,
} from '../services/email.service';
import { User, AppraisalResult } from '@alamah/shared';

const router = Router({ mergeParams: true });

router.use(authenticate);

const createCardsSchema = z.object({
  employee_ids: z.array(z.string()).min(1),
});

const updateGoalSchema = z.object({
  title_ar: z.string().optional(),
  title_en: z.string().optional(),
  description: z.string().optional(),
  weight: z.number().positive().optional(),
  employee_rating: z.number().int().min(1).max(5).optional().nullable(),
  employee_comment: z.string().optional().nullable(),
  manager_rating: z.number().int().min(1).max(5).optional().nullable(),
  manager_comment: z.string().optional().nullable(),
  final_score: z.number().min(1).max(5).optional().nullable(),
});

const updateCompetencySchema = updateGoalSchema;

const finalizeSchema = z.object({
  goals: z.array(z.object({ id: z.string(), final_score: z.number().min(1).max(5).optional().nullable() })),
  competencies: z.array(z.object({ id: z.string(), final_score: z.number().min(1).max(5).optional().nullable() })),
  hr_notes: z.string().default(''),
});

const checkInSchema = z.object({
  quarter: z.enum(['Q1', 'Q3']),
  notes: z.string().min(1),
});

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

// POST /cycles/:cycleId/cards
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

// GET /cards/:id
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
      },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }

    const { role, userId } = req.user!;

    // Access control
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

    // Hide employee ratings from manager during blind rating stage (EMPLOYEE_SUBMITTED status)
    const isManagerBlind = role === 'MANAGER' && card.status === 'EMPLOYEE_SUBMITTED';
    if (isManagerBlind) {
      const sanitized = {
        ...card,
        goals: card.goals.map((g: typeof card.goals[0]) => ({
          ...g,
          employee_rating: null,
          employee_comment: null,
        })),
        competencies: card.competencies.map((c: typeof card.competencies[0]) => ({
          ...c,
          employee_rating: null,
          employee_comment: null,
        })),
      };
      res.json({ card: sanitized });
      return;
    }

    res.json({ card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/submit-employee
router.post('/:id/submit-employee', authorize('EMPLOYEE'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true, competencies: true, employee: true },
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

    // Validate all employee ratings are set
    const allRated = [...card.goals, ...card.competencies].every((item) => item.employee_rating !== null);
    if (!allRated) {
      res.status(400).json({ error: 'All goals and competencies must have employee ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'EMPLOYEE_SUBMITTED' },
    });

    // Notify manager
    if (card.employee.manager_id) {
      const manager = await prisma.user.findUnique({ where: { id: card.employee.manager_id } });
      if (manager) {
        await sendEmployeeSubmittedEmail(manager as unknown as User, card.employee as unknown as User);
      }
    }

    res.json({ message: 'Self-assessment submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/submit-manager
router.post('/:id/submit-manager', authorize('MANAGER', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true, competencies: true, employee: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'EMPLOYEE_SUBMITTED') {
      res.status(400).json({ error: 'Card is not in EMPLOYEE_SUBMITTED status', code: 'INVALID_STATE' });
      return;
    }

    // Validate all manager ratings are set
    const allRated = [...card.goals, ...card.competencies].every((item) => item.manager_rating !== null);
    if (!allRated) {
      res.status(400).json({ error: 'All goals and competencies must have manager ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'MANAGER_SUBMITTED' },
    });

    // Notify HR Admin
    const hrAdmins = await prisma.user.findMany({ where: { role: 'HR_ADMIN', is_active: true } });
    for (const hr of hrAdmins) {
      await sendManagerSubmittedEmail(hr as unknown as User, card.employee as unknown as User);
    }

    res.json({ message: 'Manager rating submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /cards/:id/finalize
router.post('/:id/finalize', authorize('HR_ADMIN'), validateBody(finalizeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true, competencies: true, employee: true },
    });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }
    if (card.status !== 'MANAGER_SUBMITTED') {
      res.status(400).json({ error: 'Card is not in MANAGER_SUBMITTED status', code: 'INVALID_STATE' });
      return;
    }

    const { goals: goalOverrides, competencies: compOverrides, hr_notes } = req.body;

    // Apply final_score overrides
    for (const override of goalOverrides) {
      if (override.final_score !== undefined) {
        await prisma.goal.update({
          where: { id: override.id },
          data: { final_score: override.final_score },
        });
      }
    }
    for (const override of compOverrides) {
      if (override.final_score !== undefined) {
        await prisma.competency.update({
          where: { id: override.id },
          data: { final_score: override.final_score },
        });
      }
    }

    // Re-fetch updated goals/competencies
    const updatedCard = await prisma.performanceCard.findUnique({
      where: { id: req.params.id },
      include: { goals: true, competencies: true, employee: true },
    });

    type ScoringRow = { employee_rating: number | null; manager_rating: number | null; final_score: unknown };
    const scoreResult = computeCardScores(
      (updatedCard!.goals as ScoringRow[]).map((g) => ({
        employee_rating: g.employee_rating,
        manager_rating: g.manager_rating,
        final_score: g.final_score != null ? Number(g.final_score) : null,
      })),
      (updatedCard!.competencies as ScoringRow[]).map((c) => ({
        employee_rating: c.employee_rating,
        manager_rating: c.manager_rating,
        final_score: c.final_score != null ? Number(c.final_score) : null,
      })),
    );

    if (!scoreResult) {
      res.status(400).json({ error: 'Cannot compute scores — incomplete ratings', code: 'INCOMPLETE_RATINGS' });
      return;
    }

    const result = await prisma.appraisalResult.upsert({
      where: { card_id: req.params.id },
      create: {
        card_id: req.params.id,
        goals_score: scoreResult.goals_score,
        competencies_score: scoreResult.competencies_score,
        total_score: scoreResult.total_score,
        rating_label: scoreResult.rating_label,
        hr_notes,
        finalized_by: req.user!.userId,
      },
      update: {
        goals_score: scoreResult.goals_score,
        competencies_score: scoreResult.competencies_score,
        total_score: scoreResult.total_score,
        rating_label: scoreResult.rating_label,
        hr_notes,
        finalized_by: req.user!.userId,
        finalized_at: new Date(),
      },
    });

    await prisma.performanceCard.update({
      where: { id: req.params.id },
      data: { status: 'FINAL' },
    });

    // Notify employee and manager
    if (updatedCard!.employee.manager_id) {
      const manager = await prisma.user.findUnique({ where: { id: updatedCard!.employee.manager_id } });
      if (manager) {
        await sendCardFinalizedEmail(
          updatedCard!.employee as unknown as User,
          manager as unknown as User,
          result as unknown as AppraisalResult,
        );
      }
    }

    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// PUT /cards/:id/goals/:goalId
router.put('/:id/goals/:goalId', authenticate, validateBody(updateGoalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }

    const { role, userId } = req.user!;
    const update = req.body;

    // Stage locking enforcement
    const employeeFields = ['employee_rating', 'employee_comment'];
    const managerFields = ['manager_rating', 'manager_comment'];
    const adminFields = ['title_ar', 'title_en', 'description', 'weight', 'final_score'];

    if (role === 'EMPLOYEE') {
      if (card.employee_id !== userId) {
        res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
        return;
      }
      if (card.status !== 'PENDING') {
        res.status(400).json({ error: 'Employee fields are locked after submission', code: 'STAGE_LOCKED' });
        return;
      }
      const disallowed = Object.keys(update).filter((k) => !employeeFields.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Employees can only update employee fields', code: 'FORBIDDEN' });
        return;
      }
    } else if (role === 'MANAGER') {
      if (['PENDING', 'MANAGER_SUBMITTED', 'FINAL'].includes(card.status)) {
        res.status(400).json({ error: 'Manager fields are locked in this stage', code: 'STAGE_LOCKED' });
        return;
      }
      const disallowed = Object.keys(update).filter((k) => !managerFields.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Managers can only update manager fields', code: 'FORBIDDEN' });
        return;
      }
    } else if (role === 'HR_ADMIN') {
      const allowed = [...employeeFields, ...managerFields, ...adminFields];
      const disallowed = Object.keys(update).filter((k) => !allowed.includes(k));
      if (disallowed.length > 0) {
        res.status(400).json({ error: 'Unknown fields', code: 'VALIDATION_ERROR' });
        return;
      }
    }

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

// PUT /cards/:id/competencies/:compId
router.put('/:id/competencies/:compId', authenticate, validateBody(updateCompetencySchema), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.performanceCard.findUnique({ where: { id: req.params.id } });
    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'NOT_FOUND' });
      return;
    }

    const { role, userId } = req.user!;
    const update = req.body;

    const employeeFields = ['employee_rating', 'employee_comment'];
    const managerFields = ['manager_rating', 'manager_comment'];
    const adminFields = ['title_ar', 'title_en', 'description', 'weight', 'final_score'];

    if (role === 'EMPLOYEE') {
      if (card.employee_id !== userId) {
        res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
        return;
      }
      if (card.status !== 'PENDING') {
        res.status(400).json({ error: 'Employee fields are locked after submission', code: 'STAGE_LOCKED' });
        return;
      }
      const disallowed = Object.keys(update).filter((k) => !employeeFields.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Employees can only update employee fields', code: 'FORBIDDEN' });
        return;
      }
    } else if (role === 'MANAGER') {
      if (['PENDING', 'MANAGER_SUBMITTED', 'FINAL'].includes(card.status)) {
        res.status(400).json({ error: 'Manager fields are locked in this stage', code: 'STAGE_LOCKED' });
        return;
      }
      const disallowed = Object.keys(update).filter((k) => !managerFields.includes(k));
      if (disallowed.length > 0) {
        res.status(403).json({ error: 'Managers can only update manager fields', code: 'FORBIDDEN' });
        return;
      }
    } else if (role === 'HR_ADMIN') {
      const allowed = [...employeeFields, ...managerFields, ...adminFields];
      const disallowed = Object.keys(update).filter((k) => !allowed.includes(k));
      if (disallowed.length > 0) {
        res.status(400).json({ error: 'Unknown fields', code: 'VALIDATION_ERROR' });
        return;
      }
    }

    const competency = await prisma.competency.update({
      where: { id: req.params.compId },
      data: update,
    });
    res.json({ competency });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// GET /cards/:id/checkins
router.get('/:id/checkins', authenticate, async (req: AuthRequest, res: Response) => {
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
