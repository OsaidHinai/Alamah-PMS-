import { CardStatus, CycleStatus } from '@alamah/shared';

const cardStatusMap: Record<CardStatus, { label: string; color: string }> = {
  PENDING: { label: 'قيد الإعداد', color: 'bg-gray-100 text-gray-700' },
  EMPLOYEE_SUBMITTED: { label: 'تم تقديم التقييم الذاتي', color: 'bg-blue-100 text-blue-700' },
  MANAGER_SUBMITTED: { label: 'تم تقييم المدير', color: 'bg-yellow-100 text-yellow-700' },
  FINAL: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
};

const cycleStatusMap: Record<CycleStatus, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'مغلق', color: 'bg-red-100 text-red-700' },
};

export function CardStatusBadge({ status }: { status: CardStatus }) {
  const { label, color } = cardStatusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
}

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const { label, color } = cycleStatusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
}
