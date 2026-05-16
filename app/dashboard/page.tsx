'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role;
      if (role === 'super_admin') {
        router.push('/admin');
      } else if (role === 'manager') {
        router.push('/manager');
      } else if (role === 'employee') {
        router.push('/employee');
      }
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    </div>
  );
}
