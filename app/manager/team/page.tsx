'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  employee_code: string;
  position: string;
  company_name: string;
  is_active: boolean;
}

export default function ManagerTeamPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const companyId = (session?.user as any)?.company_id;
        
        if (!companyId) return;

        const res = await fetch(`/api/employees?company_id=${companyId}`);
        if (!res.ok) throw new Error('Failed to fetch team members');
        
        const data = await res.json();
        setEmployees(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchTeam();
    }
  }, [session]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Team</h1>
        <p className="mt-1 text-slate-600">Manage and monitor your team members</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Total: {employees.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No team members yet</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {employees.map((employee) => (
                <Card key={employee.id} className="border-slate-200 bg-slate-50/30 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{employee.full_name}</h3>
                        <p className="text-sm text-slate-600">{employee.email}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={employee.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}
                      >
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700">
                      <p>
                        <span className="font-medium text-slate-900">Employee Code:</span> {employee.employee_code}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Position:</span> {employee.position || '-'}
                      </p>
                    </div>

                    <div className="pt-1">
                      <Link href={`/manager/team/${employee.id}`}>
                        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                          See Activity
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
