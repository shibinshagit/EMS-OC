'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { PasswordConfirmDialog } from '@/components/password-confirm-dialog';

interface Employee {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  employee_code: string;
  position: string;
  joining_date: string;
  company_id: number;
  company_name: string;
  is_active: boolean;
}

interface Company {
  id: number;
  name: string;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    position: '',
    joining_date: '',
    company_id: '',
    status: 'active',
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/companies');
        if (res.ok) {
          setCompanies(await res.json());
        }
      } catch (err) {
        console.error('[v0] Failed to fetch companies for employee edit:', err);
      }
    };
    fetchCompanies();
  }, []);

  const confirmDelete = async (password: string) => {
    if (!deleteTarget) return;
    setError('');
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/employees?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete employee');
      }
      await fetchEmployees();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (employee: Employee) => {
    setEditEmployee(employee);
    setFormData({
      full_name: employee.full_name || '',
      email: employee.email || '',
      password: '',
      position: employee.position || '',
      joining_date: toDateInputValue(employee.joining_date),
      company_id: String(employee.company_id || ''),
      status: employee.is_active ? 'active' : 'inactive',
    });
  };

  const submitEdit = async () => {
    if (!editEmployee) return;
    if (!formData.full_name.trim()) {
      setError('Employee name is required.');
      return;
    }

    setError('');
    setEditingId(editEmployee.id);
    try {
      const res = await fetch(`/api/employees?id=${editEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || null,
          position: formData.position.trim() || null,
          joining_date: formData.joining_date.trim() || null,
          company_id: formData.company_id ? parseInt(formData.company_id) : null,
          is_active: formData.status === 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update employee');
      }
      await fetchEmployees();
      setEditEmployee(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Employee full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Position</label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="Position"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password (optional)</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Leave empty to keep current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={formData.company_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_id: e.target.value }))}
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Joining Date</label>
              <Input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, joining_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditEmployee(null)}
              disabled={editingId === editEmployee?.id}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editingId === editEmployee?.id}>
              {editingId === editEmployee?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Employee Deletion"
        description={
          deleteTarget
            ? `Delete employee "${deleteTarget.full_name}"? This action cannot be undone.`
            : 'Delete this employee?'
        }
        loading={deletingId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="mt-1 text-slate-600">Manage all employees across all companies</p>
        </div>
        <Link href="/admin/employees/create">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>Total: {employees.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium">
                        <Link href={`/admin/employees/${employee.id}`} className="text-cyan-700 hover:text-cyan-800 hover:underline">
                          {employee.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.employee_code}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>{employee.company_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={employee.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}
                        >
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={editingId === employee.id || deletingId === employee.id}
                            onClick={() => handleEdit(employee)}
                          >
                            {editingId === employee.id ? 'Saving...' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === employee.id || editingId === employee.id}
                            onClick={() => setDeleteTarget(employee)}
                          >
                            {deletingId === employee.id ? 'Deleting...' : 'Delete'}
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
