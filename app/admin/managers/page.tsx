'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordConfirmDialog } from '@/components/password-confirm-dialog';

interface Manager {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  company_id: number;
  company_name: string;
  is_active: boolean;
}

interface Company {
  id: number;
  name: string;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editManager, setEditManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    department: '',
    company_id: '',
    status: 'active',
  });

  const fetchManagers = async () => {
    try {
      const res = await fetch('/api/managers');
      if (!res.ok) throw new Error('Failed to fetch managers');
      const data = await res.json();
      setManagers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/companies');
        if (res.ok) {
          setCompanies(await res.json());
        }
      } catch (err) {
        console.error('[v0] Failed to fetch companies for manager edit:', err);
      }
    };
    fetchCompanies();
  }, []);

  const confirmDelete = async (password: string) => {
    if (!deleteTarget) return;
    setError('');
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/managers?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete manager');
      }
      await fetchManagers();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (manager: Manager) => {
    setEditManager(manager);
    setFormData({
      full_name: manager.full_name || '',
      email: manager.email || '',
      password: '',
      department: manager.department || '',
      company_id: String(manager.company_id || ''),
      status: manager.is_active ? 'active' : 'inactive',
    });
  };

  const submitEdit = async () => {
    if (!editManager) return;
    if (!formData.full_name.trim()) {
      setError('Manager name is required.');
      return;
    }

    setError('');
    setEditingId(editManager.id);
    try {
      const res = await fetch(`/api/managers?id=${editManager.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || null,
          department: formData.department.trim() || null,
          company_id: formData.company_id ? parseInt(formData.company_id) : null,
          is_active: formData.status === 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update manager');
      }
      await fetchManagers();
      setEditManager(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div>
      <Dialog open={!!editManager} onOpenChange={(open) => !open && setEditManager(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Manager full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Department"
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditManager(null)}
              disabled={editingId === editManager?.id}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editingId === editManager?.id}>
              {editingId === editManager?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Manager Deletion"
        description={
          deleteTarget
            ? `Delete manager "${deleteTarget.full_name}"? This action cannot be undone.`
            : 'Delete this manager?'
        }
        loading={deletingId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Managers</h1>
          <p className="text-gray-600 mt-1">Manage all managers across all companies</p>
        </div>
        <Link href="/admin/managers/create">
          <Button className="bg-purple-600 hover:bg-purple-700">+ Add Manager</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Managers</CardTitle>
          <CardDescription>Total: {managers.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No managers found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.full_name}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.department || '-'}</TableCell>
                      <TableCell>{manager.company_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          manager.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {manager.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={editingId === manager.id || deletingId === manager.id}
                            onClick={() => handleEdit(manager)}
                          >
                            {editingId === manager.id ? 'Saving...' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === manager.id || editingId === manager.id}
                            onClick={() => setDeleteTarget(manager)}
                          >
                            {deletingId === manager.id ? 'Deleting...' : 'Delete'}
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
