'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { CheckCheck, FolderKanban, LayoutDashboard, UserRound, UsersRound } from 'lucide-react';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>('');

  useEffect(() => {
    const loadCompany = async () => {
      const sessionCompanyName = (session?.user as any)?.company_name;
      const sessionCompanyId = Number((session?.user as any)?.company_id);
      const userRole = (session?.user as any)?.role;

      if (userRole !== 'manager') {
        return;
      }

      if (sessionCompanyName) {
        setResolvedCompanyName(sessionCompanyName);
        return;
      }
      if (!sessionCompanyId) {
        setResolvedCompanyName('');
        return;
      }

      try {
        const res = await fetch(`/api/companies?id=${sessionCompanyId}`);
        if (!res.ok) return;
        const companies = await res.json();
        if (Array.isArray(companies) && companies.length > 0) {
          setResolvedCompanyName(companies[0].name || '');
        }
      } catch (error) {
        console.error('[v0] Failed to fetch manager company name:', error);
      }
    };

    if (session?.user) {
      loadCompany();
    }
  }, [session]);

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
  if (userRole !== 'manager') {
    router.push('/login');
    return null;
  }

  const navItems = [
    { href: '/manager', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/manager/team', label: 'My Team', icon: UsersRound },
    { href: '/manager/projects', label: 'Projects', icon: FolderKanban },
    { href: '/manager/leave-approvals', label: 'Leave Approvals', icon: CheckCheck },
    { href: '/manager/profile', label: 'Profile', icon: UserRound },
  ];

  const teamName = resolvedCompanyName || 'Your Company';

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
          <div className="mb-6 flex justify-end">
            <div className="inline-flex items-center rounded-full border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-2 shadow-lg ring-1 ring-cyan-400/20">
              <span className="mr-2 text-xs font-medium uppercase tracking-wide text-cyan-200/90">Team</span>
              <span className="text-sm font-semibold text-slate-100">{teamName}</span>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
