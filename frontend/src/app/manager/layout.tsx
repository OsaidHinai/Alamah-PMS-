import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['MANAGER', 'HR_ADMIN']}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
