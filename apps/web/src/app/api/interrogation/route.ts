import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { runDedicatedAiText } from '@/lib/server/dedicatedAi';

const SYSTEM_INSTRUCTION = [
  'Você é um professor e mentor de estudos severo, justo e direto ao ponto.',
  'O usuário acabou de finalizar uma sessão de estudos sobre uma "Matéria/Tópico" e enviará um pequeno resumo do que ele aprendeu/lembrou.',
  '',
  'SUA MISSÃO:',
  '1. Avaliar o resumo do usuário em relação à matéria estudada.',
  '2. Dar uma nota de 0 a 100 indicando a qualidade da retenção de conhecimento.',
  '3. Apontar o que ele acertou/lembrou bem (strengths).',
  '4. Apontar de forma precisa e direta o que faltou ele mencionar ou o que ele explicou errado (weaknesses).',
  '',
  'REGRAS:',
  '- Seja extremamente conciso. Suas strings de strengths e weaknesses devem ter no MÁXIMO 2 frases curtas cada.',
  '- Foque puramente no mérito acadêmico do resumo frente ao tópico informado.',
  '- Não seja amigável demais. Você é um mentor analítico.',
  '- O formato de retorno DEVE ser EXCLUSIVAMENTE um objeto JSON válido.',
  '- Não adicione markdown hooks. Apenas o JSON puro.',
  '',
  'FORMATO RETORNO OBRIGATÓRIO:',
  '{',
  '  "score": <number 0 to 100>,',
  '  "strengths": "<string descritiva do que ele acertou/focou bem>",',
  '  "weaknesses": "<string descritiva indicando o que faltou, foi superficial ou estava errado>"',
  '}',
].join('\n');

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const quota = await enforceAiTaskQuota({
      uid: auth.uid,
      email: auth.email,
      idToken: auth.idToken,
      task: 'interrogation',
    });
    if (!quota.allowed) return quota.response;

    const body = await request.json().catch(() => ({}));
    const { subject, summaryText } = body;

    if (!subject || !summaryText || typeof summaryText !== 'string') {
      return NextResponse.json(
        { error: 'Faltando "subject" ou "summaryText" no body, ou formato inválido.' },
        { status: 400 }
      );
    }

    if (summaryText.length < 10) {
      return NextResponse.json(
        { error: 'Resumo muito curto. Digite pelo menos algumas palavras sobre o que estudou.' },
        { status: 400 }
      );
    }

    const prompt = 'MATÉRIA ESTUDADA: ' + subject + '\n\nRESUMO DO ALUNO:\n' + summaryText;

    const aiResponse = await runDedicatedAiText({
      idToken: auth.idToken,
      payload: {
        task: 'interrogation',
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        preferJson: true,
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    const text = aiResponse.text?.trim() || '{}';
    const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();

    try {
      const parsedData = JSON.parse(jsonStr);
      const score = typeof parsedData.score === 'number' ? parsedData.score : 50;

      return NextResponse.json(
        {
          evaluation: {
            score,
            strengths: parsedData.strengths || 'Bom domínio geral.',
            weaknesses: parsedData.weaknesses || 'Nenhuma ressalva importante detectada.',
          },
        },
        {
          headers: {
            ...quota.headers,
            'x-ai-provider': aiResponse.provider,
            'x-ai-model': aiResponse.model,
            'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
          },
        }
      );
    } catch (parseError) {
      console.error('[Interrogation API] Falha ao parsear JSON Gemini:', parseError, jsonStr);
      return NextResponse.json(
        { error: 'A IA retornou um formato inválido. Tente novamente mais tarde.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro na rota /interrogation:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar IA.' },
      { status: 500 }
    );
  }
}
