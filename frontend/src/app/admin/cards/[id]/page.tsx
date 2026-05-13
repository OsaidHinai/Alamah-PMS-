'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Goal, Competency, CheckIn, AppraisalResult, CardStatus, User } from '@alamah/shared';
import CardView from '@/components/CardView';
import GoalSetupForm from '@/components/GoalSetupForm';
import CheckInForm from '@/components/CheckInForm';

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

export default function AdminCardPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<CardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'setup' | 'review'>('setup');

  const fetchCard = useCallback(async () => {
    try {
      const data = await api.get<{ card: CardFull }>(`/cards/${id}`);
      setCard(data.card);
      if (data.card.status !== 'PENDING' || (data.card.goals.length > 0 && data.card.goals[0].title_ar)) {
        setTab('review');
      }
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

  const needsSetup = card.status === 'PENDING' && card.goals.length === 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/cycles/${card.cycle_id}`} className="text-gray-400 hover:text-gray-600 text-sm">← العودة للدورة</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">بطاقة أداء: {card.employee.name_ar}</h1>
      </div>

      {card.status === 'PENDING' && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('setup')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'setup' ? 'bg-primary text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            إعداد الأهداف والكفاءات
          </button>
          {!needsSetup && (
            <button
              onClick={() => setTab('review')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'review' ? 'bg-primary text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              عرض البطاقة
            </button>
          )}
        </div>
      )}

      {(tab === 'setup' && card.status === 'PENDING') ? (
        <GoalSetupForm
          cardId={card.id}
          goals={card.goals.length > 0 ? card.goals : createEmptyItems(card.id, 'goal')}
          competencies={card.competencies.length > 0 ? card.competencies : createEmptyItems(card.id, 'comp')}
          onSaved={fetchCard}
        />
      ) : (
        <div className="space-y-6">
          <CardView card={card} viewerRole="HR_ADMIN" onRefresh={fetchCard} />
          {['ACTIVE', 'PENDING', 'EMPLOYEE_SUBMITTED', 'MANAGER_SUBMITTED'].includes(card.status) && (
            <CheckInForm cardId={card.id} onAdded={fetchCard} />
          )}
        </div>
      )}
    </div>
  );
}

function createEmptyItems(cardId: string, type: 'goal' | 'comp'): Goal[] | Competency[] {
  return [1, 2, 3].map((order) => ({
    id: `new-${type}-${order}`,
    card_id: cardId,
    order,
    title_ar: '',
    title_en: '',
    description: '',
    weight: type === 'goal' ? 20.0 : 13.33,
    employee_rating: null,
    employee_comment: null,
    manager_rating: null,
    manager_comment: null,
    final_score: null,
  })) as Goal[];
}
