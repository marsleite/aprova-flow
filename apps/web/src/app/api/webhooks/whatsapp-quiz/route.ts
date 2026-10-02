import { NextRequest, NextResponse } from 'next/server';
import { saveQuestionSession } from '@/lib/firebase/questions';

const EXPECTED_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'aprovamind-secret-service-key-2026';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate internal service authorization
    const authHeader = req.headers.get('authorization') || '';
    const customHeader = req.headers.get('x-service-key') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || customHeader.trim();

    if (!token || token !== EXPECTED_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid service key' },
        { status: 401 }
      );
    }

    // 2. Parse & Validate request body
    const body = await req.json();
    const { userId, subject, isCorrect, planId, questionContext } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const cleanSubject = (typeof subject === 'string' && subject.trim()) ? subject.trim() : 'Direito Geral';
    const cleanIsCorrect = Boolean(isCorrect);

    // 3. Format date to YYYY-MM-DD
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 4. Save to Firestore questions_stats
    const sessionId = await saveQuestionSession({
      userId,
      subject: cleanSubject,
      totalQuestions: 1,
      correctAnswers: cleanIsCorrect ? 1 : 0,
      date: dateStr,
      ...(planId ? { planId } : {}),
      ...(questionContext ? { questionContext: String(questionContext).slice(0, 300) } : {}),
    });

    return NextResponse.json({
      success: true,
      sessionId,
      userId,
      subject: cleanSubject,
      isCorrect: cleanIsCorrect,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording WhatsApp quiz result into Firestore:', error);
    return NextResponse.json(
      { error: 'Internal server error recording quiz stats' },
      { status: 500 }
    );
  }
}
