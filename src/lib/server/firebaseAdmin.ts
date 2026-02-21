import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
