'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PerformanceCard, PerformanceCycle, User } from '@alamah/shared';
import { CardStatusBadge, CycleStatusBadge } from '@/components/StatusBadge';

interface CardWithEmployee extends PerformanceCard {
  employee: User;
}

interface CycleWithCount extends PerformanceCycle {
  _count?: { cards: number };
}

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cycle, setCycle] = useState<CycleWithCount | null>(null);
  const [cards, setCards] = useState<CardWithEmployee[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const [cyclesData, cardsData, usersData] = await Promise.all([
        api.get<{ cycles: CycleWithCount[] }>('/cycles'),
        api.get<{ cards: CardWithEmployee[] }>(`/cycles/${id}/cards`),
        api.get<{ users: User[] }>('/users'),
      ]);
      setCycle(cyclesData.cycles.find((c) => c.id === id) || null);
      setCards(cardsData.cards);
      const assigned = new Set(cardsData.cards.map((c) => c.employee_id));
      setEmployees(usersData.users.filter((u) => u.role === 'EMPLOYEE' && u.is_active && !assigned.has(u.id)));
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [id]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setAssigning(true);
    try {
      await api.post(`/cycles/${id}/cards`, { employee_ids: selectedIds });
      setShowAssign(false);
      setSelectedIds([]);
      fetchData();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{cycle?.name}</h1>
            {cycle && <CycleStatusBadge status={cycle.status} />}
          </div>
          <p className="text-gray-500 text-sm">السنة: {cycle?.year} | عدد البطاقات: {cards.length}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/cycles" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
            ← العودة
          </Link>
          {cycle?.status !== 'CLOSED' && (
            <button
              onClick={() => setShowAssign(true)}
              className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + تعيين موظفين
            </button>
          )}
        </div>
      </div>

      {showAssign && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">تعيين موظفين للدورة</h2>
          <form onSubmit={handleAssign}>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
              {employees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(emp.id)}
                    onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, emp.id] : prev.filter((x) => x !== emp.id))}
                  />
                  <span className="text-sm">{emp.name_ar}</span>
                </label>
              ))}
              {employees.length === 0 && <p className="text-sm text-gray-500 col-span-3">جميع الموظفين معينون بالفعل</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={assigning || selectedIds.length === 0} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {assigning ? 'جاري التعيين...' : `تعيين (${selectedIds.length})`}
              </button>
              <button type="button" onClick={() => setShowAssign(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الموظف</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">القسم</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">حالة البطاقة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cards.map((card) => (
              <tr key={card.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{card.employee?.name_ar}</div>
                  <div className="text-xs text-gray-500">{card.employee?.name_en}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{card.employee?.department}</td>
                <td className="px-4 py-3"><CardStatusBadge status={card.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/cards/${card.id}`} className="text-sm text-primary hover:underline">
                    فتح البطاقة
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cards.length === 0 && (
          <div className="text-center py-12 text-gray-500">لا توجد بطاقات في هذه الدورة بعد.</div>
        )}
      </div>
    </div>
  );
}
