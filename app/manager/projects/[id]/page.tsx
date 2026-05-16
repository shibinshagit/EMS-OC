'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Project {
  id: number;
  name: string;
  description: string | null;
  company_name: string;
  manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  assigned_employee_ids: number[];
}

interface Employee {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  position: string | null;
}

export default function ManagerProjectDetailsPage() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isFinite(projectId)) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const companyId = Number((session?.user as any)?.company_id);
        if (!companyId) return;

        const [projectsRes, employeesRes] = await Promise.all([
          fetch(`/api/projects?company_id=${companyId}`),
          fetch(`/api/employees?company_id=${companyId}`),
        ]);

        if (!projectsRes.ok) throw new Error('Failed to fetch project details');
        const projects = (await projectsRes.json()) as Project[];
        const selectedProject = projects.find((p) => p.id === projectId) || null;
        if (!selectedProject) {
          throw new Error('Project not found');
        }
        setProject(selectedProject);

        if (employeesRes.ok) {
          setEmployees(await employeesRes.json());
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [projectId, session]);

  const assignedEmployees = useMemo(() => {
    if (!project) return [];
    const assignedSet = new Set(project.assigned_employee_ids || []);
    return employees.filter((employee) => assignedSet.has(employee.id));
  }, [employees, project]);

  return (
    <div className="space-y-6">
      <Link href="/manager/projects" className="text-blue-600 hover:underline block">
        ← Back to Projects
      </Link>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>{project?.name || 'Project Details'}</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading project details...'
              : `${project?.company_name || '-'} • Managed by ${project?.manager_name || '-'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Description</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{project?.description || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <div className="mt-1">
              <Badge
                variant="secondary"
                className={project?.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}
              >
                {project?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">Start Date</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {project?.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">End Date</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Assigned Employees</CardTitle>
          <CardDescription>Total: {assignedEmployees.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : assignedEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No employees assigned yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.employee_code}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
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

