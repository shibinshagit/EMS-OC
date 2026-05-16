'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { Building2, CheckCheck, FolderKanban, LayoutDashboard, ShieldUser, UserRound, Users } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const userRole = (session?.user as any)?.role;
  if (userRole !== 'super_admin') {
    router.push('/login');
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/companies', label: 'Companies', icon: Building2 },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/managers', label: 'Managers', icon: ShieldUser },
    { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
    { href: '/admin/leave-approvals', label: 'Leave Approvals', icon: CheckCheck },
    { href: '/admin/profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        navItems={navItems}
        userEmail={session?.user?.email}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-slate-50 to-slate-100/70">
        <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
