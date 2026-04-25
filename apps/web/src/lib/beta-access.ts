const BETA_ALLOWLIST: string[] = [
  'marsleite@gmail.com',
  'graceandradeleite@gmail.com',
  'lidiaseixas@gmail.com',
  'marcelop3251@gmail.com',
];

export type BetaAccessStatus = 'open' | 'invite_only' | 'allowed' | 'blocked';

export function isBetaAccessRestricted(): boolean {
  return BETA_ALLOWLIST.length > 0;
}

export function isBetaAllowed(email: string | null | undefined): boolean {
  if (!isBetaAccessRestricted()) return true;
  return !!email && BETA_ALLOWLIST.includes(email.toLowerCase());
}

export function getBetaAccessStatus(email?: string | null): BetaAccessStatus {
  if (!isBetaAccessRestricted()) {
    return 'open';
  }

  if (!email) {
    return 'invite_only';
  }

  return isBetaAllowed(email) ? 'allowed' : 'blocked';
}

export function canSelfRegisterInBeta(email?: string | null): boolean {
  const status = getBetaAccessStatus(email);
  return status === 'open' || status === 'allowed';
}

export function getBetaAccessMessage(email?: string | null): string {
  const status = getBetaAccessStatus(email);

  if (status === 'open') return '';
  if (status === 'allowed') {
    return 'Seu email ja esta liberado para o beta. Voce pode entrar ou ativar o acesso com este convite.';
  }
  if (status === 'blocked') {
    return 'Seu email ainda nao foi liberado para o beta. Fale com a equipe do AprovaMind para receber um convite valido.';
  }

  return 'O acesso ao beta esta sendo liberado por convite. Digite um email ja habilitado para entrar ou ativar o seu acesso.';
}

export function getBetaAllowlistCount(): number {
  return BETA_ALLOWLIST.length;
}
