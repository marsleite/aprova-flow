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
import { getBetaAccessMessage, getBetaAccessStatus, isBetaAllowed } from '@/lib/beta-access';
import { UserProfile } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // BETA: verifica allowlist no Firestore
        const allowed = await isBetaAllowed(firebaseUser.email);
        if (!allowed) {
          await signOut(auth);
          setUser(null);
          const status = await getBetaAccessStatus(firebaseUser.email);
          setError(getBetaAccessMessage(status));
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

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      const allowed = await isBetaAllowed(email);
      if (!allowed) {
        const status = await getBetaAccessStatus(email);
        setError(getBetaAccessMessage(status));
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
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const allowed = await isBetaAllowed(email);
      if (!allowed) {
        const status = await getBetaAccessStatus(email);
        setError(getBetaAccessMessage(status));
        return;
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
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
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      setError(message);
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
