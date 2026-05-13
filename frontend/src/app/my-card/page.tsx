'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { PerformanceCard, PerformanceCycle, Goal, Competency, CheckIn, AppraisalResult, CardStatus } from '@alamah/shared';
import CardView from '@/components/CardView';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

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
        <div>
          {activeCard.status === 'PENDING' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
              جاري إعداد بطاقتك من قِبل المدير. ستتمكن من إدخال تقييمك الذاتي قريباً.
            </div>
          )}
          {activeCard.status === 'EMPLOYEE_SUBMITTED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
              تم إرسال تقييمك الذاتي بنجاح. جاري مراجعة المدير.
            </div>
          )}
          {activeCard.status === 'MANAGER_SUBMITTED' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
              اكتملت مرحلة تقييم المدير. جاري المراجعة النهائية من الموارد البشرية.
            </div>
          )}
          <CardView card={activeCard} viewerRole="EMPLOYEE" onRefresh={fetchData} />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
          لا توجد بطاقة أداء نشطة لك حالياً.
          <br />
          <span className="text-sm">سيقوم قسم الموارد البشرية بتعيين بطاقتك عند بدء دورة التقييم.</span>
        </div>
      )}
    </div>
  );
}

export default function MyCardPage() {
  return (
    <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <MyCardContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}
