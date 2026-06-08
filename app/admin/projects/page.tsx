'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordConfirmDialog } from '@/components/password-confirm-dialog';

interface Project {
  id: number;
  name: string;
  description: string;
  company_id: number;
  company_name: string;
  manager_id: number;
  manager_name: string;
  start_date: string;
  end_date: string;
  assigned_employee_ids: number[];
  is_active: boolean;
}

interface Company {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  full_name: string;
  company_id: number;
}

interface Employee {
  id: number;
  full_name: string;
  employee_code: string;
  company_id: number;
  is_active: boolean;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [isOngoing, setIsOngoing] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    company_id: '',
    manager_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const fetchMeta = async () => {
      try {
        const [companiesRes, managersRes, employeesRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/managers'),
          fetch('/api/employees'),
        ]);

        if (companiesRes.ok) setCompanies(await companiesRes.json());
        if (managersRes.ok) setManagers(await managersRes.json());
        if (employeesRes.ok) setEmployees(await employeesRes.json());
      } catch (err) {
        console.error('[v0] Failed to fetch project metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  const confirmDelete = async (password: string) => {
    if (!deleteTarget) return;
    setError('');
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/projects?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete project');
      }
      await fetchProjects();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (project: Project) => {
    setEditProject(project);
    setIsOngoing(!project.end_date);
    setSelectedEmployeeIds(project.assigned_employee_ids || []);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      company_id: String(project.company_id || ''),
      manager_id: String(project.manager_id || ''),
      start_date: toDateInputValue(project.start_date),
      end_date: toDateInputValue(project.end_date),
      status: project.is_active ? 'active' : 'inactive',
    });
  };

  const handleEmployeeToggle = (employeeId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const selectedCompanyId = formData.company_id ? parseInt(formData.company_id) : null;
  const filteredManagers = selectedCompanyId
    ? managers.filter((manager) => manager.company_id === selectedCompanyId)
    : [];
  const filteredEmployees = selectedCompanyId
    ? employees.filter((employee) => employee.company_id === selectedCompanyId && employee.is_active)
    : [];

  const submitEdit = async () => {
    if (!editProject) return;
    if (!formData.name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!formData.company_id || !formData.manager_id) {
      setError('Company and manager are required.');
      return;
    }

    setError('');
    setEditingId(editProject.id);
    try {
      const res = await fetch(`/api/projects?id=${editProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          company_id: formData.company_id ? parseInt(formData.company_id) : null,
          manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
          start_date: formData.start_date.trim() || null,
          end_date: isOngoing ? null : formData.end_date.trim() || null,
          employee_ids: selectedEmployeeIds,
          is_active: formData.status === 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update project');
      }
      await fetchProjects();
      setEditProject(null);
      setSelectedEmployeeIds([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div>
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={formData.company_id}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, company_id: e.target.value, manager_id: '' }));
                  setSelectedEmployeeIds([]);
                }}
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
              <label className="text-sm font-medium">Project Manager</label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={formData.manager_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, manager_id: e.target.value }))}
              >
                <option value="">Select manager</option>
                {filteredManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Employees</label>
              <div className="max-h-44 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500">No active employees for selected company</p>
                ) : (
                  filteredEmployees.map((employee) => (
                    <label key={employee.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <span>
                        {employee.full_name} ({employee.employee_code})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End date</label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isOngoing}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsOngoing(checked);
                    if (checked) {
                      setFormData((prev) => ({ ...prev, end_date: '' }));
                    }
                  }}
                />
                Ongoing project (no fixed end date)
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                disabled={isOngoing}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProject(null)}
              disabled={editingId === editProject?.id}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editingId === editProject?.id}>
              {editingId === editProject?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PasswordConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Project Deletion"
        description={
          deleteTarget
            ? `Delete project "${deleteTarget.name}"? This action cannot be undone.`
            : 'Delete this project?'
        }
        loading={deletingId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage all projects across all companies</p>
        </div>
        <Link href="/admin/projects/create">
          <Button className="bg-orange-600 hover:bg-orange-700">+ Add Project</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>Total: {projects.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No projects found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.company_name}</TableCell>
                      <TableCell>{project.manager_name || '-'}</TableCell>
                      <TableCell>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          project.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={editingId === project.id || deletingId === project.id}
                            onClick={() => handleEdit(project)}
                          >
                            {editingId === project.id ? 'Saving...' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === project.id || editingId === project.id}
                            onClick={() => setDeleteTarget(project)}
                          >
                            {deletingId === project.id ? 'Deleting...' : 'Delete'}
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
