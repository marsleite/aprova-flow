const BETA_ALLOWLIST: string[] = [
  'marsleite@gmail.com',
  'graceandradeleite@gmail.com',
  'lidiaseixas@gmail.com',
  'marcelop3251@gmail.com',
];

export function isBetaAccessRestricted(): boolean {
  return BETA_ALLOWLIST.length > 0;
}

export function isBetaAllowed(email: string | null | undefined): boolean {
  if (!isBetaAccessRestricted()) return true;
  return !!email && BETA_ALLOWLIST.includes(email.toLowerCase());
}

export function getBetaAccessMessage(email?: string | null): string {
  if (!isBetaAccessRestricted()) {
    return '';
  }

  if (email && !isBetaAllowed(email)) {
    return 'Seu email ainda não foi liberado para o beta. Fale com a equipe do AprovaMind para receber acesso.';
  }

  return 'O acesso ao beta está sendo liberado por convite. Se o seu email ainda não foi habilitado, fale com a equipe do AprovaMind.';
}

export function getBetaAllowlistCount(): number {
  return BETA_ALLOWLIST.length;
}
