'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { Zap } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080c14]">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
        <Zap className="h-6 w-6 text-white" />
      </div>
    </div>
  );
}
