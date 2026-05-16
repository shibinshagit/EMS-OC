'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarClock, FolderKanban, ShieldUser, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    companies: 0,
    employees: 0,
    managers: 0,
    projects: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesRes, employeesRes, managersRes, projectsRes, leavesRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/employees'),
          fetch('/api/managers'),
          fetch('/api/projects'),
          fetch('/api/leave-requests?status=pending'),
        ]);

        const companies = await companiesRes.json();
        const employees = await employeesRes.json();
        const managers = await managersRes.json();
        const projects = await projectsRes.json();
        const leaves = await leavesRes.json();

        setStats({
          companies: companies.length || 0,
          employees: employees.length || 0,
          managers: managers.length || 0,
          projects: projects.length || 0,
          pendingLeaves: leaves.length || 0,
        });
      } catch (error) {
        console.error('[v0] Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const dashboardCards = [
    {
      title: 'Companies',
      value: stats.companies,
      icon: Building2,
      href: '/admin/companies',
      tone: 'from-cyan-500/20 to-blue-500/10 text-cyan-100',
    },
    {
      title: 'Employees',
      value: stats.employees,
      icon: Users,
      href: '/admin/employees',
      tone: 'from-emerald-500/20 to-green-500/10 text-emerald-100',
    },
    {
      title: 'Managers',
      value: stats.managers,
      icon: ShieldUser,
      href: '/admin/managers',
      tone: 'from-violet-500/20 to-purple-500/10 text-violet-100',
    },
    {
      title: 'Projects',
      value: stats.projects,
      icon: FolderKanban,
      href: '/admin/projects',
      tone: 'from-amber-500/20 to-orange-500/10 text-amber-100',
    },
    {
      title: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: CalendarClock,
      href: '/admin/leave-approvals',
      tone: 'from-rose-500/20 to-red-500/10 text-rose-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Admin Dashboard</h1>
        <p className="mt-2 text-slate-600">Welcome to OpenCoders Employee Management Portal</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
