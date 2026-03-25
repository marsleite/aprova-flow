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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';
import { getBetaAccessMessage, isBetaAllowed } from '@/lib/beta-access';
import { UserProfile } from '@/types';
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
          setError(getBetaAccessMessage(firebaseUser.email));
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

  // Login com email e senha
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      if (!isBetaAllowed(email)) {
        setError(getBetaAccessMessage(email));
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/user-not-found': 'Email não encontrado. Crie uma conta primeiro.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-email': 'Email inválido.',
        'auth/invalid-credential': 'Email ou senha incorretos.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
      };
      setError(messages[code || ''] || 'Erro ao fazer login.');
      console.error('Erro no login email:', err);
    }
  };

  // Cadastro com email e senha
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      if (!isBetaAllowed(email)) {
        setError(getBetaAccessMessage(email));
        return;
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      // Força refresh do user state com displayName
      setUser({
        uid: result.user.uid,
        displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Este email já está cadastrado. Faça login.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/invalid-email': 'Email inválido.',
      };
      setError(messages[code || ''] || 'Erro ao criar conta.');
      console.error('Erro no cadastro:', err);
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
    signInWithEmail,
    signUpWithEmail,
    logout,
  };
}
