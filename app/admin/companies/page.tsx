'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Company {
  id: number;
  name: string;
  location: string;
  country: string;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', country: '' });

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDelete = async (companyId: number, companyName: string) => {
    if (
      !window.confirm(
        `Delete company "${companyName}" and all linked managers, employees, and projects?`
      )
    ) {
      return;
    }

    setError('');
    setDeletingId(companyId);
    try {
      const res = await fetch(`/api/companies?id=${companyId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete company');
      }
      await fetchCompanies();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (company: Company) => {
    setEditCompany(company);
    setFormData({
      name: company.name || '',
      location: company.location || '',
      country: company.country || '',
    });
  };

  const submitEdit = async () => {
    if (!editCompany) return;
    if (!formData.name.trim()) {
      setError('Company name is required.');
      return;
    }

    setError('');
    setEditingId(editCompany.id);
    try {
      const res = await fetch(`/api/companies?id=${editCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          country: formData.country.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update company');
      }
      await fetchCompanies();
      setEditCompany(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div>
      <Dialog open={!!editCompany} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditCompany(null)}
              disabled={editingId === editCompany?.id}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editingId === editCompany?.id}>
              {editingId === editCompany?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">Manage all companies across the organization</p>
        </div>
        <Link href="/admin/companies/create">
          <Button className="bg-blue-600 hover:bg-blue-700">+ Add Company</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>Total: {companies.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No companies found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.location || '-'}</TableCell>
                      <TableCell>{company.country || '-'}</TableCell>
                      <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/companies/${company.id}`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={editingId === company.id || deletingId === company.id}
                            onClick={() => handleEdit(company)}
                          >
                            {editingId === company.id ? 'Saving...' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === company.id || editingId === company.id}
                            onClick={() => handleDelete(company.id, company.name)}
                          >
                            {deletingId === company.id ? 'Deleting...' : 'Delete'}
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
