interface AdminIdentity {
  uid?: string | null;
  email?: string | null;
}

const BOOTSTRAP_ADMIN_EMAILS = ['marsleite@gmail.com'];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminIdentity(identity: AdminIdentity): boolean {
  const adminUids = parseCsv(process.env.NEXT_PUBLIC_ADMIN_UIDS);
  const adminEmails = [
    ...BOOTSTRAP_ADMIN_EMAILS.map((v) => v.toLowerCase()),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
  ];

  const uid = (identity.uid || '').trim().toLowerCase();
  const email = (identity.email || '').trim().toLowerCase();

  if (uid && adminUids.includes(uid)) return true;
  if (email && adminEmails.includes(email)) return true;

  return false;
}
