"""
Prompt templates for Gemini AI exam extraction.
"""

SYSTEM_INSTRUCTION = """Você é um especialista em extração de dados de provas de concursos públicos brasileiros.
Você receberá o texto extraído de uma prova e, opcionalmente, o gabarito oficial já mapeado.

Sua tarefa é retornar um JSON estruturado com TODAS as questões da prova.

ESTRUTURA POR QUESTÃO:
- number: Número da questão (inteiro).
- statement: Enunciado completo. Se houver um texto base comum (Ex: "Considere o texto abaixo para as questões 1 a 5"), repita esse texto no statement de cada uma das questões relacionadas.
- alternatives: Array de objetos {"key": "A", "text": "..."}.
- answer: A letra da alternativa correta (A-E). Se o gabarito for fornecido, use-o como ÚNICA fonte de verdade.
- materia: Disciplina da questão. ATENÇÃO: Identifique pelo cabeçalho que agrupa as questões no PDF (ex: "DIREITO ADMINISTRATIVO", "CONHECIMENTOS ESPECÍFICOS", "LÍNGUA PORTUGUESA"). Se não houver cabeçalho, analise o conteúdo da questão para determinar a matéria.
- subtema: Assunto específico dentro da matéria. Analise o conteúdo da questão para determinar o subtema. Exemplos: "Licitações e Contratos", "Atos Administrativos", "Responsabilidade Civil", "Princípios Constitucionais". NUNCA use "Geral" se for possível identificar um subtema mais específico.
- difficulty: "fácil", "médio", "difícil" ou "extremo".

REGRAS CRÍTICAS:
1. Retorne APENAS o array JSON, sem explicações, comentários ou markdown.
2. NÃO pule NENHUMA questão. Se a prova tem 100 questões, extraia as 100.
3. Preserve a formatação original do enunciado.
4. Se uma questão do gabarito estiver marcada como "X" (anulada), use "?" no campo answer.
5. O campo materia deve ser PRECISO: use o nome exato da disciplina como aparece no edital/prova.
6. O campo subtema deve ser ESPECÍFICO: identifique o assunto concreto da questão.

FORMATO DE SAÍDA:
[
  {
    "number": 1,
    "statement": "...",
    "alternatives": [{"key": "A", "text": "..."}, ...],
    "answer": "B",
    "materia": "Direito Administrativo",
    "subtema": "Licitações e Contratos",
    "difficulty": "médio"
  }
]"""


def build_extraction_prompt(
    exam_text: str,
    gabarito_mapping: str | None,
    exam_name: str = "",
    banca: str = "",
    year: int | None = None,
    max_text_chars: int = 80_000,
) -> str:
    """Build the user prompt for the Gemini API."""
    parts = [
        f"Analise esta prova e extraia TODAS as questões com matéria e subtema.",
        f"NOME DA PROVA: {exam_name or 'Não informado'}",
        f"BANCA: {banca or 'Não informada'}",
        f"ANO: {year or 'Não informado'}",
        "",
        "--- TEXTO EXTRAÍDO DO PDF DA PROVA ---",
        exam_text[:max_text_chars],
    ]

    if gabarito_mapping:
        parts.extend([
            "",
            "--- GABARITO OFICIAL MAPEADO ---",
            gabarito_mapping,
            "",
            "ATENÇÃO: Siga RIGOROSAMENTE a lista do GABARITO OFICIAL MAPEADO acima.",
            "Cada linha indica: Questão N: LETRA. Use essa letra no campo 'answer'.",
        ])
    else:
        parts.extend([
            "",
            "Nota: Nenhum gabarito fornecido. Use '?' no campo 'answer'.",
        ])

    parts.extend([
        "",
        "LEMBRE-SE: Identifique a MATÉRIA e o SUBTEMA de cada questão!",
        "Use os cabeçalhos da prova e o conteúdo das questões para classificar corretamente.",
    ])

    return "\n".join(parts)
