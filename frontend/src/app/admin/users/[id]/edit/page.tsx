'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { User, Role } from '@alamah/shared';

const roles: { value: Role; label: string }[] = [
  { value: 'HR_ADMIN', label: 'مسؤول الموارد البشرية (HR Admin)' },
  { value: 'MANAGER', label: 'مدير (Manager)' },
  { value: 'EMPLOYEE', label: 'موظف (Employee)' },
];

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [managers, setManagers] = useState<User[]>([]);
  const [form, setForm] = useState({ name_ar: '', name_en: '', email: '', role: 'EMPLOYEE' as Role, manager_id: '', department: '', is_active: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ user: User }>(`/users/${id}`),
      api.get<{ users: User[] }>('/users'),
    ]).then(([userData, usersData]) => {
      const u = userData.user;
      setForm({ name_ar: u.name_ar, name_en: u.name_en, email: u.email, role: u.role as Role, manager_id: u.manager_id || '', department: u.department, is_active: u.is_active });
      setManagers(usersData.users.filter((x) => x.role === 'MANAGER' && x.is_active && x.id !== id));
    }).catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/users/${id}`, { ...form, manager_id: form.manager_id || null });
      router.push('/admin/users');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">تعديل المستخدم</h1>
        <p className="text-gray-500 text-sm">Edit User</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
            <input type="text" value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية *</label>
            <input type="text" value={form.name_en} onChange={(e) => set('name_en', e.target.value)} required dir="ltr" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required dir="ltr" className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الدور *</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المدير المباشر</label>
          <select value={form.manager_id} onChange={(e) => set('manager_id', e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">بدون مدير مباشر</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name_ar} ({m.name_en})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">القسم *</label>
          <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)} required className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
          <label htmlFor="is_active" className="text-sm text-gray-700">نشط (Active)</label>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
