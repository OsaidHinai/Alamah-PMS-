'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Goal, Competency, CompetencyTemplate } from '@alamah/shared';

interface GoalSetupFormProps {
  cardId: string;
  goals: Goal[];
  competencies: Competency[];
  onSaved: () => void;
}

export default function GoalSetupForm({ cardId, goals, competencies, onSaved }: GoalSetupFormProps) {
  const [localGoals, setLocalGoals] = useState(goals.map((g) => ({ ...g })));
  const [localComps, setLocalComps] = useState(competencies.map((c) => ({ ...c })));
  const [templates, setTemplates] = useState<CompetencyTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ templates: CompetencyTemplate[] }>('/competency-templates')
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
  }, []);

  function updateGoal(id: string, field: string, value: string | number) {
    setLocalGoals((prev) => prev.map((g) => g.id === id ? { ...g, [field]: value } : g));
  }

  function updateComp(id: string, field: string, value: string) {
    setLocalComps((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  function applyTemplate(compId: string, template: CompetencyTemplate) {
    setLocalComps((prev) => prev.map((c) => c.id === compId
      ? { ...c, title_ar: template.title_ar, title_en: template.title_en, description: template.description }
      : c
    ));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      for (const g of localGoals) {
        await api.put(`/cards/${cardId}/goals/${g.id}`, {
          title_ar: g.title_ar,
          title_en: g.title_en,
          description: g.description,
        });
      }
      for (const c of localComps) {
        await api.put(`/cards/${cardId}/competencies/${c.id}`, {
          title_ar: c.title_ar,
          title_en: c.title_en,
          description: c.description,
        });
      }
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">إعداد الأهداف (Goal Setup)</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {localGoals.map((goal, idx) => (
            <div key={goal.id} className="p-5 space-y-3">
              <div className="text-sm font-medium text-gray-600">الهدف {idx + 1}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">العنوان بالعربية *</label>
                  <input type="text" value={goal.title_ar} onChange={(e) => updateGoal(goal.id, 'title_ar', e.target.value)} className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title in English</label>
                  <input type="text" value={goal.title_en} onChange={(e) => updateGoal(goal.id, 'title_en', e.target.value)} dir="ltr" className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">الوصف</label>
                <textarea value={goal.description} onChange={(e) => updateGoal(goal.id, 'description', e.target.value)} rows={2} className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">إعداد الكفاءات (Competency Setup)</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {localComps.map((comp, idx) => (
            <div key={comp.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600">الكفاءة {idx + 1}</div>
                {templates.length > 0 && (
                  <select
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value);
                      if (t) applyTemplate(comp.id, t);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">تطبيق قالب...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.title_ar}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">العنوان بالعربية *</label>
                  <input type="text" value={comp.title_ar} onChange={(e) => updateComp(comp.id, 'title_ar', e.target.value)} className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title in English</label>
                  <input type="text" value={comp.title_en} onChange={(e) => updateComp(comp.id, 'title_en', e.target.value)} dir="ltr" className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">الوصف</label>
                <textarea value={comp.description} onChange={(e) => updateComp(comp.id, 'description', e.target.value)} rows={2} className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary-600 text-white py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
      >
        {saving ? 'جاري الحفظ...' : 'حفظ الأهداف والكفاءات'}
      </button>
    </div>
  );
}
