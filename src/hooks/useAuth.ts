/**
 * Hook customizado de autenticação
 * 
 * Gerencia o estado de autenticação do Firebase e fornece
 * funções para login/logout com Google.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';
import { UserProfile } from '@/types';

// ============================================================
// BETA ALLOWLIST — Remover este bloco ao lançar publicamente
// ============================================================
const BETA_ALLOWLIST: string[] = [
  'marsleite@gmail.com',
  'grace.andradeleite@gmail.com',
];

const isBetaAllowed = (email: string | null): boolean => {
  if (BETA_ALLOWLIST.length === 0) return true; // lista vazia = aberto para todos
  return !!email && BETA_ALLOWLIST.includes(email.toLowerCase());
};
// ============================================================

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Observa mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // BETA: verifica se o email está na allowlist
        if (!isBetaAllowed(firebaseUser.email)) {
          await signOut(auth);
          setUser(null);
          setError('Acesso restrito ao período de beta. Em breve abriremos para todos!');
          setLoading(false);
          return;
        }
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login com Google via popup
  const signInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      console.error('Erro no login:', err);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      setError(message);
      console.error('Erro no logout:', err);
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
  };
}
