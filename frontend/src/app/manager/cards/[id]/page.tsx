'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Goal, Competency, CheckIn, AppraisalResult, CardStatus } from '@alamah/shared';
import CardView from '@/components/CardView';
import CheckInForm from '@/components/CheckInForm';
import GoalSetupForm from '@/components/GoalSetupForm';

interface CardFull {
  id: string;
  cycle_id: string;
  status: CardStatus;
  employee: { name_ar: string; name_en: string; department: string; manager_id: string | null };
  goals: Goal[];
  competencies: Competency[];
  check_ins: (CheckIn & { submitter?: { name_ar: string; name_en: string } })[];
  result?: AppraisalResult | null;
}

export default function ManagerCardPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<CardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCard = useCallback(async () => {
    try {
      const data = await api.get<{ card: CardFull }>(`/cards/${id}`);
      setCard(data.card);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!card) return null;

  const needsGoalSetup = card.status === 'PENDING';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/team" className="text-gray-400 hover:text-gray-600 text-sm">← العودة للفريق</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">بطاقة أداء: {card.employee.name_ar}</h1>
      </div>

      {card.status === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
          المرحلة الأولى: يرجى تحديد الأهداف والكفاءات للموظف قبل أن يبدأ التقييم الذاتي.
        </div>
      )}

      {card.status === 'EMPLOYEE_SUBMITTED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
          المرحلة الثالثة: أكمل الموظف تقييمه الذاتي. يرجى إدخال تقييمك.
          <br />
          <strong>ملاحظة:</strong> تقييمات الموظف مخفية حتى تقدم تقييمك (تقييم أعمى).
        </div>
      )}

      <div className="space-y-6">
        {needsGoalSetup ? (
          <GoalSetupForm
            cardId={card.id}
            goals={card.goals.length > 0 ? card.goals : createEmptyGoals(card.id)}
            competencies={card.competencies.length > 0 ? card.competencies : createEmptyComps(card.id)}
            onSaved={fetchCard}
          />
        ) : (
          <CardView card={card} viewerRole="MANAGER" onRefresh={fetchCard} />
        )}

        {['ACTIVE', 'PENDING', 'EMPLOYEE_SUBMITTED', 'MANAGER_SUBMITTED'].includes(card.status) && (
          <CheckInForm cardId={card.id} onAdded={fetchCard} />
        )}
      </div>
    </div>
  );
}

function createEmptyGoals(cardId: string): Goal[] {
  return [1, 2, 3].map((order) => ({
    id: `new-goal-${order}`,
    card_id: cardId,
    order,
    title_ar: '',
    title_en: '',
    description: '',
    weight: 20.0,
    employee_rating: null,
    employee_comment: null,
    manager_rating: null,
    manager_comment: null,
    final_score: null,
  }));
}

function createEmptyComps(cardId: string): Competency[] {
  return [1, 2, 3].map((order) => ({
    id: `new-comp-${order}`,
    card_id: cardId,
    order,
    title_ar: '',
    title_en: '',
    description: '',
    weight: 13.33,
    employee_rating: null,
    employee_comment: null,
    manager_rating: null,
    manager_comment: null,
    final_score: null,
  }));
}
