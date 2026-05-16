'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function CreateCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    country: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create company');
      }

      router.push('/admin/companies');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/admin/companies" className="text-blue-600 hover:underline mb-4 block">
        ← Back to Companies
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add New Company</CardTitle>
          <CardDescription>Create a new company in the system</CardDescription>
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
                Company Name *
              </label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Tech Company Inc"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium text-gray-700">
                Location
              </label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., New York, USA"
                value={formData.location}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium text-gray-700">
                Country
              </label>
              <Input
                id="country"
                name="country"
                placeholder="e.g., United States"
                value={formData.country}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
              <Link href="/admin/companies">
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
