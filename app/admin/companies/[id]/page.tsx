'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Company {
  id: number;
  name: string;
  location: string | null;
  country: string | null;
  created_at: string;
}

interface Employee {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  position: string | null;
}

interface Manager {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
}

interface Project {
  id: number;
  name: string;
  manager_name: string | null;
  is_active: boolean;
}

export default function CompanyDetailsPage() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isFinite(companyId)) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [companiesRes, employeesRes, managersRes, projectsRes] = await Promise.all([
          fetch('/api/companies'),
          fetch(`/api/employees?company_id=${companyId}`),
          fetch(`/api/managers?company_id=${companyId}`),
          fetch(`/api/projects?company_id=${companyId}`),
        ]);

        if (!companiesRes.ok) throw new Error('Failed to fetch company details');
        const companies = await companiesRes.json();
        const matchedCompany = (companies as Company[]).find((c) => c.id === companyId) || null;
        if (!matchedCompany) throw new Error('Company not found');
        setCompany(matchedCompany);

        if (employeesRes.ok) setEmployees(await employeesRes.json());
        if (managersRes.ok) setManagers(await managersRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
      } catch (err: any) {
        setError(err.message || 'Failed to load company');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <Link href="/admin/companies" className="text-blue-600 hover:underline block">
        ← Back to Companies
      </Link>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{company?.name || 'Company Details'}</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading company details...'
              : `${company?.location || '-'}, ${company?.country || '-'} • Created ${company?.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}`}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Employees</CardDescription>
            <CardTitle>{loading ? '-' : employees.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Managers</CardDescription>
            <CardTitle>{loading ? '-' : managers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Projects</CardDescription>
            <CardTitle>{loading ? '-' : projects.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-sm text-gray-600">No employees in this company.</div>
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
                  {employees.map((employee) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Managers</CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <div className="text-sm text-gray-600">No managers in this company.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.full_name}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.department || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-sm text-gray-600">No projects in this company.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.manager_name || '-'}</TableCell>
                      <TableCell>{project.is_active ? 'Active' : 'Inactive'}</TableCell>
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

