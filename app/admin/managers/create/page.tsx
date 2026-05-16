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

export default function CreateManagerPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_id: '',
    department: '',
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error('[v0] Failed to fetch companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          department: formData.department.trim() || null,
          role: 'manager',
          company_id: parseInt(formData.company_id),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create manager');
      }

      router.push('/admin/managers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/admin/managers" className="text-blue-600 hover:underline mb-4 block">
        ← Back to Managers
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add New Manager</CardTitle>
          <CardDescription>Create a new manager account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Jane Smith"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
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
              <label htmlFor="department" className="text-sm font-medium text-gray-700">
                Department
              </label>
              <Input
                id="department"
                name="department"
                placeholder="e.g., Engineering, HR"
                value={formData.department}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Manager'}
              </Button>
              <Link href="/admin/managers">
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
