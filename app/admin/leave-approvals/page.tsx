'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export default function LeaveApprovalsPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leave-requests');
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      const data = await res.json();
      setLeaves(data);
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

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Delete this leave record permanently?');
    if (!confirmed) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/leave-requests?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete leave record');
      }
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leave Request Management</h1>
        <p className="text-gray-600 mt-1">Review and approve/reject leave requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
          <CardDescription>Approve, reject, or delete leave records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No leave requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Leave Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.employee_name}</TableCell>
                      <TableCell>{leave.company_name}</TableCell>
                      <TableCell>{new Date(leave.leave_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          leave.leave_type === 'full_day'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          leave.status === 'pending'
                            ? 'bg-orange-100 text-orange-800'
                            : leave.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {leave.status === 'pending' && (
                            <>
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
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === leave.id}
                            onClick={() => handleDelete(leave.id)}
                          >
                            Delete
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
