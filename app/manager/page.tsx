'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, CalendarClock, FolderKanban, UsersRound } from 'lucide-react';

interface Stats {
  teamMembers: number;
  projects: number;
  pendingLeaves: number;
  companyName: string;
}

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({
    teamMembers: 0,
    projects: 0,
    pendingLeaves: 0,
    companyName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userCompanyId = (session?.user as any)?.company_id;
        
        if (!userCompanyId) return;

        const [employeesRes, projectsRes, leavesRes] = await Promise.all([
          fetch(`/api/employees?company_id=${userCompanyId}`),
          fetch(`/api/projects?company_id=${userCompanyId}`),
          fetch('/api/leave-requests?status=pending'),
        ]);

        if (employeesRes.ok) {
          const employees = await employeesRes.json();
          setStats((prev) => ({
            ...prev,
            teamMembers: employees.length,
          }));
        }

        if (projectsRes.ok) {
          const projects = await projectsRes.json();
          setStats((prev) => ({
            ...prev,
            projects: projects.length,
          }));
        }

        if (leavesRes.ok) {
          const leaves = await leavesRes.json();
          setStats((prev) => ({
            ...prev,
            pendingLeaves: leaves.length,
          }));
        }
      } catch (error) {
        console.error('[v0] Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchStats();
    }
  }, [session]);

  const dashboardCards = [
    {
      title: 'Team Members',
      value: stats.teamMembers,
      icon: UsersRound,
      href: '/manager/team',
      tone: 'from-cyan-500/20 to-blue-500/10 text-cyan-100',
    },
    {
      title: 'Active Projects',
      value: stats.projects,
      icon: FolderKanban,
      href: '/manager/projects',
      tone: 'from-emerald-500/20 to-green-500/10 text-emerald-100',
    },
    {
      title: 'Pending Leave Requests',
      value: stats.pendingLeaves,
      icon: CalendarClock,
      href: '/manager/leave-approvals',
      tone: 'from-amber-500/20 to-orange-500/10 text-amber-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Manager Dashboard</h1>
        <p className="mt-2 text-slate-600">Overview of your team and projects</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {dashboardCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="group h-full cursor-pointer overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-900">{loading ? '-' : card.value}</p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br p-3 ${card.tone}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-slate-500 transition-colors group-hover:text-slate-700">
                  View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}
