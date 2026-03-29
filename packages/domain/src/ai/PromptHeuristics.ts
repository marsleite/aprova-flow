export type AIHeuristicResult = 
  | { requiresLLM: true; reason: string }
  | { requiresLLM: false; localResponse: string; confidence: number };

/**
 * Domain-level heuristics to prevent unnecessary LLM calls.
 * This runs before any AI Request (Gemini/OpenAI) to optimize costs.
 */
export class PromptHeuristics {
  /**
   * Avalia se uma pergunta direta do usuário pode ser respondida localmente (RegEx/Dicionário)
   * em vez de gastar tokens do Gemini.
   */
  static evaluateChatPrompt(prompt: string): AIHeuristicResult {
    const normalized = prompt.trim().toLowerCase();
    
    // Regra 1: Saudações simples
    if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem\??)$/.test(normalized)) {
      return {
        requiresLLM: false,
        localResponse: "Olá! Como posso ajudar você a focar na sua meta de estudos hoje?",
        confidence: 1.0,
      };
    }

    // Regra 2: Dúvidas administrativas triviais
    if (normalized.includes('como cancelar') || normalized.includes('refund') || normalized.includes('reembolso')) {
         return {
            requiresLLM: false, 
            localResponse: "Para gerenciar sua assinatura, acesse a página de Configurações no canto superior direito e clique em 'Assinatura'. Dúvidas adicionais, procure nosso suporte.", 
            confidence: 0.9 
         };
    }

    // Passa para o LLM
    return {
      requiresLLM: true,
      reason: "Complexidade textual ou intenção incerta necessita do LLM.",
    };
  }
}
