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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [phases, setPhases] = useState({ phase1_start: '', phase1_end: '', phase2_start: '', phase2_end: '' });
  const [savingPhases, setSavingPhases] = useState(false);
  const [phaseSaveMsg, setPhaseSaveMsg] = useState('');

  async function fetchData() {
    try {
      const [cyclesData, cardsData] = await Promise.all([
        api.get<{ cycles: CycleWithCount[] }>('/cycles'),
        api.get<{ cards: CardWithEmployee[] }>(`/cycles/${id}/cards`),
      ]);
      const found = cyclesData.cycles.find((c) => c.id === id) || null;
      setCycle(found);
      if (found) {
        setPhases({
          phase1_start: found.phase1_start ? found.phase1_start.slice(0, 10) : '',
          phase1_end:   found.phase1_end   ? found.phase1_end.slice(0, 10)   : '',
          phase2_start: found.phase2_start ? found.phase2_start.slice(0, 10) : '',
          phase2_end:   found.phase2_end   ? found.phase2_end.slice(0, 10)   : '',
        });
      }
      setCards(cardsData.cards);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [id]);

  async function handleSavePhases(e: React.FormEvent) {
    e.preventDefault();
    setSavingPhases(true);
    setPhaseSaveMsg('');
    try {
      await api.put(`/cycles/${id}/phases`, phases);
      setPhaseSaveMsg('تم حفظ التواريخ بنجاح');
      fetchData();
    } catch (err: unknown) {
      setPhaseSaveMsg((err as Error).message);
    } finally {
      setSavingPhases(false);
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
          <p className="text-gray-500 text-sm">
            السنة: {cycle?.year} | المشاركون: {cards.length}
          </p>
        </div>
        <Link href="/admin/cycles" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
          ← العودة
        </Link>
      </div>

      {cycle?.status === 'DRAFT' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
          عند تفعيل فترة التقييم، سيتم إنشاء بطاقات تلقائياً لجميع الموظفين والمديرين وموظفي الموارد البشرية النشطين.
        </div>
      )}

      {/* Phase Dates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">تواريخ المراحل</h2>
        <form onSubmit={handleSavePhases}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">بداية المرحلة الأولى (Phase 1 Start)</label>
              <input
                type="date"
                value={phases.phase1_start}
                onChange={(e) => setPhases((p) => ({ ...p, phase1_start: e.target.value }))}
                className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">نهاية المرحلة الأولى (Phase 1 End)</label>
              <input
                type="date"
                value={phases.phase1_end}
                onChange={(e) => setPhases((p) => ({ ...p, phase1_end: e.target.value }))}
                className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">بداية المرحلة الثانية (Phase 2 Start)</label>
              <input
                type="date"
                value={phases.phase2_start}
                onChange={(e) => setPhases((p) => ({ ...p, phase2_start: e.target.value }))}
                className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">نهاية المرحلة الثانية (Phase 2 End)</label>
              <input
                type="date"
                value={phases.phase2_end}
                onChange={(e) => setPhases((p) => ({ ...p, phase2_end: e.target.value }))}
                className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {phaseSaveMsg && (
            <p className={`text-sm mb-3 ${phaseSaveMsg.includes('نجاح') ? 'text-green-600' : 'text-red-600'}`}>{phaseSaveMsg}</p>
          )}
          <button
            type="submit"
            disabled={savingPhases}
            className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {savingPhases ? 'جاري الحفظ...' : 'حفظ التواريخ'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">بطاقات الأداء ({cards.length})</h2>
          {cycle?.status === 'DRAFT' && (
            <span className="text-xs text-gray-400">ستظهر البطاقات بعد تفعيل فترة التقييم</span>
          )}
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الموظف</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الدور</th>
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
                <td className="px-4 py-3 text-sm text-gray-600">
                  {card.employee?.role === 'MANAGER' ? 'مدير' : card.employee?.role === 'HR_ADMIN' ? 'موارد بشرية' : 'موظف'}
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
          <div className="text-center py-12 text-gray-500">
            {cycle?.status === 'DRAFT' ? 'فعّل فترة التقييم لإنشاء البطاقات تلقائياً.' : 'لا توجد بطاقات في هذه الفترة.'}
          </div>
        )}
      </div>
    </div>
  );
}
