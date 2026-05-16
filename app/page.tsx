'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600 mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center text-white">
        <h1 className="text-5xl font-bold mb-4">OpenCoders</h1>
        <p className="text-xl mb-4 text-blue-100">Employee Management Portal</p>
        <p className="text-lg mb-8 text-blue-100 max-w-lg mx-auto">
          Comprehensive solution for managing employees, attendance, projects, and leave requests across multiple companies worldwide.
        </p>

        <div className="space-y-4 mb-12">
          <p className="text-blue-200">Ready to get started?</p>
          <Link href="/login">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-2 text-lg font-semibold">
              Login to Your Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
