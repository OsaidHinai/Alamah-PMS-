'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Goal, NextCycleGoal, AppraisalResult, CardStatus } from '@alamah/shared';
import CardView from '@/components/CardView';
import CheckInForm from '@/components/CheckInForm';

interface CardFull {
  id: string;
  cycle_id: string;
  status: CardStatus;
  goals_manager_comment: string | null;
  employee: { name_ar: string; name_en: string; department: string; manager_id: string | null };
  goals: Goal[];
  next_cycle_goals: NextCycleGoal[];
  result?: AppraisalResult | null;
}

export default function AdminCardPage() {
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/cycles/${card.cycle_id}`} className="text-gray-400 hover:text-gray-600 text-sm">← العودة للدورة</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">بطاقة أداء: {card.employee.name_ar}</h1>
      </div>

      <div className="space-y-6">
        <CardView card={card} viewerRole="HR_ADMIN" onRefresh={fetchCard} />
        {['PENDING', 'GOALS_SUBMITTED', 'GOALS_APPROVED', 'REVIEW_SUBMITTED', 'MANAGER_REVIEWED'].includes(card.status) && (
          <CheckInForm cardId={card.id} onAdded={fetchCard} />
        )}
      </div>
    </div>
  );
}
