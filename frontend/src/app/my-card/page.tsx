'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { PerformanceCard, PerformanceCycle, Goal, NextCycleGoal, AppraisalResult, CardStatus } from '@alamah/shared';
import CardView from '@/components/CardView';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';

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

interface CardWithCycle extends PerformanceCard {
  cycle: PerformanceCycle;
}

function MyCardContent() {
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState<CardFull | null>(null);
  const [allCards, setAllCards] = useState<CardWithCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const cyclesData = await api.get<{ cycles: PerformanceCycle[] }>('/cycles');
      const activeCycle = cyclesData.cycles.find((c) => c.status === 'ACTIVE');

      if (activeCycle) {
        try {
          const cardsData = await api.get<{ cards: CardWithCycle[] }>(`/cycles/${activeCycle.id}/cards`);
          const myCard = cardsData.cards.find((c) => c.employee_id === user?.id);
          if (myCard) {
            const cardDetail = await api.get<{ card: CardFull }>(`/cards/${myCard.id}`);
            setActiveCard(cardDetail.card);
          }
        } catch { /* no card for this employee */ }
      }

      // Fetch all finalized cards
      const allFinal: CardWithCycle[] = [];
      for (const cycle of cyclesData.cycles) {
        try {
          const cardsData = await api.get<{ cards: (CardWithCycle & { cycle: PerformanceCycle })[] }>(`/cycles/${cycle.id}/cards`);
          const myCards = cardsData.cards.filter((c) => c.employee_id === user?.id && c.status === 'FINAL');
          allFinal.push(...myCards.map((c) => ({ ...c, cycle })));
        } catch { /* skip */ }
      }
      setAllCards(allFinal);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">بطاقتي</h1>
        <p className="text-gray-500 text-sm">My Performance Card</p>
      </div>

      {activeCard ? (
        <CardView card={activeCard} viewerRole="EMPLOYEE" onRefresh={fetchData} />
      ) : (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
          لا توجد بطاقة أداء نشطة لك حالياً.
          <br />
          <span className="text-sm">سيقوم قسم الموارد البشرية بتعيين بطاقتك عند بدء دورة التقييم.</span>
        </div>
      )}

      {/* Historical finalized cards */}
      {allCards.length > 0 && !activeCard && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">البطاقات السابقة</h2>
          <div className="space-y-2">
            {allCards.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <span className="text-sm text-gray-700">{c.cycle?.name} — {c.cycle?.year}</span>
                <span className="text-xs text-green-600 font-medium">نهائي</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyCardPage() {
  return (
    <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
      <AppShell>
        <MyCardContent />
      </AppShell>
    </ProtectedRoute>
  );
}
