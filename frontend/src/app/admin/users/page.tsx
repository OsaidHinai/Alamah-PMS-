'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { User } from '@alamah/shared';

const roleLabels: Record<string, string> = {
  HR_ADMIN: 'مسؤول الموارد البشرية',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchUsers() {
    try {
      const data = await api.get<{ users: User[] }>('/users');
      setUsers(data.users);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleDeactivate(id: string) {
    if (!confirm('هل أنت متأكد من إلغاء تفعيل هذا المستخدم؟')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: false } : u));
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-gray-500 text-sm">Users</p>
        </div>
        <Link
          href="/admin/users/new"
          className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + إضافة مستخدم جديد
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{user.name_ar}</div>
                  <div className="text-xs text-gray-500">{user.name_en}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600" dir="ltr">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{roleLabels[user.role] || user.role}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.department}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/users/${user.id}/edit`} className="text-xs text-primary hover:underline">
                      تعديل
                    </Link>
                    {user.is_active && (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        إلغاء التفعيل
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">لا يوجد مستخدمون</div>
        )}
      </div>
    </div>
  );
}
