import { doc, getDoc } from 'firebase/firestore';

export type BetaAccessStatus = 'open' | 'invite_only' | 'allowed' | 'blocked';

// Mude para false para abrir o beta para todos sem precisar de deploy
const BETA_INVITE_ONLY = true;

// Admins sempre têm acesso, independente da beta_allowlist no Firestore
const ADMIN_EMAILS = [
  'marsleite@gmail.com',
  'graceandradeleite@gmail.com',
  'marcelop3251@gmail.com',
];

export function isBetaAccessRestricted(): boolean {
  return BETA_INVITE_ONLY;
}

export async function isBetaAllowed(email: string | null | undefined): Promise<boolean> {
  if (!isBetaAccessRestricted()) return true;
  if (!email) return false;

  const normalized = email.toLowerCase().trim();

  // Admins sempre passam, sem consultar Firestore
  if (ADMIN_EMAILS.includes(normalized)) return true;

  try {
    const { db } = await import('@/lib/firebase/config');
    const snap = await getDoc(doc(db, 'beta_allowlist', normalized));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getBetaAccessStatus(email?: string | null): Promise<BetaAccessStatus> {
  if (!isBetaAccessRestricted()) return 'open';
  if (!email) return 'invite_only';
  return (await isBetaAllowed(email)) ? 'allowed' : 'blocked';
}

export async function canSelfRegisterInBeta(email?: string | null): Promise<boolean> {
  const status = await getBetaAccessStatus(email);
  return status === 'open' || status === 'allowed';
}

export function getBetaAccessMessage(status: BetaAccessStatus): string {
  if (status === 'open') return '';
  if (status === 'allowed') {
    return 'Seu email ja esta liberado para o beta. Voce pode entrar ou ativar o acesso com este convite.';
  }
  if (status === 'blocked') {
    return 'Seu email ainda nao foi liberado para o beta. Fale com a equipe do AprovaMind para receber um convite valido.';
  }
  return 'O acesso ao beta esta sendo liberado por convite. Digite um email ja habilitado para entrar ou ativar o seu acesso.';
}
