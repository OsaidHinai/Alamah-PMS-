'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface CheckInFormProps {
  cardId: string;
  onAdded: () => void;
}

export default function CheckInForm({ cardId, onAdded }: CheckInFormProps) {
  const [show, setShow] = useState(false);
  const [quarter, setQuarter] = useState<'Q1' | 'Q3'>('Q1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/cards/${cardId}/checkins`, { quarter, notes });
      setNotes('');
      setShow(false);
      onAdded();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary py-3 rounded-xl text-sm font-medium transition-colors"
      >
        + إضافة جلسة متابعة (Check-in)
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">إضافة جلسة متابعة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الربع السنوي *</label>
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value as 'Q1' | 'Q3')}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Q1">الربع الأول (Q1)</option>
            <option value="Q3">الربع الثالث (Q3)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات *</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="ملاحظات الجلسة..."
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={() => setShow(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
