/**
 * Configuração do Firebase
 * 
 * IMPORTANTE: Substitua os valores abaixo pelas credenciais do seu projeto Firebase.
 * Para obter as credenciais:
 * 1. Acesse https://console.firebase.google.com
 * 2. Crie ou selecione um projeto
 * 3. Vá em "Configurações do projeto" > "Seus apps" > "Web"
 * 4. Copie as credenciais do firebaseConfig
 * 
 * Em produção, use variáveis de ambiente (.env.local)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Inicializa o Firebase apenas se não houver instância existente
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Exporta instâncias dos serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Inicializa o Analytics apenas no browser e quando suportado.
 * Evita erro em SSR/ambientes sem suporte.
 */
export async function initFirebaseAnalytics() {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(app);
  } catch {
    return null;
  }
}

/**
 * Inicializa o Messaging apenas no browser.
 * Evita erro em SSR/ambientes sem suporte.
 */
export async function initFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  const { getMessaging } = await import('firebase/messaging');
  return getMessaging(app);
}

export default app;
