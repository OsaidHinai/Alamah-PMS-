'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl">نظام إدارة الأداء</span>
          <span className="text-gray-400 text-sm">(PMS)</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'HR_ADMIN' && (
            <>
              <Link href="/admin/cycles" className="text-gray-600 hover:text-primary text-sm">
                دورات التقييم
              </Link>
              <Link href="/admin/users" className="text-gray-600 hover:text-primary text-sm">
                المستخدمون
              </Link>
            </>
          )}
          {user?.role === 'MANAGER' && (
            <Link href="/manager/team" className="text-gray-600 hover:text-primary text-sm">
              فريقي
            </Link>
          )}
          {user?.role === 'EMPLOYEE' && (
            <>
              <Link href="/my-card" className="text-gray-600 hover:text-primary text-sm">
                بطاقتي
              </Link>
              <Link href="/my-results" className="text-gray-600 hover:text-primary text-sm">
                نتائجي
              </Link>
            </>
          )}
          <div className="flex items-center gap-2 border-r pr-4">
            <span className="text-sm text-gray-700">{user?.name_ar}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
