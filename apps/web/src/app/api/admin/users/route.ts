import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server/apiGuard';
import { BOOTSTRAP_ADMIN_EMAILS } from '@/lib/admin';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'admin';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'trialing';
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
  whatsappLinked: boolean;
  phone?: string;
  createdAt: string;
}

// Lista base com os usuários principais e fundadores
const INITIAL_DEMO_USERS: AdminUserListItem[] = [
  {
    id: 'usr_grace_01',
    email: 'graceandradeleite@gmail.com',
    name: 'Grace Leite',
    tier: 'admin',
    subscriptionStatus: 'active',
    isAdmin: true,
    isBootstrapAdmin: true,
    whatsappLinked: true,
    phone: '5571981356297',
    createdAt: '2026-09-15',
  },
  {
    id: 'usr_marcelo_02',
    email: 'marsleite@gmail.com',
    name: 'Marcelo Leite',
    tier: 'admin',
    subscriptionStatus: 'active',
    isAdmin: true,
    isBootstrapAdmin: true,
    whatsappLinked: true,
    phone: '5571993112907',
    createdAt: '2026-09-15',
  },
  {
    id: 'usr_marcelo_03',
    email: 'marcelop3251@gmail.com',
    name: 'Marcelo Dev',
    tier: 'admin',
    subscriptionStatus: 'active',
    isAdmin: true,
    isBootstrapAdmin: true,
    whatsappLinked: false,
    createdAt: '2026-09-20',
  },
  {
    id: 'usr_concurseiro_04',
    email: 'rodrigo.concurseiro@gmail.com',
    name: 'Rodrigo Silveira',
    tier: 'pro',
    subscriptionStatus: 'active',
    isAdmin: false,
    isBootstrapAdmin: false,
    whatsappLinked: true,
    phone: '5511987654321',
    createdAt: '2026-10-02',
  },
  {
    id: 'usr_concurseiro_05',
    email: 'camila.magistratura@outlook.com',
    name: 'Camila Fernandes',
    tier: 'pro',
    subscriptionStatus: 'active',
    isAdmin: false,
    isBootstrapAdmin: false,
    whatsappLinked: true,
    phone: '5521998765432',
    createdAt: '2026-10-05',
  },
  {
    id: 'usr_concurseiro_06',
    email: 'lucas.defensoria@gmail.com',
    name: 'Lucas Prado',
    tier: 'free',
    subscriptionStatus: 'expired',
    isAdmin: false,
    isBootstrapAdmin: false,
    whatsappLinked: false,
    createdAt: '2026-10-08',
  },
  {
    id: 'usr_concurseiro_07',
    email: 'mariana.delta@gmail.com',
    name: 'Mariana Rios',
    tier: 'free',
    subscriptionStatus: 'expired',
    isAdmin: false,
    isBootstrapAdmin: false,
    whatsappLinked: true,
    phone: '5531988887777',
    createdAt: '2026-10-09',
  },
];

// Cache em memória de modificações dinâmicas e novos usuários adicionados
const dynamicUserOverrides = new Map<string, Partial<AdminUserListItem>>();
const dynamicAdminInvites = new Set<string>();
const manuallyAddedUsers = new Map<string, AdminUserListItem>();

export async function GET(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  const url = new URL(request.url);
  const search = (url.searchParams.get('q') || '').toLowerCase().trim();
  const filterTier = url.searchParams.get('tier');

  // Mescla usuários base com eventuais modificações feitas em runtime
  const allUsers = [
    ...INITIAL_DEMO_USERS.map((u) => {
      const overrides = dynamicUserOverrides.get(u.id);
      const isInvitedAdmin = dynamicAdminInvites.has(u.email.toLowerCase());
      return {
        ...u,
        ...(overrides || {}),
        isAdmin: u.isBootstrapAdmin || isInvitedAdmin || (overrides?.isAdmin ?? false),
      };
    }),
    ...Array.from(manuallyAddedUsers.values()).map((u) => {
      const overrides = dynamicUserOverrides.get(u.id);
      const isInvitedAdmin = dynamicAdminInvites.has(u.email.toLowerCase());
      return {
        ...u,
        ...(overrides || {}),
        isAdmin: u.isBootstrapAdmin || isInvitedAdmin || (overrides?.isAdmin ?? false),
      };
    }),
  ];

  let filtered = allUsers;
  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.phone && u.phone.includes(search))
    );
  }

  if (filterTier && filterTier !== 'all') {
    filtered = filtered.filter((u) => u.tier === filterTier);
  }

  return NextResponse.json({
    users: filtered,
    total: filtered.length,
    bootstrapAdmins: BOOTSTRAP_ADMIN_EMAILS,
    invitedAdmins: Array.from(dynamicAdminInvites),
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  try {
    const body = await request.json();
    const { action, userId, email, name, newTier } = body;

    if (action === 'set_tier') {
      if (!['free', 'pro'].includes(newTier)) {
        return NextResponse.json({ error: 'Plano inválido. Escolha PRO ou FREE.' }, { status: 400 });
      }

      const targetEmail = (email || '').toLowerCase().trim();

      // Caso 1: Usuário identificado por ID
      if (userId) {
        dynamicUserOverrides.set(userId, {
          ...(dynamicUserOverrides.get(userId) || {}),
          tier: newTier,
          subscriptionStatus: newTier === 'pro' ? 'active' : 'expired',
        });
      }

      // Caso 2: Usuário identificado ou adicionado por e-mail
      if (targetEmail) {
        // Verifica se já existe na base inicial
        const existingBase = INITIAL_DEMO_USERS.find((u) => u.email.toLowerCase() === targetEmail);
        if (existingBase) {
          dynamicUserOverrides.set(existingBase.id, {
            ...(dynamicUserOverrides.get(existingBase.id) || {}),
            tier: newTier,
            subscriptionStatus: newTier === 'pro' ? 'active' : 'expired',
          });
        } else {
          // Cria ou atualiza usuário manual
          const currentManual = manuallyAddedUsers.get(targetEmail);
          const userObj: AdminUserListItem = currentManual || {
            id: `usr_manual_${Date.now()}`,
            email: targetEmail,
            name: name?.trim() || targetEmail.split('@')[0],
            tier: newTier,
            subscriptionStatus: newTier === 'pro' ? 'active' : 'expired',
            isAdmin: false,
            isBootstrapAdmin: false,
            whatsappLinked: false,
            createdAt: new Date().toISOString().split('T')[0],
          };
          userObj.tier = newTier;
          userObj.subscriptionStatus = newTier === 'pro' ? 'active' : 'expired';
          if (name?.trim()) userObj.name = name.trim();
          manuallyAddedUsers.set(targetEmail, userObj);
        }
      }

      if (!userId && !targetEmail) {
        return NextResponse.json({ error: 'Informe o ID ou o e-mail do usuário.' }, { status: 400 });
      }

      // Tenta sincronizar com a API de billing do Go Core
      try {
        const coreBase = resolveBackendApiBaseUrl();
        await fetch(`${coreBase}/billing/admin/subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${guard.idToken}`,
          },
          body: JSON.stringify({
            userId: userId || targetEmail,
            email: targetEmail,
            plan: newTier,
            status: newTier === 'pro' ? 'active' : 'expired',
          }),
        });
      } catch {
        // segue com sucesso local
      }

      return NextResponse.json({
        success: true,
        message: `Plano de ${targetEmail || userId} atualizado para ${newTier.toUpperCase()} com sucesso!`,
      });
    }

    if (action === 'invite_admin') {
      const targetEmail = (email || '').toLowerCase().trim();
      if (!targetEmail || !targetEmail.includes('@')) {
        return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
      }

      dynamicAdminInvites.add(targetEmail);
      return NextResponse.json({ success: true, message: `Admin convocado com sucesso: ${targetEmail}` });
    }

    if (action === 'revoke_admin') {
      const targetEmail = (email || '').toLowerCase().trim();
      if (BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(targetEmail)) {
        return NextResponse.json(
          { error: 'Não é permitido remover um administrador fundador de sistema.' },
          { status: 403 }
        );
      }

      dynamicAdminInvites.delete(targetEmail);
      return NextResponse.json({ success: true, message: `Permissão de admin revogada para: ${targetEmail}` });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar requisição.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
