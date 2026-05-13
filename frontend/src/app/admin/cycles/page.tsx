'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PerformanceCycle } from '@alamah/shared';
import { CycleStatusBadge } from '@/components/StatusBadge';

interface CycleWithCount extends PerformanceCycle {
  _count?: { cards: number };
}

export default function CyclesPage() {
  const [cycles, setCycles] = useState<CycleWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear() });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function fetchCycles() {
    try {
      const data = await api.get<{ cycles: CycleWithCount[] }>('/cycles');
      setCycles(data.cycles);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCycles(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/cycles', form);
      setShowCreate(false);
      setForm({ name: '', year: new Date().getFullYear() });
      fetchCycles();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(id: string) {
    try {
      await api.put(`/cycles/${id}/activate`);
      fetchCycles();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  async function handleClose(id: string) {
    if (!confirm('هل تريد إغلاق هذه الدورة؟')) return;
    try {
      await api.put(`/cycles/${id}/close`);
      fetchCycles();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">دورات التقييم</h1>
          <p className="text-gray-500 text-sm">Performance Cycles</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + إنشاء دورة جديدة
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">إنشاء دورة تقييم جديدة</h2>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الدورة *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="مثال: تقييم الأداء 2025"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">السنة *</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value) }))}
                required
                min={2020}
                max={2100}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>
            <button type="submit" disabled={creating} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {creating ? 'جاري الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">
              إلغاء
            </button>
          </form>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      )}

      <div className="space-y-3">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
                <CycleStatusBadge status={cycle.status} />
              </div>
              <div className="text-sm text-gray-500 mt-1">
                السنة: {cycle.year} | البطاقات: {cycle._count?.cards || 0}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/cycles/${cycle.id}`}
                className="text-sm text-primary hover:underline px-3 py-1.5"
              >
                عرض البطاقات
              </Link>
              {cycle.status === 'DRAFT' && (
                <button
                  onClick={() => handleActivate(cycle.id)}
                  className="text-sm bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg"
                >
                  تفعيل
                </button>
              )}
              {cycle.status === 'ACTIVE' && (
                <button
                  onClick={() => handleClose(cycle.id)}
                  className="text-sm bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>
        ))}
        {cycles.length === 0 && (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
            لا توجد دورات تقييم بعد. أنشئ دورة جديدة للبدء.
          </div>
        )}
      </div>
    </div>
  );
}
