import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';

export default function CeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['CEO']}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
