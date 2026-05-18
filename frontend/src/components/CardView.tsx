'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Goal, NextCycleGoal, AppraisalResult, CardStatus } from '@alamah/shared';
import { CardStatusBadge } from './StatusBadge';

interface CardFull {
  id: string;
  status: CardStatus;
  goals_manager_comment: string | null;
  employee: { name_ar: string; name_en: string; department: string };
  goals: Goal[];
  next_cycle_goals: NextCycleGoal[];
  result?: AppraisalResult | null;
}

interface CardViewProps {
  card: CardFull;
  viewerRole: 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  onRefresh: () => void;
}

function RatingPicker({ value, onChange, disabled }: { value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(n)}
          className={`w-8 h-8 rounded-full text-sm font-bold border transition-colors
            ${value === n ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-300 hover:border-primary'}
            ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function CardView({ card, viewerRole, onRefresh }: CardViewProps) {
  const [goals, setGoals] = useState<Goal[]>(card.goals);
  const [nextGoals, setNextGoals] = useState<NextCycleGoal[]>(card.next_cycle_goals ?? []);
  const [newGoal, setNewGoal] = useState({ title_ar: '', title_en: '', description: '' });
  const [newNextGoal, setNewNextGoal] = useState({ title_ar: '', title_en: '', description: '' });
  const [hrNotes, setHrNotes] = useState('');
  const [requestChangesComment, setRequestChangesComment] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const s = card.status;
  const isEmployee = viewerRole === 'EMPLOYEE';
  const isManager = viewerRole === 'MANAGER';
  const isAdmin = viewerRole === 'HR_ADMIN';

  async function action(path: string, body?: unknown) {
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/cards/${card.id}/${path}`, body);
      onRefresh();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  }

  async function saveGoalRating(goalId: string, field: 'employee_rating' | 'manager_rating', value: number) {
    const updated = goals.map((g) => g.id === goalId ? { ...g, [field]: value } : g);
    setGoals(updated);
    try { await api.put(`/cards/${card.id}/goals/${goalId}`, { [field]: value }); }
    catch (e: unknown) { setError((e as Error).message); }
  }

  async function addGoal() {
    if (!newGoal.title_ar || !newGoal.title_en) return;
    try {
      await api.post(`/cards/${card.id}/goals`, newGoal);
      setNewGoal({ title_ar: '', title_en: '', description: '' });
      onRefresh();
    } catch (e: unknown) { setError((e as Error).message); }
  }

  async function deleteGoal(goalId: string) {
    if (!confirm('حذف هذا الهدف؟')) return;
    try { await api.delete(`/cards/${card.id}/goals/${goalId}`); onRefresh(); }
    catch (e: unknown) { setError((e as Error).message); }
  }

  async function saveNextGoals() {
    if (nextGoals.length < 1) { setError('أضف هدفاً واحداً على الأقل للدورة القادمة'); return; }
    try {
      await api.post(`/cards/${card.id}/next-goals`, {
        goals: nextGoals.map((g) => ({ title_ar: g.title_ar, title_en: g.title_en, description: g.description })),
      });
    } catch (e: unknown) { setError((e as Error).message); }
  }

  // ─── PHASE 1: Employee view ──────────────────────────────────────────────────
  if (isEmployee && s === 'PENDING') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">المرحلة الأولى: تحديد الأهداف</h2>
            <CardStatusBadge status={s} />
          </div>
          {card.goals_manager_comment && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <span className="font-semibold">ملاحظة المدير: </span>{card.goals_manager_comment}
            </div>
          )}
          <p className="text-sm text-gray-500 mb-5">أدخل أهدافك للدورة الحالية (1–5 أهداف)</p>

          {goals.map((g) => (
            <div key={g.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-2">
              <div className="flex-1">
                <div className="font-medium text-gray-800">{g.title_ar}</div>
                <div className="text-xs text-gray-500">{g.title_en}</div>
                {g.description && <div className="text-xs text-gray-400 mt-0.5">{g.description}</div>}
              </div>
              <button onClick={() => deleteGoal(g.id)} className="text-red-400 hover:text-red-600 text-xs">حذف</button>
            </div>
          ))}

          {goals.length < 5 && (
            <div className="border border-dashed border-gray-300 rounded-lg p-4 mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={newGoal.title_ar} onChange={(e) => setNewGoal((p) => ({ ...p, title_ar: e.target.value }))}
                  placeholder="اسم الهدف بالعربية *" className="rounded border border-gray-300 px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
                <input value={newGoal.title_en} onChange={(e) => setNewGoal((p) => ({ ...p, title_en: e.target.value }))}
                  placeholder="Goal name in English *" dir="ltr" className="rounded border border-gray-300 px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <input value={newGoal.description} onChange={(e) => setNewGoal((p) => ({ ...p, description: e.target.value }))}
                placeholder="وصف (اختياري)" className="rounded border border-gray-300 px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={addGoal} className="text-sm text-primary font-medium hover:underline">+ إضافة هدف</button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <button
            disabled={goals.length < 1 || submitting}
            onClick={() => action('submit-goals')}
            className="mt-5 w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال الأهداف للاعتماد'}
          </button>
        </div>
      </div>
    );
  }

  // ─── PHASE 1: Employee waiting ───────────────────────────────────────────────
  if (isEmployee && s === 'GOALS_SUBMITTED') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">أهدافك المُرسلة</h2>
          <CardStatusBadge status={s} />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
          تم إرسال أهدافك إلى مديرك للاعتماد. سيتم إعلامك عند الاعتماد.
        </div>
        {goals.map((g) => (
          <div key={g.id} className="p-3 bg-gray-50 rounded-lg mb-2">
            <div className="font-medium">{g.title_ar}</div>
            <div className="text-xs text-gray-500">{g.title_en}</div>
          </div>
        ))}
      </div>
    );
  }

  // ─── PHASE 2: Employee self-assessment ───────────────────────────────────────
  if (isEmployee && s === 'GOALS_APPROVED') {
    const allRated = goals.every((g) => g.employee_rating !== null);
    return (
      <div className="space-y-6">
        {/* Self-assessment */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">المرحلة الثانية: التقييم الذاتي</h2>
            <CardStatusBadge status={s} />
          </div>
          <p className="text-sm text-gray-500 mb-5">قيّم أداءك على كل هدف من 1 إلى 5</p>
          {goals.map((g) => (
            <div key={g.id} className="p-4 bg-gray-50 rounded-lg mb-3">
              <div className="font-medium text-gray-800 mb-1">{g.title_ar}</div>
              <div className="text-xs text-gray-500 mb-3">{g.title_en}</div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">تقييمك:</span>
                <RatingPicker value={g.employee_rating} onChange={(v) => saveGoalRating(g.id, 'employee_rating', v)} />
              </div>
              <textarea
                placeholder="تعليق (اختياري)"
                defaultValue={g.employee_comment ?? ''}
                onBlur={(e) => api.put(`/cards/${card.id}/goals/${g.id}`, { employee_comment: e.target.value }).catch(() => {})}
                className="mt-2 w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* Next cycle goals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-2">أهداف الدورة القادمة</h2>
          <p className="text-sm text-gray-500 mb-4">أدخل أهدافك للدورة القادمة</p>
          {nextGoals.map((g, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-2">
              <div className="flex-1">
                <div className="font-medium text-gray-800">{g.title_ar}</div>
                <div className="text-xs text-gray-500">{g.title_en}</div>
              </div>
              <button onClick={() => setNextGoals((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs">حذف</button>
            </div>
          ))}
          <div className="border border-dashed border-gray-300 rounded-lg p-4 mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={newNextGoal.title_ar} onChange={(e) => setNewNextGoal((p) => ({ ...p, title_ar: e.target.value }))}
                placeholder="اسم الهدف بالعربية *" className="rounded border border-gray-300 px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
              <input value={newNextGoal.title_en} onChange={(e) => setNewNextGoal((p) => ({ ...p, title_en: e.target.value }))}
                placeholder="Goal in English *" dir="ltr" className="rounded border border-gray-300 px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button
              onClick={() => {
                if (!newNextGoal.title_ar || !newNextGoal.title_en) return;
                setNextGoals((p) => [...p, { ...newNextGoal, id: '', card_id: card.id, order: p.length + 1, created_at: '' }]);
                setNewNextGoal({ title_ar: '', title_en: '', description: '' });
              }}
              className="text-sm text-primary font-medium hover:underline"
            >+ إضافة هدف للدورة القادمة</button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={!allRated || nextGoals.length < 1 || submitting}
          onClick={async () => { await saveNextGoals(); action('submit-review'); }}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال التقييم الذاتي وأهداف الدورة القادمة'}
        </button>
      </div>
    );
  }

  // ─── Employee waiting / final ────────────────────────────────────────────────
  if (isEmployee && (s === 'REVIEW_SUBMITTED' || s === 'MANAGER_REVIEWED')) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">بطاقة الأداء</h2>
          <CardStatusBadge status={s} />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          {s === 'REVIEW_SUBMITTED' ? 'تم إرسال تقييمك. جاري مراجعة المدير.' : 'جاري المراجعة النهائية من الموارد البشرية.'}
        </div>
        <div className="mt-4 space-y-2">
          {goals.map((g) => (
            <div key={g.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">{g.title_ar}</span>
              {g.employee_rating && <span className="text-sm text-gray-500">تقييمك: {g.employee_rating}/5</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── PHASE 1: Manager review ──────────────────────────────────────────────────
  if (isManager && s === 'GOALS_SUBMITTED') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">مراجعة الأهداف — {card.employee.name_ar}</h2>
          <CardStatusBadge status={s} />
        </div>
        <p className="text-sm text-gray-500 mb-4">راجع أهداف الموظف واعتمدها أو اطلب التعديل.</p>
        {goals.map((g) => (
          <div key={g.id} className="p-3 bg-gray-50 rounded-lg mb-2">
            <div className="font-medium">{g.title_ar}</div>
            <div className="text-xs text-gray-500">{g.title_en}</div>
            {g.description && <div className="text-xs text-gray-400 mt-0.5">{g.description}</div>}
          </div>
        ))}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button disabled={submitting} onClick={() => action('approve-goals')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50">
            ✓ اعتماد الأهداف
          </button>
          <button onClick={() => setShowRequestForm((p) => !p)}
            className="flex-1 border border-amber-400 text-amber-700 hover:bg-amber-50 py-2.5 rounded-lg font-medium text-sm">
            طلب تعديل
          </button>
        </div>

        {showRequestForm && (
          <div className="mt-4">
            <textarea
              value={requestChangesComment}
              onChange={(e) => setRequestChangesComment(e.target.value)}
              placeholder="اكتب ملاحظاتك للموظف..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
            <button
              disabled={submitting}
              onClick={() => action('request-goal-changes', { comment: requestChangesComment })}
              className="mt-2 w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              إرسال طلب التعديل
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── PHASE 2: Manager scoring ──────────────────────────────────────────────────
  if (isManager && s === 'REVIEW_SUBMITTED') {
    const allManagerRated = goals.every((g) => g.manager_rating !== null);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">تقييم المدير — {card.employee.name_ar}</h2>
          <CardStatusBadge status={s} />
        </div>
        <p className="text-sm text-gray-500 mb-5">أضف تقييمك لكل هدف (1–5)</p>
        {goals.map((g) => (
          <div key={g.id} className="p-4 bg-gray-50 rounded-lg mb-3">
            <div className="font-medium mb-1">{g.title_ar}</div>
            <div className="text-xs text-gray-500 mb-3">{g.title_en}</div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">الموظف:</span>
                <span className="font-semibold text-primary">{g.employee_rating ?? '—'}/5</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">تقييمك:</span>
                <RatingPicker value={g.manager_rating} onChange={(v) => saveGoalRating(g.id, 'manager_rating', v)} />
              </div>
            </div>
          </div>
        ))}

        {card.next_cycle_goals?.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">أهداف الموظف للدورة القادمة</h3>
            {card.next_cycle_goals.map((g) => (
              <div key={g.id} className="text-sm text-gray-600 py-1 border-b border-gray-100 last:border-0">{g.title_ar} / {g.title_en}</div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          disabled={!allManagerRated || submitting}
          onClick={() => action('approve-review')}
          className="mt-5 w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال التقييم للموارد البشرية'}
        </button>
      </div>
    );
  }

  // ─── HR Admin: finalize ────────────────────────────────────────────────────────
  if (isAdmin && s === 'MANAGER_REVIEWED') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">إنهاء التقييم — {card.employee.name_ar}</h2>
          <CardStatusBadge status={s} />
        </div>
        {goals.map((g) => (
          <div key={g.id} className="p-3 bg-gray-50 rounded-lg mb-2">
            <div className="font-medium">{g.title_ar}</div>
            <div className="flex gap-4 mt-1 text-sm">
              <span className="text-gray-500">الموظف: <strong>{g.employee_rating ?? '—'}/5</strong></span>
              <span className="text-gray-500">المدير: <strong className="text-primary">{g.manager_rating ?? '—'}/5</strong></span>
            </div>
          </div>
        ))}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الموارد البشرية (اختياري)</label>
          <textarea value={hrNotes} onChange={(e) => setHrNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={3} />
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          disabled={submitting}
          onClick={() => action('finalize', { hr_notes: hrNotes })}
          className="mt-5 w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {submitting ? 'جاري الإنهاء...' : 'إنهاء وإصدار النتيجة'}
        </button>
      </div>
    );
  }

  // ─── Final results (all roles) ────────────────────────────────────────────────
  if (s === 'FINAL' && card.result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">نتائج الأداء</h2>
          <CardStatusBadge status={s} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-primary">{Number(card.result.total_score).toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">الدرجة الكلية / 5</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center flex items-center justify-center">
            <div className="text-lg font-bold text-gray-800">{card.result.rating_label}</div>
          </div>
        </div>
        {goals.map((g) => (
          <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
            <span className="text-sm font-medium">{g.title_ar}</span>
            <div className="flex gap-3 text-sm">
              <span className="text-gray-400">ذاتي: {g.employee_rating ?? '—'}</span>
              <span className="text-primary font-semibold">مدير: {g.manager_rating ?? '—'}</span>
            </div>
          </div>
        ))}
        {card.result.hr_notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <span className="font-semibold">ملاحظات الموارد البشرية: </span>{card.result.hr_notes}
          </div>
        )}
        {card.next_cycle_goals?.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">أهداف الدورة القادمة</h3>
            {card.next_cycle_goals.map((g) => (
              <div key={g.id} className="text-sm text-gray-600 py-1">{g.title_ar} / {g.title_en}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Default read-only view ────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{card.employee.name_ar}</h2>
        <CardStatusBadge status={s} />
      </div>
      {goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map((g) => (
            <div key={g.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm">{g.title_ar}</div>
              <div className="text-xs text-gray-500">{g.title_en}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">لا توجد أهداف بعد.</p>
      )}
    </div>
  );
}
