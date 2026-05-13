'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Goal, Competency, CheckIn, AppraisalResult, CardStatus } from '@alamah/shared';
import RatingSelect from './RatingSelect';
import { CardStatusBadge } from './StatusBadge';

interface CardFull {
  id: string;
  status: CardStatus;
  employee: { name_ar: string; name_en: string; department: string };
  goals: Goal[];
  competencies: Competency[];
  check_ins: (CheckIn & { submitter?: { name_ar: string; name_en: string } })[];
  result?: AppraisalResult | null;
}

interface CardViewProps {
  card: CardFull;
  viewerRole: 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  onRefresh: () => void;
}

export default function CardView({ card, viewerRole, onRefresh }: CardViewProps) {
  const [goals, setGoals] = useState<Goal[]>(card.goals);
  const [competencies, setCompetencies] = useState<Competency[]>(card.competencies);
  const [hrNotes, setHrNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEmployee = viewerRole === 'EMPLOYEE';
  const isManager = viewerRole === 'MANAGER';
  const isAdmin = viewerRole === 'HR_ADMIN';

  const canEmployeeEdit = isEmployee && card.status === 'PENDING';
  const canManagerEdit = isManager && card.status === 'EMPLOYEE_SUBMITTED';
  const canAdminEdit = isAdmin && card.status === 'MANAGER_SUBMITTED';
  const isFinal = card.status === 'FINAL';

  function updateGoalField(id: string, field: keyof Goal, value: number | string | null) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, [field]: value } : g));
  }

  function updateCompField(id: string, field: keyof Competency, value: number | string | null) {
    setCompetencies((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  async function saveGoal(goalId: string) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    let update: Record<string, unknown> = {};
    if (canEmployeeEdit) {
      update = { employee_rating: goal.employee_rating, employee_comment: goal.employee_comment };
    } else if (canManagerEdit) {
      update = { manager_rating: goal.manager_rating, manager_comment: goal.manager_comment };
    } else if (canAdminEdit) {
      update = { final_score: goal.final_score };
    }
    try {
      await api.put(`/cards/${card.id}/goals/${goalId}`, update);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  async function saveComp(compId: string) {
    const comp = competencies.find((c) => c.id === compId);
    if (!comp) return;
    let update: Record<string, unknown> = {};
    if (canEmployeeEdit) {
      update = { employee_rating: comp.employee_rating, employee_comment: comp.employee_comment };
    } else if (canManagerEdit) {
      update = { manager_rating: comp.manager_rating, manager_comment: comp.manager_comment };
    } else if (canAdminEdit) {
      update = { final_score: comp.final_score };
    }
    try {
      await api.put(`/cards/${card.id}/competencies/${compId}`, update);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  async function handleEmployeeSubmit() {
    setSubmitting(true);
    setError('');
    try {
      for (const g of goals) await saveGoal(g.id);
      for (const c of competencies) await saveComp(c.id);
      await api.post(`/cards/${card.id}/submit-employee`);
      onRefresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManagerSubmit() {
    setSubmitting(true);
    setError('');
    try {
      for (const g of goals) await saveGoal(g.id);
      for (const c of competencies) await saveComp(c.id);
      await api.post(`/cards/${card.id}/submit-manager`);
      onRefresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinalize() {
    setSubmitting(true);
    setError('');
    try {
      for (const g of goals) await saveGoal(g.id);
      for (const c of competencies) await saveComp(c.id);
      await api.post(`/cards/${card.id}/finalize`, {
        goals: goals.map((g) => ({ id: g.id, final_score: g.final_score })),
        competencies: competencies.map((c) => ({ id: c.id, final_score: c.final_score })),
        hr_notes: hrNotes,
      });
      onRefresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{card.employee.name_ar}</h2>
            <p className="text-gray-500 text-sm">{card.employee.name_en} — {card.employee.department}</p>
          </div>
          <CardStatusBadge status={card.status} />
        </div>
      </div>

      {/* Final Result Banner */}
      {isFinal && card.result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h3 className="font-bold text-green-800 text-lg mb-2">النتيجة النهائية</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-700">{Number(card.result.total_score).toFixed(2)}</div>
              <div className="text-sm text-green-600">من 5.0</div>
            </div>
            <div className="col-span-2">
              <div className="text-xl font-bold text-green-700">{card.result.rating_label}</div>
              {card.result.hr_notes && (
                <div className="text-sm text-green-600 mt-1">{card.result.hr_notes}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goals Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">الأهداف (Goals) — الوزن 60%</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {goals.map((goal, idx) => (
            <div key={goal.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-gray-400 ml-2">الهدف {idx + 1}</span>
                  <h4 className="font-medium text-gray-900">{goal.title_ar}</h4>
                  <p className="text-sm text-gray-500">{goal.title_en}</p>
                  {goal.description && <p className="text-xs text-gray-400 mt-1">{goal.description}</p>}
                </div>
                {isFinal && (
                  <div className="text-left">
                    <div className="text-lg font-bold text-primary">{goal.final_score != null ? Number(goal.final_score).toFixed(1) : '—'}</div>
                    <div className="text-xs text-gray-400">النتيجة النهائية</div>
                  </div>
                )}
              </div>

              <div className={`grid gap-4 ${(isAdmin && !isFinal) || isFinal ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {/* Employee rating */}
                {(isAdmin || isFinal || isEmployee) && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">التقييم الذاتي (Employee)</div>
                    <RatingSelect
                      value={goal.employee_rating}
                      onChange={(v) => { updateGoalField(goal.id, 'employee_rating', v); }}
                      disabled={!canEmployeeEdit}
                      label=""
                    />
                    {canEmployeeEdit && (
                      <textarea
                        value={goal.employee_comment || ''}
                        onChange={(e) => updateGoalField(goal.id, 'employee_comment', e.target.value)}
                        onBlur={() => saveGoal(goal.id)}
                        placeholder="تعليق (اختياري)"
                        rows={2}
                        className="mt-1 block w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    {!canEmployeeEdit && goal.employee_comment && (
                      <p className="mt-1 text-xs text-gray-500 italic">{goal.employee_comment}</p>
                    )}
                  </div>
                )}

                {/* Manager rating */}
                {(isAdmin || isFinal || isManager) && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">تقييم المدير (Manager)</div>
                    <RatingSelect
                      value={goal.manager_rating}
                      onChange={(v) => { updateGoalField(goal.id, 'manager_rating', v); }}
                      disabled={!canManagerEdit}
                      label=""
                    />
                    {canManagerEdit && (
                      <textarea
                        value={goal.manager_comment || ''}
                        onChange={(e) => updateGoalField(goal.id, 'manager_comment', e.target.value)}
                        onBlur={() => saveGoal(goal.id)}
                        placeholder="تعليق (اختياري)"
                        rows={2}
                        className="mt-1 block w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    {!canManagerEdit && goal.manager_comment && (
                      <p className="mt-1 text-xs text-gray-500 italic">{goal.manager_comment}</p>
                    )}
                  </div>
                )}

                {/* HR Final score override */}
                {canAdminEdit && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">النتيجة النهائية (Override)</div>
                    <RatingSelect
                      value={goal.final_score != null ? Number(goal.final_score) : null}
                      onChange={(v) => { updateGoalField(goal.id, 'final_score', v); }}
                      disabled={false}
                      label=""
                    />
                    <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لاستخدام المتوسط تلقائياً</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competencies Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">الكفاءات (Competencies) — الوزن 40%</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {competencies.map((comp, idx) => (
            <div key={comp.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-gray-400 ml-2">الكفاءة {idx + 1}</span>
                  <h4 className="font-medium text-gray-900">{comp.title_ar}</h4>
                  <p className="text-sm text-gray-500">{comp.title_en}</p>
                  {comp.description && <p className="text-xs text-gray-400 mt-1">{comp.description}</p>}
                </div>
                {isFinal && (
                  <div className="text-left">
                    <div className="text-lg font-bold text-primary">{comp.final_score != null ? Number(comp.final_score).toFixed(1) : '—'}</div>
                    <div className="text-xs text-gray-400">النتيجة النهائية</div>
                  </div>
                )}
              </div>

              <div className={`grid gap-4 ${(isAdmin && !isFinal) || isFinal ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {(isAdmin || isFinal || isEmployee) && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">التقييم الذاتي (Employee)</div>
                    <RatingSelect
                      value={comp.employee_rating}
                      onChange={(v) => { updateCompField(comp.id, 'employee_rating', v); }}
                      disabled={!canEmployeeEdit}
                      label=""
                    />
                    {canEmployeeEdit && (
                      <textarea
                        value={comp.employee_comment || ''}
                        onChange={(e) => updateCompField(comp.id, 'employee_comment', e.target.value)}
                        onBlur={() => saveComp(comp.id)}
                        placeholder="تعليق (اختياري)"
                        rows={2}
                        className="mt-1 block w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    {!canEmployeeEdit && comp.employee_comment && (
                      <p className="mt-1 text-xs text-gray-500 italic">{comp.employee_comment}</p>
                    )}
                  </div>
                )}

                {(isAdmin || isFinal || isManager) && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">تقييم المدير (Manager)</div>
                    <RatingSelect
                      value={comp.manager_rating}
                      onChange={(v) => { updateCompField(comp.id, 'manager_rating', v); }}
                      disabled={!canManagerEdit}
                      label=""
                    />
                    {canManagerEdit && (
                      <textarea
                        value={comp.manager_comment || ''}
                        onChange={(e) => updateCompField(comp.id, 'manager_comment', e.target.value)}
                        onBlur={() => saveComp(comp.id)}
                        placeholder="تعليق (اختياري)"
                        rows={2}
                        className="mt-1 block w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    {!canManagerEdit && comp.manager_comment && (
                      <p className="mt-1 text-xs text-gray-500 italic">{comp.manager_comment}</p>
                    )}
                  </div>
                )}

                {canAdminEdit && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">النتيجة النهائية (Override)</div>
                    <RatingSelect
                      value={comp.final_score != null ? Number(comp.final_score) : null}
                      onChange={(v) => { updateCompField(comp.id, 'final_score', v); }}
                      disabled={false}
                      label=""
                    />
                    <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لاستخدام المتوسط تلقائياً</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Check-ins Timeline */}
      {card.check_ins.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">جلسات المتابعة (Check-ins)</h3>
          <div className="space-y-3">
            {card.check_ins.map((ci) => (
              <div key={ci.id} className="flex gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{ci.quarter}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{ci.notes}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {ci.submitter?.name_ar} — {new Date(ci.submitted_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin HR Notes */}
      {canAdminEdit && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات الموارد البشرية (HR Notes)
          </label>
          <textarea
            value={hrNotes}
            onChange={(e) => setHrNotes(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="أضف ملاحظاتك..."
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Actions */}
      {canEmployeeEdit && (
        <button
          onClick={handleEmployeeSubmit}
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-600 text-white py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال التقييم الذاتي'}
        </button>
      )}

      {canManagerEdit && (
        <button
          onClick={handleManagerSubmit}
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-600 text-white py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال تقييم المدير'}
        </button>
      )}

      {canAdminEdit && (
        <button
          onClick={handleFinalize}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? 'جاري الاعتماد...' : 'اعتماد النتيجة النهائية'}
        </button>
      )}
    </div>
  );
}
