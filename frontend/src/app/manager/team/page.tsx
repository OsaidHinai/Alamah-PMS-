'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PerformanceCard, PerformanceCycle, User } from '@alamah/shared';
import { CardStatusBadge } from '@/components/StatusBadge';

interface CardWithEmployee extends PerformanceCard {
  employee: User;
}

interface CycleWithCount extends PerformanceCycle {
  _count?: { cards: number };
}

export default function TeamPage() {
  const [cycles, setCycles] = useState<CycleWithCount[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [cards, setCards] = useState<CardWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ cycles: CycleWithCount[] }>('/cycles')
      .then((data) => {
        setCycles(data.cycles);
        const active = data.cycles.find((c) => c.status === 'ACTIVE');
        if (active) setSelectedCycleId(active.id);
        else if (data.cycles.length > 0) setSelectedCycleId(data.cycles[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;
    api.get<{ cards: CardWithEmployee[] }>(`/cycles/${selectedCycleId}/cards`)
      .then((data) => setCards(data.cards))
      .catch(() => setCards([]));
  }, [selectedCycleId]);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">فريقي</h1>
          <p className="text-gray-500 text-sm">My Team</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/my-card"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <span>☰</span>
            <span>بطاقتي الشخصية</span>
          </Link>
          {cycles.length > 0 && (
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.id} href={`/manager/cards/${card.id}`}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{card.employee.name_ar}</div>
                  <div className="text-xs text-gray-500">{card.employee.name_en}</div>
                </div>
                <CardStatusBadge status={card.status} />
              </div>
              <div className="text-sm text-gray-500">{card.employee.department}</div>
            </div>
          </Link>
        ))}
        {cards.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
            لا توجد بطاقات لفريقك في هذه الدورة.
          </div>
        )}
      </div>
    </div>
  );
}
