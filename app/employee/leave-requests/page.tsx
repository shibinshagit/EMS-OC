'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LeaveRequest {
  id: number;
  leave_date: string;
  leave_type: 'full_day' | 'half_day';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function LeaveRequestsPage() {
  const { data: session } = useSession();
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_date: '',
    leave_type: 'full_day',
    reason: '',
  });
  const todayDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setLoading(true);
      try {
        const userId = Number((session?.user as any)?.id);
        const res = await fetch('/api/employees');
        if (!res.ok) throw new Error('Failed to fetch employee data');
        
        const employees = await res.json();
        const emp = Array.isArray(employees)
          ? employees.find((e: any) => Number(e.user_id) === userId)
          : null;
        
        if (emp) {
          setEmployeeId(emp.id);
        } else {
          setError('Employee profile not found');
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchEmployeeData();
    }
  }, [session]);

  useEffect(() => {
    if (!employeeId) return;

    const fetchLeaves = async () => {
      try {
        const res = await fetch(`/api/leave-requests?employee_id=${employeeId}`);
        if (!res.ok) throw new Error('Failed to fetch leave requests');
        
        const data = await res.json();
        setLeaves(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [employeeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    if (formData.leave_date < todayDate) {
      setError('Previous dates are not allowed');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employee_id: employeeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit leave request');
      }

      // Refresh the list
      const listRes = await fetch(`/api/leave-requests?employee_id=${employeeId}`);
      if (listRes.ok) {
        const data = await listRes.json();
        setLeaves(data);
      }

      setFormData({ leave_date: '', leave_type: 'full_day', reason: '' });
      setShowForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Leave Requests</h1>
        <p className="text-gray-600">Manage your leave requests</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
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

      {/* New Request Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request New Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="leave_date" className="text-sm font-medium text-gray-700">
                  Leave Date *
                </label>
                <Input
                  id="leave_date"
                  name="leave_date"
                  type="date"
                  value={formData.leave_date}
                  onChange={handleChange}
                  min={todayDate}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="leave_type" className="text-sm font-medium text-gray-700">
                  Leave Type *
                </label>
                <select
                  id="leave_type"
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium text-gray-700">
                  Reason
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  placeholder="Why do you need this leave? (optional)"
                  value={formData.reason}
                  onChange={handleChange}
                  disabled={submitting}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="mb-8">
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Request New Leave
          </Button>
        </div>
      )}

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>All your leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No leave requests yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {new Date(leave.leave_date).toLocaleDateString()}
                      </TableCell>
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
                        {new Date(leave.created_at).toLocaleDateString()}
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
