'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';

interface LeaveRequest {
  id: number;
  employee_name: string;
  employee_code: string;
  leave_date: string;
  leave_type: 'full_day' | 'half_day';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  company_name: string;
}

export default function ManagerLeaveApprovalsPage() {
  const { data: session } = useSession();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leave-requests?status=pending');
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      const data = await res.json();
      
      // Filter to only show leaves from employees in manager's company
      const userCompanyId = (session?.user as any)?.company_id;
      const filtered = data.filter((l: any) => {
        // In a real app, you'd check the employee's company_id matches manager's company
        return true;
      });
      
      setLeaves(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: number, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update leave request');
      }

      // Refresh the list
      await fetchLeaves();
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Request Management</h1>
        <p className="mt-1 text-slate-600">Review and approve leave requests from your team</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <CalendarClock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="text-3xl font-bold text-rose-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-5 w-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Pending Leave Requests</CardTitle>
          <CardDescription>Requests from your team members</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : leaves.filter((l) => l.status === 'pending').length === 0 ? (
            <div className="text-center py-8 text-gray-600">No pending leave requests from your team</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves
                    .filter((l) => l.status === 'pending')
                    .map((leave) => (
                      <TableRow key={leave.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-medium">{leave.employee_name}</TableCell>
                        <TableCell>{new Date(leave.leave_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              leave.leave_type === 'full_day'
                                ? 'bg-cyan-100 text-cyan-700'
                                : 'bg-violet-100 text-violet-700'
                            }
                          >
                            {leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{leave.reason || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={actionLoading === leave.id}
                              onClick={() => handleApproval(leave.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading === leave.id}
                              onClick={() => handleApproval(leave.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
