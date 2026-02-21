/**
 * API Route — Chat Coach IA (Conversacional)
 *
 * Recebe histórico de mensagens + contexto de estudo.
 * O Gemini mantém a conversa com o "system prompt" grounded
 * nos dados reais do usuário a cada turno.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { enforceRateLimit, requireAuthenticatedUser } from '@/lib/server/apiGuard';

// ============================================================
// Tipos
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudyContext {
  userName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyGoalHours: number;
  weeklyTotalHours: number;
  weeklyProgressPercent: number;
  daysStudiedThisWeek: number;
  subjectHours: { subject: string; hours: number }[];
  planVsActual: { subject: string; plannedPercent: number; actualPercent: number; status: string }[];
  todayTotalMinutes: number;
  todayDominantSubject: string | null;
  weeklyBreakdown: { day: string; hours: number; isToday: boolean }[];
  recentSessions: { subject: string; duration: number; date: string; startTime: string }[];
  activePlanName?: string | null;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: StudyContext;
}

// ============================================================
// System prompt — grounded, anti-alucinação
// ============================================================

function buildSystemPrompt(ctx: StudyContext): string {
  const subjectSummary = ctx.subjectHours.length > 0
    ? ctx.subjectHours
        .map((s) => `  - ${s.subject}: ${s.hours}h`)
        .join('\n')
    : '  Nenhuma matéria registrada ainda.';

  const planSummary = ctx.planVsActual.length > 0
    ? ctx.planVsActual
        .map((p) => `  - ${p.subject}: planejado ${p.plannedPercent}%, real ${p.actualPercent}% [${p.status}]`)
        .join('\n')
    : '  Sem plano configurado.';

  return `Você é o Coach de Estudos do AprovaMind, assistente pessoal para concurseiros brasileiros.

PERSONALIDADE:
- Motivador, direto e prático. Fala como um mentor experiente.
- Usa linguagem informal mas respeitosa. Pode usar emojis com moderação.
- Respostas curtas (2-4 frases por tópico). Não dê aulas — dê DIREÇÃO.

REGRAS ABSOLUTAS:
- Base suas respostas EXCLUSIVAMENTE nos dados do estudante abaixo.
- NÃO invente dados, matérias ou estatísticas que não existam no contexto.
- NÃO cite leis, artigos ou conteúdo jurídico — você é coach de ROTINA, não professor.
- Se o estudante perguntar algo fora do escopo de rotina de estudos, redirecione gentilmente.
- Responda sempre em português brasileiro.

DADOS DO ESTUDANTE "${ctx.userName}":
${ctx.activePlanName ? `- EDITAL EM FOCO: ${ctx.activePlanName}` : '- Visão GERAL (todos os editais)'}
- Streak: ${ctx.currentStreak} dias (melhor: ${ctx.bestStreak})
- Meta semanal: ${ctx.weeklyGoalHours}h | Estudado: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Dias estudados esta semana: ${ctx.daysStudiedThisWeek}/7
- Hoje: ${ctx.todayTotalMinutes} min${ctx.todayDominantSubject ? ` (foco: ${ctx.todayDominantSubject})` : ''}

HORAS POR MATÉRIA (mês):
${subjectSummary}

PLANO VS REAL:
${planSummary}

EVOLUÇÃO SEMANAL (Seg a Dom):
${ctx.weeklyBreakdown?.length > 0
    ? ctx.weeklyBreakdown
        .map((d) => `  - ${d.day}: ${d.hours > 0 ? d.hours + 'h' : 'não estudou'}${d.isToday ? ' (HOJE)' : ''}`)
        .join('\n')
    : '  Sem dados da semana.'}

ÚLTIMAS SESSÕES:
${ctx.recentSessions?.length > 0
    ? ctx.recentSessions
        .map((s) => `  - ${s.date} | ${s.subject} | ${Math.round(s.duration / 60)} min`)
        .join('\n')
    : '  Nenhuma sessão recente.'}

CAPACIDADES:
- Montar planos de estudo diários/semanais baseados nos dados
- Sugerir qual matéria estudar e por quanto tempo
- Motivar baseado no streak e progresso real
- Analisar equilíbrio entre matérias
- Ajudar a definir metas realistas
- Analisar a evolução dia a dia da semana (quais dias foram fortes/fracos)
- Comparar sessões recentes para identificar padrões (horários, matérias repetidas, duração média)`;
}

// ============================================================
// Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const limited = enforceRateLimit({
      key: auth.key,
      bucket: 'api-chat',
      max: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada' },
        { status: 500 }
      );
    }

    const { messages, context } = (await request.json()) as ChatRequest;

    if (!context?.userName || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    if (messages.length > 20) {
      return NextResponse.json({ error: 'Histórico excede o limite permitido.' }, { status: 400 });
    }

    const hasInvalidMessage = messages.some(
      (msg) =>
        !msg ||
        (msg.role !== 'user' && msg.role !== 'assistant') ||
        typeof msg.content !== 'string' ||
        msg.content.trim().length === 0 ||
        msg.content.length > 2000
    );
    if (hasInvalidMessage) {
      return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Monta o histórico de conversa com system prompt embutido
    const systemPrompt = buildSystemPrompt(context);

    // Constrói contents para a API: system + histórico + última mensagem
    const contents: string[] = [];

    // Adiciona system prompt como contexto inicial
    contents.push(`[INSTRUÇÕES DO SISTEMA — NÃO MOSTRAR AO USUÁRIO]\n${systemPrompt}\n[FIM DAS INSTRUÇÕES]\n`);

    // Adiciona histórico formatado
    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push(`Estudante: ${msg.content}`);
      } else {
        contents.push(`Coach: ${msg.content}`);
      }
    }

    const fullPrompt = contents.join('\n\n') + '\n\nCoach:';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        temperature: 0.5,       // Um pouco mais criativo para conversa natural
        maxOutputTokens: 2048,  // Evita respostas truncadas em conversas longas
      },
    });

    const text = response.text?.trim() || 'Desculpe, não consegui gerar uma resposta. Tente novamente.';

    // Limpa prefixo "Coach:" se o modelo repetir
    const cleaned = text.replace(/^Coach:\s*/i, '').trim();

    return NextResponse.json({ reply: cleaned });
  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar IA. Tente novamente.' },
      { status: 500 }
    );
  }
}
