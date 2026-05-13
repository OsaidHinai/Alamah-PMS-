'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@alamah/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.force_password_change) {
      router.replace('/change-password');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role as Role))) {
    return null;
  }

  if (user.force_password_change) return null;

  return <>{children}</>;
}
