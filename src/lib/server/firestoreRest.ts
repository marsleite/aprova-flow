interface FirestoreWriteResult {
  ok: boolean;
  status?: number;
  error?: string;
}

type Primitive = string | number | boolean | null | undefined;

function primitiveToFirestoreValue(value: Primitive) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(data: Record<string, Primitive>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = primitiveToFirestoreValue(value);
  }
  return fields;
}

function getProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null
  );
}

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function getProjectIdFromIdToken(idToken: string): string | null {
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  // Em Firebase ID token, aud costuma ser o project id.
  const aud = typeof payload.aud === 'string' ? payload.aud : null;
  if (aud) return aud;

  // Fallback: issuer no formato securetoken.google.com/<project-id>
  const iss = typeof payload.iss === 'string' ? payload.iss : '';
  const marker = 'securetoken.google.com/';
  const idx = iss.indexOf(marker);
  if (idx >= 0) {
    const fromIss = iss.slice(idx + marker.length).trim();
    if (fromIss) return fromIss;
  }

  return null;
}

export async function createFirestoreDocumentWithUserToken(params: {
  collection: string;
  data: Record<string, Primitive>;
  idToken: string;
}): Promise<FirestoreWriteResult> {
  const projectIdFromToken = getProjectIdFromIdToken(params.idToken);
  const projectIdFromEnv = getProjectId();
  const projectId = projectIdFromToken || projectIdFromEnv;

  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  if (projectIdFromToken && projectIdFromEnv && projectIdFromToken !== projectIdFromEnv) {
    console.warn(
      `[firestore-rest] Project mismatch: token=${projectIdFromToken} env=${projectIdFromEnv}. Using token project.`
    );
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${params.collection}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: toFirestoreFields(params.data),
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText || 'Falha ao escrever no Firestore.' };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro de rede ao escrever no Firestore.',
    };
  }
}
