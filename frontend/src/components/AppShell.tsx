'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'CEO':
      return [
        { label: 'لوحة التحكم', href: '/ceo/dashboard', icon: '◈' },
      ];
    case 'HR_ADMIN':
      return [
        { label: 'الدورات', href: '/admin/cycles', icon: '↻' },
        { label: 'الموظفون', href: '/admin/users', icon: '⊞' },
        { label: 'بطاقتي', href: '/my-card', icon: '☰' },
      ];
    case 'MANAGER':
      return [
        { label: 'فريقي', href: '/manager/team', icon: '⊞' },
        { label: 'بطاقتي', href: '/my-card', icon: '☰' },
      ];
    case 'EMPLOYEE':
    default:
      return [
        { label: 'بطاقتي', href: '/my-card', icon: '☰' },
        { label: 'نتائجي', href: '/my-results', icon: '★' },
      ];
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'CEO': return 'الرئيس التنفيذي';
    case 'HR_ADMIN': return 'الموارد البشرية';
    case 'MANAGER': return 'مدير';
    case 'EMPLOYEE': return 'موظف';
    default: return role;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? getNavItems(user.role) : [];

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const sidebar = (
    <aside
      className="w-64 min-h-screen bg-white border-l border-gray-200 flex flex-col flex-shrink-0"
      dir="rtl"
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 bg-primary rounded-full" />
          <div>
            <div className="font-bold text-gray-900 text-base leading-tight">نظام الأداء</div>
            <div className="text-xs text-gray-400">Alamah PMS</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-50 text-primary border-r-2 border-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg leading-none w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name_ar?.[0] || 'م'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate">{user?.name_ar}</div>
            <div className="text-xs text-gray-400">{user ? getRoleLabel(user.role) : ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span className="text-base">⎋</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row-reverse" dir="rtl">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full z-50">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-primary">نظام الأداء</span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 text-xl"
            aria-label="فتح القائمة"
          >
            ☰
          </button>
        </div>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
