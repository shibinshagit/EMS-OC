'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CalendarCheck2, Clock3, Hourglass, PlaneTakeoff } from 'lucide-react';

interface Stats {
  workedDays: number;
  halfDays: number;
  approvedLeaves: number;
  pendingLeaves: number;
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({
    workedDays: 0,
    halfDays: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userId = (session?.user as any)?.id;
        
        // Get employee ID from user
        const empRes = await fetch(`/api/employees?user_id=${userId}`);
        if (!empRes.ok) return;
        
        const employees = await empRes.json();
        if (employees.length === 0) return;
        
        const employeeId = employees[0].id;

        // Get current month attendance
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();

        const [attendanceRes, leavesRes] = await Promise.all([
          fetch(`/api/attendance?employee_id=${employeeId}&month=${month}&year=${year}`),
          fetch(`/api/leave-requests?employee_id=${employeeId}`),
        ]);

        if (attendanceRes.ok) {
          const attendance = await attendanceRes.json();
          const workedDays = attendance.filter((a: any) => a.duration_minutes && a.duration_minutes >= 480).length;
          const halfDays = attendance.filter((a: any) => a.duration_minutes && a.duration_minutes < 480).length;
          
          setStats((prev) => ({
            ...prev,
            workedDays,
            halfDays,
          }));
        }

        if (leavesRes.ok) {
          const leaves = await leavesRes.json();
          const approved = leaves.filter((l: any) => l.status === 'approved').length;
          const pending = leaves.filter((l: any) => l.status === 'pending').length;
          
          setStats((prev) => ({
            ...prev,
            approvedLeaves: approved,
            pendingLeaves: pending,
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
      title: 'Worked Days (This Month)',
      value: stats.workedDays,
      icon: CalendarCheck2,
      tone: 'from-emerald-500/20 to-green-500/10 text-emerald-100',
    },
    {
      title: 'Half Days',
      value: stats.halfDays,
      icon: Clock3,
      tone: 'from-sky-500/20 to-blue-500/10 text-sky-100',
    },
    {
      title: 'Approved Leaves',
      value: stats.approvedLeaves,
      icon: PlaneTakeoff,
      tone: 'from-violet-500/20 to-indigo-500/10 text-violet-100',
    },
    {
      title: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: Hourglass,
      tone: 'from-amber-500/20 to-orange-500/10 text-amber-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Welcome Back!</h1>
        <p className="mt-2 text-slate-600">Here&apos;s your attendance and leave overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card, idx) => (
          <Card key={idx} className="overflow-hidden border-slate-200 bg-white shadow-sm">
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
              <div className="mt-4 flex items-center text-xs font-medium text-slate-500">
                Up-to-date this month <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access your work-related features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link href="/employee/attendance" className="w-full">
              <Button className="w-full justify-start bg-cyan-600 hover:bg-cyan-700">
                View Attendance
              </Button>
            </Link>
            <Link href="/employee/leave-requests" className="w-full">
              <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700">
                Request Leave
              </Button>
            </Link>
            <Link href="/employee/attendance?view=calendar" className="w-full">
              <Button className="w-full justify-start bg-violet-600 hover:bg-violet-700">
                View Calendar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
