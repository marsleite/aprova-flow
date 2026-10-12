import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server/apiGuard';
import { BOOTSTRAP_ADMIN_EMAILS } from '@/lib/admin';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';
import { setFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';

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

// Lista base oficial com os administradores fundadores reais
const INITIAL_REAL_USERS: AdminUserListItem[] = [
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
];

// Cache em memória de modificações dinâmicas e novos usuários adicionados
const dynamicUserOverrides = new Map<string, Partial<AdminUserListItem>>();
const dynamicAdminInvites = new Set<string>();
const manuallyAddedUsers = new Map<string, AdminUserListItem>();

const CACHE_FILE = '/tmp/am_admin_users_cache.json';

function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.dynamicUserOverrides) {
        Object.entries(data.dynamicUserOverrides).forEach(([k, v]) => {
          dynamicUserOverrides.set(k, v as Partial<AdminUserListItem>);
        });
      }
      if (Array.isArray(data.dynamicAdminInvites)) {
        data.dynamicAdminInvites.forEach((e: string) => dynamicAdminInvites.add(e));
      }
      if (data.manuallyAddedUsers) {
        Object.entries(data.manuallyAddedUsers).forEach(([k, v]) => {
          manuallyAddedUsers.set(k, v as AdminUserListItem);
        });
      }
    }
  } catch (err) {
    console.warn('[Admin Users] Failed to load cache from disk:', err);
  }
}

function persistCacheToDisk() {
  try {
    const data = {
      dynamicUserOverrides: Object.fromEntries(dynamicUserOverrides),
      dynamicAdminInvites: Array.from(dynamicAdminInvites),
      manuallyAddedUsers: Object.fromEntries(manuallyAddedUsers),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Admin Users] Failed to persist cache to disk:', err);
  }
}

// Inicializa o cache persistido na memória
loadCacheFromDisk();

export function getSystemUsersList(): AdminUserListItem[] {
  return [
    ...INITIAL_REAL_USERS.map((u) => {
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
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  const url = new URL(request.url);
  const search = (url.searchParams.get('q') || '').toLowerCase().trim();
  const filterTier = url.searchParams.get('tier');

  const allUsers = getSystemUsersList();

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
        const existingBase = INITIAL_REAL_USERS.find((u) => u.email.toLowerCase() === targetEmail);
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

      // Salva estado persistido no disco
      persistCacheToDisk();

      // Persiste diretamente no documento user_stats do Firestore se o UID for real
      if (guard.idToken && userId && !userId.startsWith('usr_manual_')) {
        setFirestoreDocumentWithUserToken({
          collection: 'user_stats',
          documentId: userId,
          data: {
            planTier: newTier,
            subscriptionStatus: newTier === 'pro' ? 'active' : 'expired',
            planCode: newTier,
            subscriptionUpdatedAt: new Date().toISOString(),
          },
          idToken: guard.idToken,
        }).catch((fsErr) => {
          console.warn('[Admin Users] Firestore update warning:', fsErr);
        });
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
      persistCacheToDisk();
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
      persistCacheToDisk();
      return NextResponse.json({ success: true, message: `Permissão de admin revogada para: ${targetEmail}` });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar requisição.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
