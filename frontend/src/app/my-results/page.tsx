'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PerformanceCard, PerformanceCycle, AppraisalResult } from '@alamah/shared';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';

interface CardWithResult extends PerformanceCard {
  cycle: PerformanceCycle;
  result?: AppraisalResult | null;
}

function MyResultsContent() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardWithResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      const cyclesData = await api.get<{ cycles: PerformanceCycle[] }>('/cycles');
      const allFinal: CardWithResult[] = [];
      for (const cycle of cyclesData.cycles) {
        try {
          const cardsData = await api.get<{ cards: (PerformanceCard & { result?: AppraisalResult })[] }>(`/cycles/${cycle.id}/cards`);
          const finalized = cardsData.cards.filter((c) => c.employee_id === user?.id && c.status === 'FINAL');
          allFinal.push(...finalized.map((c) => ({ ...c, cycle })));
        } catch { /* skip */ }
      }
      setCards(allFinal.sort((a, b) => b.cycle.year - a.cycle.year));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">نتائجي السابقة</h1>
        <p className="text-gray-500 text-sm">My Past Results</p>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
          لا توجد نتائج مكتملة بعد.
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{card.cycle.name}</h3>
                  <p className="text-sm text-gray-500">السنة: {card.cycle.year}</p>
                </div>
                {card.result && (
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">{Number(card.result.total_score).toFixed(2)}</div>
                    <div className="text-xs text-gray-500 text-center">من 5.0</div>
                    <div className="text-sm font-medium text-gray-700 mt-1 text-center">{card.result.rating_label}</div>
                  </div>
                )}
              </div>
              {card.result?.hr_notes && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">ملاحظات الموارد البشرية: </span>{card.result.hr_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyResultsPage() {
  return (
    <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
      <AppShell>
        <MyResultsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
