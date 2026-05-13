'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPassword.length < 8) {
      setError('يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { new_password: newPassword, confirm_password: confirmPassword });
      await refreshUser();
      if (user?.role === 'HR_ADMIN') router.replace('/admin/cycles');
      else if (user?.role === 'MANAGER') router.replace('/manager/team');
      else router.replace('/my-card');
    } catch (err: unknown) {
      setError((err as Error).message || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">تغيير كلمة المرور</h1>
          <p className="text-gray-500 text-sm mt-1">Change Password</p>
          <p className="text-sm text-amber-600 mt-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
            يجب تغيير كلمة المرور المؤقتة قبل المتابعة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور الجديدة (New Password)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تأكيد كلمة المرور (Confirm Password)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
