'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { CalendarCheck2, ClipboardList, LayoutDashboard, Menu, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  if (userRole !== 'employee') {
    router.push('/login');
    return null;
  }

  const navItems = [
    { href: '/employee', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/employee/attendance', label: 'Attendance', icon: CalendarCheck2 },
    { href: '/employee/leave-requests', label: 'Leave Requests', icon: ClipboardList },
    { href: '/employee/profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        navItems={navItems}
        userEmail={session?.user?.email}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-slate-50 to-slate-100/70">
        <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 px-4 py-3 backdrop-blur md:hidden">
          <Button variant="outline" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
