'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, Role } from '@alamah/shared';

const roles: { value: Role; label: string }[] = [
  { value: 'CEO', label: 'الرئيس التنفيذي (CEO)' },
  { value: 'HR_ADMIN', label: 'مسؤول الموارد البشرية (HR Admin)' },
  { value: 'MANAGER', label: 'مدير (Manager)' },
  { value: 'EMPLOYEE', label: 'موظف (Employee)' },
];

export default function NewUserPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<User[]>([]);
  const [form, setForm] = useState({ name_ar: '', name_en: '', email: '', role: 'EMPLOYEE' as Role, manager_id: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    api.get<{ users: User[] }>('/users')
      .then((d) => setManagers(d.users.filter((u) => u.role === 'MANAGER' && u.is_active)))
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ user: User; temporaryPassword: string }>('/users', { ...form, manager_id: form.manager_id || null });
      setTempPassword(data.temporaryPassword);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إضافة مستخدم جديد</h1>
        <p className="text-gray-500 text-sm">Create New User</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => set('name_ar', e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية *</label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => set('name_en', e.target.value)}
              required
              dir="ltr"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (Email) *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
            dir="ltr"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الدور (Role) *</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المدير المباشر (Manager)</label>
          <select
            value={form.manager_id}
            onChange={(e) => set('manager_id', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">بدون مدير مباشر</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name_ar} ({m.name_en})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">القسم (Department) *</label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {tempPassword && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-green-800 mb-1">✓ تم إنشاء المستخدم بنجاح — User Created</p>
            <p className="text-green-700">كلمة المرور المؤقتة / Temporary Password:</p>
            <p className="font-mono text-lg font-bold text-green-900 mt-1 select-all" dir="ltr">{tempPassword}</p>
            <p className="text-xs text-green-600 mt-2">سيُطلب من المستخدم تغيير كلمة المرور عند أول تسجيل دخول. / User will be required to change it on first login.</p>
            <button onClick={() => router.push('/admin/users')} className="mt-3 bg-green-700 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-green-800">
              العودة إلى المستخدمين ←
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'إضافة المستخدم'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
