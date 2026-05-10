# AprovaMind - Plano de Lançamento: 0 → 10 Pagantes

**Objetivo:** Sair do estágio beta com 2 testers para negócio rodando com CNPJ, cobrança ativa e primeiros R$290/mês.

**Prazo:** 14 dias corridos
**Status atual:** App funcional, 2 testers, sem gateway, sem CNPJ

---

## Fase 1: Fundação Legal + Financeira [Dias 1-4]

**Por que primeiro:** Sem CNPJ você não saca dinheiro do Mercado Pago. Sem isso, nada anda.

### Dia 1: Abrir MEI
1. Acessa https://www.gov.br/mei
2. Clica em "Formalize-se"
3. **CNAE Principal:** `6201-5/01` - Desenvolvimento de programas de computador sob encomenda
4. **CNAE Secundário:** `8599-6/04` - Treinamento em desenvolvimento profissional e gerencial
5. **Nome fantasia:** AprovaMind
6. **Capital social:** R$1.000,00
7. Conclui e baixa CCMEI + Cartão CNPJ

**Custo:** R$0
**Tempo:** 20min
**Output:** CNPJ ativo na hora

### Dia 2: Abrir Conta PJ
1. Baixa app Nubank, Inter ou Cora
2. Abre conta PJ usando CNPJ do MEI
3. Envia CCMEI + selfie + foto do RG
4. Aprovação em 10min-2h

**Custo:** R$0
**Output:** Conta bancária PJ pra receber do MP

### Dia 3-4: Ativar Mercado Pago PJ
1. Mercado Pago > Seu perfil > Dados da conta
2. "Quero vender como empresa" > Insere CNPJ
3. Envia: Cartão CNPJ + Comprovante conta PJ
4. Aguarda aprovação: 1-2 dias úteis
5. Após aprovado: Desenvolvedores > Credenciais > Copia Access Token de Produção

**Output:** MERCADO_PAGO_ACCESS_TOKEN pra.env

---

## Fase 2: Cobrança + Paywall [Dias 5-8]

### Dia 5: Variáveis de ambiente
Adiciona no .env.local e Vercel:

MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx
MERCADO_PAGO_WEBHOOK_SECRET=xxxxxxxx
NEXT_PUBLIC_PRO_PRICE=29.00

### Dia 6: Implementa apiGuard.ts
1. Cria /lib/server/apiGuard.ts com rate limit
2. **Free:** 5 msgs/dia no /api/chat, Mentoria bloqueada, 1 parse de edital lifetime
3. **Pro:** Ilimitado em chat, mentoria semanal, 5 parses/mês
4. Aplica em /api/chat/route.ts, /api/weekly-mentoring/route.ts

**Validação:** Testa com user free > deve retornar 402 após 5 msgs

### Dia 7: Webhook + Create Payment
1. Cria /app/api/create-payment/route.ts - gera Preference MP
2. Cria /app/api/webhooks/mercadopago/route.ts - marca isPro: true
3. Mercado Pago > Webhooks > Cadastra URL: https://aprovamind.com.br/api/webhooks/mercadopago
4. Evento: payment

**Validação:** Faz pagamento teste de R$1 no sandbox MP, confere se user_stats.isPro virou true

### Dia 8: Paywall no Frontend
1. Cria <UpgradeModal /> com preço R$29/mês + botão "Pagar com Pix"
2. Botão chama /api/create-payment e redireciona pro init_point
3. No Dashboard.tsx: se !isPro, mostra blur no <WeeklyMentoringCard /> + CTA
4. Página /obrigado: "Pagamento aprovado! Benefícios liberados."

**Validação:** Fluxo completo: Free → Clica upgrade → Paga → Volta como Pro

---

## Fase 3: Landing + Distribuição [Dias 9-14]

### Dia 9-10: Landing Page Mínima
**URL:** aprovamind.com.br
**Seções obrigatórias:**
1. **Hero:** "Pare de estudar no escuro. Veja exatamente onde seu tempo está indo."
2. **Print do Heatmap:** "Seu GitHub de estudos pra concursos"
3. **3 bullets:** Cronômetro que pausa sozinho + IA que fala onde focar + Multi-edital
4. **Preço:** "Grátis pra sempre no básico. Pro R$29/mês pra IA ilimitada."
5. **CTA:** "Começar grátis" → Login Google

Ferramenta: Faz no próprio Next.js em 3h ou usa Framer.

### Dia 11-12: Onboarding dos 2 Testers
1. Chama os 2 no WhatsApp: "Lancei o Pro. Te dou 6 meses grátis se trouxer 3 amigos"
2. Pede depoimento: "O que mudou na sua rotina depois do AprovaMind?"
3. Grava tela deles usando heatmap pra postar

### Dia 13-14: Primeira Distribuição
**Post 1 - Threads/Instagram:**
> "Sou dev e estudo pra concurso. Cansado de planilha, criei um app que rastreia minhas horas líquidas igual GitHub.
>
> [Print do heatmap anual]
>
> Descobri que estudei 0h de Tributário no mês passado 🤡
>
> Quem quer testar a beta? Link na bio."

**Post 2 - r/concursos Reddit:**
> "Fiz uma ferramenta open pra gerar heatmap de estudo igual do GitHub.
>
> Comentem o que acharam. Se curtirem, tô pensando em colocar IA pra sugerir matérias fracas."

**Meta:** 50 cadastros free, 3 conversões Pro = R$87 MRR

---

## Métricas que Importam [Acompanhar Diário]

1. **Ativação:** % de usuários que criam 1ª sessão em 24h. Meta >60%
2. **Retenção D7:** % que volta na semana seguinte. Meta >25%
3. **Conversão Free→Pro:** % que vira pagante em 14 dias. Meta >5%
4. **CAC:** R$0 por enquanto. Só tempo.
5. **MRR:** Meta R$290 em 30 dias = 10 pagantes

Onde ver: Cria dashboard no Firestore ou usa Posthog grátis.

---

## Checklist de Bloqueio

Se travar em algo, volta aqui:

| Problema | Solução |
| --- | --- |
| MP não aprova CNPJ | CCMEI tá desatualizado. Baixa novo no gov.br |
| Webhook não chama | URL tem que ser HTTPS público. Usa ngrok pra testar local |
| User pagou mas não virou Pro | Confere external_reference no webhook. Tem que ser o uid |
| IA cara demais | Rate limit tá furado. Testa bater 6 msgs com free |
| Ninguém converte | Problema não é preço. É que não viram valor. Grava Loom de 2min mostrando heatmap |

---

## Próximos 30 dias após lançar

1. **Semana 3-4:** Call de 15min com todo Pro. Pergunta: "O que quase fez você não assinar?"
2. **Ship 1 feature:** A mais pedida nas calls. Provavelmente "Meta por matéria" ou "Lembrete diário"
3. **Conteúdo:** 3 posts/semana mostrando dados reais: "Usuários do AprovaMind estudam 38% mais Constitucional às segundas"
4. **Meta:** 30 Pro = R$870 MRR. Aí pede demissão.

---

**Princípio:** Lança em 14 dias mesmo se tiver bug. Bug você corrige. Zero cliente você não corrige.

Começa pelo Dia 1 agora. Qual parte você vai fazer hoje?