/**
 * API Route — Mentor AprovaFlow
 *
 * Especialista em aprovação em concursos de alto nível.
 * Recebe dados de estudo do Firestore e retorna feedback motivacional
 * estratégico: analisa equilíbrio, detecta fadiga e entrega ação imediata.
 *
 * A GEMINI_API_KEY fica exclusivamente no server — nunca exposta ao browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// Tipos
// ============================================================

interface SubjectHoursEntry {
  subject: string;
  hours: number;
}

interface PlanEntry {
  subject: string;
  plannedPercent: number;
  actualPercent: number;
  status: string; // 'ok' | 'neglected' | 'over'
}

interface WeeklyDayEntry {
  day: string;    // 'Seg', 'Ter', ...
  hours: number;
  isToday: boolean;
}

interface RecentSessionEntry {
  subject: string;
  duration: number;   // segundos
  date: string;       // YYYY-MM-DD
  startTime: string;  // ISO
}

interface SubjectAccuracyEntry {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;     // 0-100
  sessions: number;
}

interface SimuladoEntry {
  name: string;
  date: string;
  score: number;        // acertos
  total: number;        // total de questões
  percentCorrect: number;
}

interface MentorRequest {
  userName: string;
  currentStreak: number;
  bestStreak: number;
  weeklyGoalHours: number;
  weeklyTotalHours: number;
  weeklyProgressPercent: number;
  daysStudiedThisWeek: number;
  todayTotalMinutes: number;
  todayDominantSubject: string | null;
  subjectHours: SubjectHoursEntry[];
  planVsActual: PlanEntry[];
  weeklyBreakdown: WeeklyDayEntry[];
  recentSessions: RecentSessionEntry[];
  accuracyBySubject?: SubjectAccuracyEntry[];
  simulados?: SimuladoEntry[];
}

interface MentorResponse {
  analysis: string;
  performanceInsight: string | null;
  fatigueAlert: string | null;
  immediateAction: string;
  motivationalQuote: string;
}

// ============================================================
// System prompt — Mentor AprovaFlow
// ============================================================

function buildMentorPrompt(ctx: MentorRequest): string {
  // ---- Formatadores ----
  const subjectSummary =
    ctx.subjectHours.length > 0
      ? ctx.subjectHours
          .map((s) => `  - ${s.subject}: ${s.hours}h`)
          .join('\n')
      : '  Nenhuma matéria registrada ainda.';

  const planSummary =
    ctx.planVsActual.length > 0
      ? ctx.planVsActual
          .map(
            (p) =>
              `  - ${p.subject}: planejado ${p.plannedPercent}%, real ${p.actualPercent}% [${p.status}]`
          )
          .join('\n')
      : '  Sem plano configurado.';

  const weeklySummary =
    ctx.weeklyBreakdown?.length > 0
      ? ctx.weeklyBreakdown
          .map(
            (d) =>
              `  - ${d.day}: ${d.hours > 0 ? d.hours + 'h' : 'não estudou'}${d.isToday ? ' (HOJE)' : ''}`
          )
          .join('\n')
      : '  Sem dados da semana.';

  const recentSummary =
    ctx.recentSessions?.length > 0
      ? ctx.recentSessions
          .map(
            (s) =>
              `  - ${s.date} | ${s.subject} | ${Math.round(s.duration / 60)} min`
          )
          .join('\n')
      : '  Nenhuma sessão recente.';

  const accuracySummary =
    ctx.accuracyBySubject && ctx.accuracyBySubject.length > 0
      ? ctx.accuracyBySubject
          .map(
            (a) =>
              `  - ${a.subject}: ${a.accuracy}% (${a.correctAnswers}/${a.totalQuestions} em ${a.sessions} ${a.sessions === 1 ? 'sessão' : 'sessões'})`
          )
          .join('\n')
      : '  Nenhuma questão registrada ainda.';

  const simuladoSummary =
    ctx.simulados && ctx.simulados.length > 0
      ? ctx.simulados
          .map(
            (s) =>
              `  - ${s.name} (${s.date}): ${s.score}/${s.total} (${s.percentCorrect}%)`
          )
          .join('\n')
      : '  Nenhum simulado registrado.';

  // Detecta tendência de horas (crescendo ou caindo)
  const weekHours = ctx.weeklyBreakdown
    ?.filter((d) => !d.isToday)
    .map((d) => d.hours) ?? [];
  let trendNote = '';
  if (weekHours.length >= 3) {
    const recentAvg =
      weekHours.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierAvg =
      weekHours.slice(0, Math.max(1, weekHours.length - 3)).reduce((a, b) => a + b, 0) /
      Math.max(1, weekHours.length - 3);
    if (recentAvg < earlierAvg * 0.7) {
      trendNote = '⚠️ TENDÊNCIA DETECTADA: as horas líquidas estão CAINDO nos últimos dias.';
    } else if (recentAvg > earlierAvg * 1.3) {
      trendNote = '📈 TENDÊNCIA POSITIVA: as horas líquidas estão SUBINDO nos últimos dias.';
    }
  }

  return `PERSONA:
Você é o "Mentor AprovaFlow", um especialista em aprovação em concursos públicos de alto nível (Magistratura, Auditoria, Polícia Federal). Sua voz é motivadora, estratégica e baseada em dados reais.

TOM DE VOZ:
- Energético, focado em "posse" e "estabilidade financeira".
- Use termos como "Constância", "Edital batido" e "Vaga garantida".
- Fale como alguém que já aprovou centenas de alunos e conhece cada armadilha do caminho.

REGRAS ABSOLUTAS:
- Responda EXCLUSIVAMENTE com base nos dados fornecidos abaixo. NÃO invente dados.
- NÃO cite leis, artigos ou conteúdo jurídico — você é MENTOR DE ESTRATÉGIA, não professor.
- NÃO faça perguntas ao usuário — entregue respostas diretas e acionáveis.
- Responda em português brasileiro.

SUAS REGRAS DE ANÁLISE:

1. ANALISE O EQUILÍBRIO: Se o usuário estuda muito o que gosta e ignora o que é difícil, aponte isso imediatamente. Concurso se ganha nas matérias que incomodam.

2. DETECTE FADIGA: Se as horas líquidas estão caindo ao longo da semana, sugira um bloco de descanso ativo ou revisão leve. Burnout é inimigo da constância.

3. CRUZE CONSTÂNCIA × PRECISÃO (análise mais importante):
   - CONSTÂNCIA ALTA + PRECISÃO ALTA (muitas horas + acerto ≥80%): Reconheça o domínio e sugira avançar para questões mais complexas ou simulados cronometrados.
   - CONSTÂNCIA ALTA + PRECISÃO BAIXA (muitas horas + acerto <60%): Alerte que o esforço não está se convertendo em resultado. Sugira mudar a estratégia: ler questões comentadas, revisar teoria, ou trocar material. Ex: "Sua constância em Direito Civil é ótima, mas sua precisão caiu para 55%. Hora de focar em questões comentadas antes de avançar."
   - CONSTÂNCIA BAIXA + PRECISÃO ALTA (poucas horas + acerto ≥80%): Reconheça o talento e alerte que sem volume, a prova cobra temas que não foram cobertos. Sugira aumentar as horas.
   - CONSTÂNCIA BAIXA + PRECISÃO BAIXA (poucas horas + acerto <60%): Sinal vermelho — matéria precisa de atenção imediata: mais horas + revisão teórica urgente.
   - SEM DADOS DE QUESTÕES para uma matéria com muitas horas: Sugira ao estudante começar a resolver questões para validar o aprendizado.

4. SEJA PRÁTICO: SEMPRE termine com uma "Ação Imediata" concreta e personalizada baseada no cruzamento acima. Ex: "Abra Raciocínio Lógico e faça 30 min de questões comentadas para converter suas 12h de estudo em acertos." Sempre inclua matéria + tempo + tipo de atividade.

DADOS DO ESTUDANTE "${ctx.userName}":
- Streak atual: ${ctx.currentStreak} dias | Melhor: ${ctx.bestStreak} dias
- Meta semanal: ${ctx.weeklyGoalHours}h | Estudado: ${ctx.weeklyTotalHours.toFixed(1)}h (${ctx.weeklyProgressPercent}%)
- Dias estudados esta semana: ${ctx.daysStudiedThisWeek}/7
- Hoje: ${ctx.todayTotalMinutes} min${ctx.todayDominantSubject ? ` (foco: ${ctx.todayDominantSubject})` : ''}
${trendNote ? `\n${trendNote}` : ''}

HORAS POR MATÉRIA (mês):
${subjectSummary}

PLANO VS REAL:
${planSummary}

EVOLUÇÃO SEMANAL (Seg a Dom):
${weeklySummary}

ÚLTIMAS SESSÕES:
${recentSummary}

TAXA DE ACERTO EM QUESTÕES (mês):
${accuracySummary}

DESEMPENHO EM SIMULADOS:
${simuladoSummary}

Responda EXATAMENTE neste formato JSON (sem markdown, sem \`\`\`):
{
  "analysis": "Análise estratégica do equilíbrio de matérias e progresso. Aponte desbalanceamentos, matérias negligenciadas, e o que está indo bem. Seja direto. 3-5 frases.",
  "performanceInsight": "Cruzamento constância × precisão. Identifique a matéria mais crítica (muitas horas mas poucos acertos, ou vice-versa) e dê um conselho objetivo em 2-3 frases. Se não há dados de questões, diga 'Comece a fazer questões para validar seu aprendizado.' Se NÃO há dados suficientes, responda null (sem aspas).",
  "fatigueAlert": "Se detectou queda de horas ou sinais de fadiga, escreva um alerta com sugestão de descanso. Se NÃO detectou fadiga, responda null (sem aspas).",
  "immediateAction": "Uma ação imediata e concreta para o estudante executar AGORA baseada no cruzamento constância × precisão. Sempre inclua matéria + tempo + tipo de atividade.",
  "motivationalQuote": "Frase curta e energética no estilo Mentor AprovaFlow. Use termos como constância, edital, vaga, posse. Máximo 2 frases."
}`;
}

// ============================================================
// Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no .env.local' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as MentorRequest;

    // Validação básica
    if (!body.userName) {
      return NextResponse.json(
        { error: 'Dados do estudante inválidos — userName obrigatório' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildMentorPrompt(body),
      config: {
        temperature: 0.4,
        maxOutputTokens: 1536,
      },
    });

    const text = response.text?.trim() || '';

    // ---- Parse JSON com múltiplas estratégias ----
    let parsed: MentorResponse;
    try {
      // Remove backticks markdown caso o modelo inclua
      let cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Extrai JSON de qualquer posição no texto
      const jsonMatch = cleaned.match(
        /\{[\s\S]*"analysis"[\s\S]*"immediateAction"[\s\S]*\}/
      );
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      parsed = JSON.parse(cleaned);

      // Valida campos
      if (typeof parsed.analysis !== 'string') parsed.analysis = '';
      if (typeof parsed.immediateAction !== 'string') parsed.immediateAction = '';
      if (typeof parsed.motivationalQuote !== 'string') parsed.motivationalQuote = '';
      // performanceInsight e fatigueAlert podem ser null ou string
      if (parsed.performanceInsight !== null && typeof parsed.performanceInsight !== 'string') {
        parsed.performanceInsight = null;
      }
      if (parsed.fatigueAlert !== null && typeof parsed.fatigueAlert !== 'string') {
        parsed.fatigueAlert = null;
      }
    } catch {
      // Fallback — texto cru como análise
      const cleanText = text
        .replace(/[{}"]/g, '')
        .replace(
          /analysis:|fatigueAlert:|immediateAction:|motivationalQuote:/g,
          ''
        )
        .replace(/,\s*/g, ' ')
        .trim();

      parsed = {
        analysis:
          cleanText.slice(0, 500) ||
          'Continue com constância — cada hora te aproxima da posse.',
        performanceInsight: null,
        fatigueAlert: null,
        immediateAction:
          'Abra a matéria que você menos estudou este mês e dedique 30 minutos agora.',
        motivationalQuote:
          'Constância bate talento. Sua vaga está sendo construída agora.',
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro na API Mentor:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar o Mentor IA. Tente novamente.' },
      { status: 500 }
    );
  }
}
