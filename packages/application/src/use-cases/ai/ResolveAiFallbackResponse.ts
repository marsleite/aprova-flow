type AiFallbackTask = string;

export interface AiFallbackResponse {
  task: AiFallbackTask;
  message: string;
  text: string;
  fallbackUsed: true;
  errorCode?: string;
}

const CRITICAL_TASK_MESSAGES: Record<string, string> = {
  'planner-daily': 'Montei um plano seguro sem depender da IA ao vivo. Seus registros foram preservados.',
  'smart-schedule': 'Usei uma orientação local para manter seu estudo andando agora.',
  'weekly-mentoring': 'Preparei uma leitura resiliente com base no seu contexto disponível.',
  'error-diagnosis': 'Não consegui consultar a IA agora, mas mantive uma orientação segura para revisar seus erros.',
};

export function resolveAiFallbackResponse(params: {
  task: AiFallbackTask;
  errorCode?: string;
  fallbackText?: string;
}): AiFallbackResponse | null {
  const message = CRITICAL_TASK_MESSAGES[params.task];
  if (!message) return null;

  return {
    task: params.task,
    message,
    text: params.fallbackText || message,
    fallbackUsed: true,
    errorCode: params.errorCode,
  };
}
