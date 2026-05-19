'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
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
    if (user.role === 'CEO') router.replace('/ceo/dashboard');
    else if (user.role === 'HR_ADMIN') router.replace('/admin/cycles');
    else if (user.role === 'MANAGER') router.replace('/manager/team');
    else router.replace('/my-card');
  }, [user, loading, router]);

  return null;
}
