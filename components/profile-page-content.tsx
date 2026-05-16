'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProfileData {
  full_name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'employee';
  company_name: string | null;
  employee_code: string | null;
  position: string | null;
  department: string | null;
  joining_date: string | null;
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  employee: 'Employee',
};

export function ProfilePageContent() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        setProfile(await res.json());
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: form.currentPassword,
          new_password: form.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess('Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View your account information and security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600">Loading profile...</div>
          ) : profile ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="font-medium">{profile.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{profile.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-medium">{roleLabel[profile.role] || profile.role}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Company</p>
                <p className="font-medium">{profile.company_name || '-'}</p>
              </div>
              {profile.role === 'employee' && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Employee Code</p>
                    <p className="font-medium">{profile.employee_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Position</p>
                    <p className="font-medium">{profile.position || '-'}</p>
                  </div>
                </>
              )}
              {profile.role === 'manager' && (
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="font-medium">{profile.department || '-'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Profile not found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Update your login password securely.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
