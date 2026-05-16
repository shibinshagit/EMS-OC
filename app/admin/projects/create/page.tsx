'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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

export default function CreateProjectPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    company_id: '',
    manager_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, managersRes, employeesRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/managers'),
          fetch('/api/employees'),
        ]);

        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(data);
        }

        if (managersRes.ok) {
          const data = await managersRes.json();
          setManagers(data);
        }

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('[v0] Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  useEffect(() => {
    setFormData((prev) => ({ ...prev, manager_id: '' }));
    setSelectedEmployeeIds([]);
  }, [formData.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: parseInt(formData.company_id),
          manager_id: parseInt(formData.manager_id),
          end_date: isOngoing ? null : formData.end_date || null,
          employee_ids: selectedEmployeeIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      router.push('/admin/projects');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/admin/projects" className="text-blue-600 hover:underline mb-4 block">
        ← Back to Projects
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add New Project</CardTitle>
          <CardDescription>Create a new project in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Project Name *
              </label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Mobile App Development"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Project description..."
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company_id" className="text-sm font-medium text-gray-700">
                Company *
              </label>
              <select
                id="company_id"
                name="company_id"
                value={formData.company_id}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="manager_id" className="text-sm font-medium text-gray-700">
                Project Manager *
              </label>
              <select
                id="manager_id"
                name="manager_id"
                value={formData.manager_id}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a manager</option>
                {filteredManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assign Employees</label>
              <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {selectedCompanyId
                      ? 'No active employees available for this company'
                      : 'Select a company to view employees'}
                  </p>
                ) : (
                  filteredEmployees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        disabled={loading}
                        className="h-4 w-4"
                      />
                      <span>
                        {employee.full_name} ({employee.employee_code})
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500">
                Selected: {selectedEmployeeIds.length}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="start_date" className="text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="end_date" className="text-sm font-medium text-gray-700">
                  End Date
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                  <input
                    type="checkbox"
                    checked={isOngoing}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsOngoing(checked);
                      if (checked) {
                        setFormData((prev) => ({ ...prev, end_date: '' }));
                      }
                    }}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  Ongoing project (no fixed end date)
                </label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  disabled={loading || isOngoing}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Link href="/admin/projects">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
