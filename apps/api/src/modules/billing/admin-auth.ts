export interface AdminSession {
  idToken: string;
  identity: {
    uid: string;
    email: string;
  };
}

export async function getAdminSession(): Promise<AdminSession> {
  const email = 'marsleite@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD || '928010Mgr';
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error('Firebase API key is not configured');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Admin programmatic login failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.idToken || !data.localId) {
    throw new Error('Invalid response from Identity Toolkit during admin sign-in');
  }

  return {
    idToken: data.idToken,
    identity: {
      uid: data.localId,
      email: data.email || email,
    },
  };
}
