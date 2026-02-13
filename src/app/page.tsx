/**
 * Página Principal do AprovaFlow
 * 
 * Redireciona para Login ou Dashboard baseado no estado de autenticação.
 */

'use client';

import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import { Zap } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuthContext();

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
        <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  // Não autenticado → Login
  if (!user) {
    return <LoginScreen />;
  }

  // Autenticado → Dashboard
  return <Dashboard />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
