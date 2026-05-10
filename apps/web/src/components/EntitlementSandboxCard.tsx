'use client';

import { useEffect, useMemo, useState } from 'react';
import { Beaker, RefreshCcw } from 'lucide-react';
import { Badge, Button, Card } from '@/components';
import {
  dispatchEntitlementsUpdated,
  getStoredEntitlementScenarioUserId,
  isEntitlementSandboxAvailable,
  setStoredEntitlementScenarioUserId,
} from '@/lib/entitlement-sandbox';
import {
  fetchEntitlementScenarios,
  type EntitlementScenarioSummary,
} from '@/lib/entitlements-client';

interface EntitlementSandboxCardProps {
  currentScenarioUserId: string | null;
}

export default function EntitlementSandboxCard({
  currentScenarioUserId,
}: EntitlementSandboxCardProps) {
  const [scenarios, setScenarios] = useState<EntitlementScenarioSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVisible = isEntitlementSandboxAvailable();

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;

    async function loadScenarios() {
      setLoading(true);
      setError(null);
      try {
        const nextScenarios = await fetchEntitlementScenarios();
        if (!cancelled) {
          setScenarios(nextScenarios);
        }
      } catch {
        if (!cancelled) {
          setError('Nao foi possivel carregar os cenarios locais da API.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadScenarios();

    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  const selectedScenarioUserId = useMemo(
    () => currentScenarioUserId ?? getStoredEntitlementScenarioUserId(),
    [currentScenarioUserId]
  );

  if (!isVisible) return null;

  const handleScenarioChange = (userId: string | null) => {
    setStoredEntitlementScenarioUserId(userId);
    dispatchEntitlementsUpdated();
  };

  return (
    <Card padding="lg" variant="default" className="w-full border-am-warning/20 bg-am-warning/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-am-warning" />
            <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">
              Sandbox de Entitlements
            </h2>
          </div>
          <p className="mt-2 text-am-body-sm text-muted-foreground">
            {'Troque o cenario do plano para validar a jornada `free -> pro` no navegador sem gateway.'}
          </p>
        </div>
        <Badge variant="outline">Local</Badge>
      </div>

      <div className="mb-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
        Cenario ativo:{' '}
        <span className="font-semibold text-foreground">
          {selectedScenarioUserId ?? 'usuario real'}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-am-error/20 bg-am-error/10 p-3 text-sm text-am-error">
          {error}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant={selectedScenarioUserId === null ? 'primary' : 'secondary'}
          onClick={() => handleScenarioChange(null)}
          className="justify-start"
        >
          Usuario real
        </Button>

        {scenarios.map((scenario) => {
          const isActive = selectedScenarioUserId === scenario.userId;
          return (
            <Button
              key={scenario.userId}
              variant={isActive ? 'primary' : 'secondary'}
              onClick={() => handleScenarioChange(scenario.userId)}
              className="justify-start"
            >
              {scenario.userId}
            </Button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {loading
            ? 'Carregando cenarios da API local...'
            : 'Os cenarios sao resolvidos em http://127.0.0.1:3001.'}
        </span>
        <button
          type="button"
          onClick={() => dispatchEntitlementsUpdated()}
          className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-foreground"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>
    </Card>
  );
}
