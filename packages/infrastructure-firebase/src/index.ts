export type Primitive = string | number | boolean | null | undefined;

export interface FirestoreWriteResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export interface FirestoreDocumentResult {
  ok: boolean;
  exists?: boolean;
  status?: number;
  error?: string;
  updateTime?: string;
  data?: Record<string, Primitive>;
}

export interface FirestoreCollectionResult {
  ok: boolean;
  status?: number;
  error?: string;
  documents?: Array<{
    id: string;
    updateTime?: string;
    data: Record<string, Primitive>;
  }>;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string | null;
}

type IdentityToolkitLookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
  }>;
};

function getFirebaseApiKey(): string | null {
  return (
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    null
  );
}

export function extractBearerToken(
  authorizationHeader: string | undefined | null
): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseUser | null> {
  const apiKey = getFirebaseApiKey();

  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as IdentityToolkitLookupResponse;
  const uid = data.users?.[0]?.localId;

  if (!uid) return null;

  return {
    uid,
    email: data.users?.[0]?.email || null,
  };
}

export async function findFirebaseUserByEmail(
  email: string
): Promise<VerifiedFirebaseUser | null> {
  const apiKey = getFirebaseApiKey();
  const normalizedEmail = email.trim().toLowerCase();

  if (!apiKey || !normalizedEmail) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: [normalizedEmail] }),
      cache: 'no-store',
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as IdentityToolkitLookupResponse;
  const uid = data.users?.[0]?.localId;

  if (!uid) return null;

  return {
    uid,
    email: data.users?.[0]?.email || normalizedEmail,
  };
}

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

function firestoreValueToPrimitive(value: Record<string, unknown>): Primitive {
  if ('stringValue' in value) return String(value.stringValue ?? '');
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('nullValue' in value) return null;
  return undefined;
}

function fromFirestoreFields(
  fields: Record<string, unknown> | undefined
): Record<string, Primitive> {
  if (!fields) return {};

  const data: Record<string, Primitive> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!raw || typeof raw !== 'object') continue;
    data[key] = firestoreValueToPrimitive(raw as Record<string, unknown>);
  }
  return data;
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
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProjectIdFromIdToken(idToken: string): string | null {
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  const aud = typeof payload.aud === 'string' ? payload.aud : null;
  if (aud) return aud;

  const iss = typeof payload.iss === 'string' ? payload.iss : '';
  const marker = 'securetoken.google.com/';
  const idx = iss.indexOf(marker);
  if (idx >= 0) {
    const fromIss = iss.slice(idx + marker.length).trim();
    if (fromIss) return fromIss;
  }

  return null;
}

function getResolvedProjectId(idToken: string): string | null {
  const projectIdFromToken = getProjectIdFromIdToken(idToken);
  const projectIdFromEnv = getProjectId();
  const projectId = projectIdFromToken || projectIdFromEnv;

  if (
    projectIdFromToken &&
    projectIdFromEnv &&
    projectIdFromToken !== projectIdFromEnv
  ) {
    console.warn(
      `[infrastructure-firebase] Project mismatch: token=${projectIdFromToken} env=${projectIdFromEnv}. Using token project.`
    );
  }

  return projectId;
}

function buildCollectionUrl(projectId: string, collection: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
}

function buildDocumentUrl(
  projectId: string,
  collection: string,
  documentId: string
): string {
  return `${buildCollectionUrl(projectId, collection)}/${encodeURIComponent(
    documentId
  )}`;
}

export async function createFirestoreDocumentWithUserToken(params: {
  collection: string;
  data: Record<string, Primitive>;
  idToken: string;
}): Promise<FirestoreWriteResult> {
  const projectId = getResolvedProjectId(params.idToken);

  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  const url = buildCollectionUrl(projectId, params.collection);

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
      return {
        ok: false,
        status: res.status,
        error: errText || 'Falha ao escrever documento no Firestore.',
      };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao escrever no Firestore.',
    };
  }
}

export async function getFirestoreDocumentWithUserToken(params: {
  collection: string;
  documentId: string;
  idToken: string;
}): Promise<FirestoreDocumentResult> {
  const projectId = getResolvedProjectId(params.idToken);

  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  const url = buildDocumentUrl(projectId, params.collection, params.documentId);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status === 404) {
      return { ok: true, exists: false, status: 404 };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: errText || 'Falha ao ler documento no Firestore.',
      };
    }

    const body = (await res.json()) as {
      updateTime?: string;
      fields?: Record<string, unknown>;
    };

    return {
      ok: true,
      exists: true,
      status: res.status,
      updateTime: body.updateTime,
      data: fromFirestoreFields(body.fields),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao ler no Firestore.',
    };
  }
}

export async function listFirestoreDocumentsWithUserToken(params: {
  collection: string;
  idToken: string;
  pageSize?: number;
}): Promise<FirestoreCollectionResult> {
  const projectId = getResolvedProjectId(params.idToken);

  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  const searchParams = new URLSearchParams();
  if (params.pageSize && Number.isFinite(params.pageSize) && params.pageSize > 0) {
    searchParams.set('pageSize', String(Math.floor(params.pageSize)));
  }

  const baseUrl = buildCollectionUrl(projectId, params.collection);
  const url = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: errText || 'Falha ao listar documentos no Firestore.',
      };
    }

    const body = (await res.json()) as {
      documents?: Array<{
        name?: string;
        updateTime?: string;
        fields?: Record<string, unknown>;
      }>;
    };

    const documents = (body.documents || []).flatMap((document) => {
      if (!document?.name) return [];
      const rawId = document.name.split('/').pop();
      if (!rawId) return [];

      return [{
        id: decodeURIComponent(rawId),
        updateTime: document.updateTime,
        data: fromFirestoreFields(document.fields),
      }];
    });

    return {
      ok: true,
      status: res.status,
      documents,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao listar documentos no Firestore.',
    };
  }
}

export async function setFirestoreDocumentWithUserToken(params: {
  collection: string;
  documentId: string;
  data: Record<string, Primitive>;
  idToken: string;
  createOnly?: boolean;
  currentUpdateTime?: string;
}): Promise<FirestoreWriteResult> {
  const projectId = getResolvedProjectId(params.idToken);

  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  const searchParams = new URLSearchParams();
  if (params.createOnly) {
    searchParams.set('currentDocument.exists', 'false');
  } else if (params.currentUpdateTime) {
    searchParams.set('currentDocument.updateTime', params.currentUpdateTime);
  }

  const query = searchParams.toString();
  const baseUrl = buildDocumentUrl(projectId, params.collection, params.documentId);
  const url = query ? `${baseUrl}?${query}` : baseUrl;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
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
      return {
        ok: false,
        status: res.status,
        error: errText || 'Falha ao salvar documento no Firestore.',
      };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao salvar no Firestore.',
    };
  }
}
