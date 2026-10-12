export interface AdminIdentity {
  uid?: string | null;
  email?: string | null;
}

export const BOOTSTRAP_ADMIN_EMAILS = [
  'marsleite@gmail.com',
  'graceandradeleite@gmail.com',
  'marcelop3251@gmail.com',
];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.trim().toLowerCase());
}

export function isAdminIdentity(identity: AdminIdentity, extraAdminEmails: string[] = []): boolean {
  const adminUids = parseCsv(process.env.NEXT_PUBLIC_ADMIN_UIDS);
  const adminEmails = [
    ...BOOTSTRAP_ADMIN_EMAILS.map((v) => v.toLowerCase()),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    ...extraAdminEmails.map((e) => e.trim().toLowerCase()),
  ];

  const uid = (identity.uid || '').trim().toLowerCase();
  const email = (identity.email || '').trim().toLowerCase();

  if (uid && adminUids.includes(uid)) return true;
  if (email && adminEmails.includes(email)) return true;

  return false;
}
