'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CardStatusBadge } from '@/components/StatusBadge';
import { CardStatus, CycleStatus } from '@alamah/shared';

interface CycleOverview {
  id: string;
  name: string;
  year: number;
  status: CycleStatus;
}

interface EmployeeOverview {
  id: string;
  name_ar: string;
  name_en: string;
  role: string;
  department: string;
}

interface GoalOverview {
  id: string;
}

interface ResultOverview {
  total_score: number;
  rating_label: string;
}

interface CardOverview {
  id: string;
  status: CardStatus;
  employee: EmployeeOverview;
  cycle: { id: string; name: string; year: number; status: CycleStatus };
  goals: GoalOverview[];
  result?: ResultOverview | null;
}

interface DashboardData {
  cycles: CycleOverview[];
  cards: CardOverview[];
  users: EmployeeOverview[];
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'CEO': return 'الرئيس التنفيذي';
    case 'HR_ADMIN': return 'موارد بشرية';
    case 'MANAGER': return 'مدير';
    case 'EMPLOYEE': return 'موظف';
    default: return role;
  }
}

export default function CeoDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    api.get<DashboardData>('/ceo/overview')
      .then(setData)
      .catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!data) return null;

  const { cycles, cards, users } = data;

  const activeCycles = cycles.filter((c) => c.status === 'ACTIVE').length;
  const pendingApprovals = cards.filter(
    (c) =>
      (c.status === 'GOALS_SUBMITTED' || c.status === 'REVIEW_SUBMITTED') &&
      (c.employee.role === 'MANAGER' || c.employee.role === 'HR_ADMIN'),
  ).length;

  const filteredCards = cards.filter((c) => {
    const cycleMatch = selectedCycleId === 'all' || c.cycle.id === selectedCycleId;
    const statusMatch = selectedStatus === 'all' || c.status === selectedStatus;
    return cycleMatch && statusMatch;
  });

  const allStatuses: CardStatus[] = [
    'PENDING',
    'GOALS_SUBMITTED',
    'GOALS_APPROVED',
    'REVIEW_SUBMITTED',
    'MANAGER_REVIEWED',
    'FINAL',
  ];

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الرئيس التنفيذي</h1>
        <p className="text-gray-500 text-sm">CEO Dashboard — عرض شامل لأداء المنظمة</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-primary">{users.length}</div>
          <div className="text-sm text-gray-500 mt-1">إجمالي الموظفين النشطين</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{activeCycles}</div>
          <div className="text-sm text-gray-500 mt-1">دورات تقييم نشطة</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-orange-500">{pendingApprovals}</div>
          <div className="text-sm text-gray-500 mt-1">موافقات معلقة للمديرين/HR</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">جميع الدورات</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">جميع الحالات</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Cards table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الموظف</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الدور</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">القسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الدورة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الأهداف</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">الدرجة النهائية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    لا توجد بطاقات تطابق الفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{card.employee.name_ar}</div>
                      <div className="text-xs text-gray-400">{card.employee.name_en}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getRoleLabel(card.employee.role)}</td>
                    <td className="px-4 py-3 text-gray-600">{card.employee.department}</td>
                    <td className="px-4 py-3 text-gray-600">{card.cycle.name} ({card.cycle.year})</td>
                    <td className="px-4 py-3">
                      <CardStatusBadge status={card.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{card.goals.length}</td>
                    <td className="px-4 py-3">
                      {card.result ? (
                        <span className="font-semibold text-primary">
                          {Number(card.result.total_score).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
