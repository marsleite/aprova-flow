'use client';

import { PlanCode, SubscriptionStatus, type FeatureUsageMap } from '@aprovamind/domain';
import { useState } from 'react';
import { Shield, RefreshCw, Save } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import {
  fetchAdminSubscriptionState,
  updateAdminSubscriptionState,
  type AdminSubscriptionStateResponse,
} from '@/lib/billing-admin-client';
import { Button, Card, Badge } from '@/components';

const PLAN_OPTIONS = [PlanCode.Free, PlanCode.Pro] as const;
const STATUS_OPTIONS = [
  SubscriptionStatus.Trialing,
  SubscriptionStatus.Active,
  SubscriptionStatus.PastDue,
  SubscriptionStatus.GracePeriod,
  SubscriptionStatus.Canceled,
  SubscriptionStatus.Expired,
] as const;

function stringifyUsage(usage?: FeatureUsageMap): string {
  if (!usage || Object.keys(usage).length === 0) {
    return '';
  }

  return JSON.stringify(usage, null, 2);
}

function formatAdminPanelError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) {
    return fallback;
  }

  const [code, rawStatus, rawMessage] = err.message.split(':');
  const status = Number(rawStatus);
  const message = rawMessage?.trim();

  if (code === 'missing_id_token') {
    return 'Sua sessão expirou. Faça login novamente e tente de novo.';
  }

  if (code === 'billing_admin_unavailable') {
    return 'A API de billing não respondeu. No ambiente local, confirme se a API está rodando na porta 3001.';
  }

  if (code === 'missing_api_base_url') {
    return 'A URL da API de billing não está configurada neste ambiente.';
  }

  if (status === 401) {
    return 'Sua sessão admin não foi reconhecida. Faça login novamente e tente de novo.';
  }

  if (status === 403) {
    return 'Sua conta não tem permissão para operar testers neste ambiente.';
  }

  if (status === 404) {
    return message || 'Não encontramos esse usuário no Firebase deste ambiente.';
  }

  return message || err.message || fallback;
}

export default function TesterSubscriptionManagerCard() {
  const [userIdentifier, setUserIdentifier] = useState('');
  const [plan, setPlan] = useState<PlanCode>(PlanCode.Free);
  const [status, setStatus] = useState<SubscriptionStatus>(SubscriptionStatus.Active);
  const [usageJson, setUsageJson] = useState('');
  const [resetUsage, setResetUsage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [current, setCurrent] = useState<AdminSubscriptionStateResponse | null>(null);

  async function getIdToken(): Promise<string> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('missing_id_token');
    }
    return idToken;
  }

  async function handleLoad() {
    if (!userIdentifier.trim()) {
      setError('Informe o UID ou e-mail do tester para carregar a assinatura.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await fetchAdminSubscriptionState({
        userIdentifier: userIdentifier.trim(),
        idToken: await getIdToken(),
      });

      setCurrent(payload);
      setPlan(payload.subscription.plan);
      setStatus(payload.subscription.status);
      setUsageJson(stringifyUsage(payload.subscription.usage));
      setResetUsage(false);
    } catch (err) {
      setError(formatAdminPanelError(err, 'Não foi possível carregar a assinatura.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userIdentifier.trim()) {
      setError('Informe o UID ou e-mail do tester antes de salvar.');
      return;
    }

    let parsedUsage: FeatureUsageMap | undefined;
    if (!resetUsage && usageJson.trim()) {
      try {
        parsedUsage = JSON.parse(usageJson) as FeatureUsageMap;
      } catch {
        setError('usage precisa ser um JSON valido.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await updateAdminSubscriptionState({
        idToken: await getIdToken(),
        userIdentifier: userIdentifier.trim(),
        plan,
        status,
        usage: parsedUsage,
        resetUsage,
      });

      setCurrent(payload);
      setPlan(payload.subscription.plan);
      setStatus(payload.subscription.status);
      setUsageJson(stringifyUsage(payload.subscription.usage));
      setResetUsage(false);
      setSuccess('Assinatura do tester atualizada com sucesso.');
    } catch (err) {
      setError(formatAdminPanelError(err, 'Não foi possível salvar a assinatura.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" variant="default" className="w-full">
      <div className="mb-5 flex items-center gap-2 border-b border-am-border-subtle pb-3">
        <Shield className="h-4 w-4 text-am-warning" />
        <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">
          Operacao de Testers
        </h2>
      </div>

      <div className="space-y-4">
        <p className="text-am-body-sm text-muted-foreground leading-relaxed">
          Use este painel interno para simular free, pro, past due ou expiração sem gateway de pagamento.
        </p>

        <div className="grid gap-3 md:grid-cols-[1.4fr_auto]">
          <input
            value={userIdentifier}
            onChange={(event) => setUserIdentifier(event.target.value)}
            placeholder="UID ou e-mail do tester"
            className="rounded-md border border-border bg-card px-3 py-2 text-am-body-sm text-foreground outline-none transition focus:border-am-brand-primary"
          />
          <Button variant="outline" onClick={handleLoad} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Carregar
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-am-caption text-muted-foreground">Plano</span>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as PlanCode)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-am-body-sm text-foreground outline-none transition focus:border-am-brand-primary"
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-am-caption text-muted-foreground">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-am-body-sm text-foreground outline-none transition focus:border-am-brand-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-am-caption text-muted-foreground">
            Usage (JSON opcional)
          </span>
          <textarea
            value={usageJson}
            onChange={(event) => setUsageJson(event.target.value)}
            rows={6}
            placeholder='{"ai_explanations": 2, "contextual_ai_chat": 1}'
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-am-body-sm text-foreground outline-none transition focus:border-am-brand-primary"
          />
        </label>

        <label className="flex items-center gap-2 text-am-body-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={resetUsage}
            onChange={(event) => setResetUsage(event.target.checked)}
          />
          Resetar usage do tester
        </label>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar assinatura
          </Button>
          {loading && <span className="text-am-body-sm text-muted-foreground">Processando...</span>}
        </div>

        {error && (
          <div className="rounded-md border border-am-error/30 bg-am-error/10 px-3 py-2 text-am-body-sm text-am-error">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-am-success/30 bg-green-500/10 px-3 py-2 text-am-body-sm text-green-500">
            {success}
          </div>
        )}

        {current && (
          <div className="rounded-md border border-am-border-subtle bg-muted p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">userId: {current.userId}</Badge>
              {current.email ? <Badge variant="outline">email: {current.email}</Badge> : null}
              <Badge variant="outline">plan: {current.subscription.plan}</Badge>
              <Badge variant="outline">status: {current.subscription.status}</Badge>
            </div>
            <pre className="overflow-auto rounded-md bg-card px-3 py-2 text-xs text-muted-foreground">
              {JSON.stringify(current.subscription.usage ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}
