import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

/**
 * Chat Coach IA (Conversacional)
 * 
 * Roteia a mensagem diretamente para o Go Core API (core.aprovamind.com.br),
 * que mantém o histórico omnicanal unificado no Supabase (WhatsApp + Web)
 * e responde via Gemini 2.5 Flash com máxima velocidade e baixo consumo.
 */
export async function POST(request: NextRequest) {
  return proxyRequestToBackendApi({
    request,
    targetPath: '/api/chat',
  });
}
