/**
 * API Route — Feedback Pós-Sessão
 *
 * Recebe dados da sessão recém-concluída + contexto,
 * retorna um feedback curto e motivacional.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface PostSessionRequest {
  userName: string;
  subject: string;
  durationMinutes: number;
  weeklyProgressPercent: number;
  currentStreak: number;
  weeklyGoalHours: number;
  weeklyTotalHours: number;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ feedback: null }, { status: 200 });
    }

    const body = (await request.json()) as PostSessionRequest;

    const prompt = `Você é o coach de estudos do AprovaFlow. O estudante "${body.userName}" acabou de terminar uma sessão de ${body.durationMinutes} minutos de ${body.subject}.

DADOS:
- Progresso da meta semanal: ${body.weeklyProgressPercent}% (${body.weeklyTotalHours.toFixed(1)}h de ${body.weeklyGoalHours}h)
- Streak atual: ${body.currentStreak} dias

REGRAS:
- Responda com UMA frase curta (máximo 20 palavras) de feedback motivacional.
- Mencione a matéria e/ou o progresso da meta.
- NÃO invente dados. Seja direto e encorajador.
- Responda apenas o texto, sem aspas, sem JSON.`;

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.6,
        maxOutputTokens: 100,
      },
    });

    const feedback = response.text?.trim().replace(/^["']|["']$/g, '') || null;

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Erro no feedback pós-sessão:', error);
    return NextResponse.json({ feedback: null }, { status: 200 });
  }
}
