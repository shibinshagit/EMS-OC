'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: number;
  name: string;
  description: string;
  company_name: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function ManagerProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const companyId = (session?.user as any)?.company_id;
        
        if (!companyId) return;

        const res = await fetch(`/api/projects?company_id=${companyId}`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        
        const data = await res.json();
        setProjects(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Projects</h1>
        <p className="mt-1 text-slate-600">View projects in your company</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
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
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{project.description || '-'}</TableCell>
                      <TableCell>{project.manager_name || '-'}</TableCell>
                      <TableCell>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={project.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}
                        >
                          {project.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/manager/projects/${project.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
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
