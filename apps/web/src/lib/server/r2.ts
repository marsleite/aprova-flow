import crypto from 'node:crypto';

/**
 * Pure Node.js Zero-Dependency Cloudflare R2 / S3 Client
 * Uses AWS Signature Version 4 with native Node.js crypto and fetch.
 */

const R2_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || '61d39b70aa5e0397fa31fd3a6273cb3b';
const R2_ACCESS_KEY_ID =
  process.env.R2_ACCESS_KEY_ID || 'e53b33451822f0617d1f3a1b07adb7c0';
const R2_SECRET_ACCESS_KEY =
  process.env.R2_SECRET_ACCESS_KEY ||
  '3ca15297fca386efe5237dfad9a0f0476b8716b3e5c847157b2724202348ffe8';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'aprovamind-storage';
const R2_REGION = 'auto';
const R2_SERVICE = 's3';

function sha256(data: string | Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

export function getR2Host(): string {
  return `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function getR2Endpoint(): string {
  return `https://${getR2Host()}`;
}

/**
 * Upload an object (PDF, image, audio) directly to Cloudflare R2
 */
export async function uploadToR2(params: {
  key: string;
  data: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ ok: boolean; key: string; url: string; error?: string }> {
  try {
    const host = getR2Host();
    const cleanKey = params.key.replace(/^\/+/, '');
    const path = `/${R2_BUCKET_NAME}/${cleanKey}`;
    const url = `https://${host}${path}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const contentType = params.contentType || 'application/octet-stream';
    const payloadHash = sha256(params.data);

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest =
      `PUT\n` +
      `${path}\n` +
      `\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
    const stringToSign =
      `AWS4-HMAC-SHA256\n` +
      `${amzDate}\n` +
      `${credentialScope}\n` +
      `${sha256(canonicalRequest)}`;

    const signingKey = getSignatureKey(
      R2_SECRET_ACCESS_KEY,
      dateStamp,
      R2_REGION,
      R2_SERVICE
    );
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign, 'utf8')
      .digest('hex');

    const authHeader =
      `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Host: host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authHeader,
      },
      body: params.data as any,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[R2 Storage] Upload failed:', res.status, errText);
      return { ok: false, key: cleanKey, url, error: errText || `HTTP ${res.status}` };
    }

    return { ok: true, key: cleanKey, url };
  } catch (error: any) {
    console.error('[R2 Storage] Upload error:', error);
    return {
      ok: false,
      key: params.key,
      url: '',
      error: error.message || 'Erro inesperado no upload',
    };
  }
}

/**
 * Generate a secure presigned download URL valid for specified duration (default: 1 hour)
 */
export function getPresignedR2DownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): string {
  const host = getR2Host();
  const cleanKey = key.replace(/^\/+/, '');
  const path = `/${R2_BUCKET_NAME}/${cleanKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  });

  queryParams.sort();
  const canonicalQuery = queryParams.toString();

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest =
    `GET\n` +
    `${path}\n` +
    `${canonicalQuery}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;

  const stringToSign =
    `AWS4-HMAC-SHA256\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${sha256(canonicalRequest)}`;

  const signingKey = getSignatureKey(
    R2_SECRET_ACCESS_KEY,
    dateStamp,
    R2_REGION,
    R2_SERVICE
  );
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
