#!/usr/bin/env python3
"""
Script para parsear PDF de prova + gabarito e gerar JSON para importação.

Uso:
    python scripts/parse_exam_pdf.py \
        --prova ./data/prova.pdf \
        --gabarito ./data/gabarito.pdf \
        --output ./data/prova.json \
        --nome "TJBA Juiz 2026" \
        --banca "FCC" \
        --ano 2026 \
        --duracao 240

Dependências:
    pip install pdfplumber pytesseract pillow
"""

import argparse
import json
import re
import sys
from typing import List, Dict, Optional
import pdfplumber


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extrai todo o texto do PDF."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
                text += "\n\n"
    except Exception as e:
        print(f"Erro ao ler PDF {pdf_path}: {e}", file=sys.stderr)
        sys.exit(1)
    return text


def parse_questions(text: str) -> List[Dict]:
    """
    Parseia questões do texto usando heurísticas.
    
    Padrão esperado:
    QUESTÃO 1
    Enunciado da questão...
    A) Alternativa A
    B) Alternativa B
    C) Alternativa C
    D) Alternativa D
    E) Alternativa E
    """
    questions = []
    
    # Regex para identificar início de questão (flexível: "QUESTÃO 1", "1.", "01)")
    question_pattern = re.compile(r'^(?:QUESTÃO\s+)?(\d+)[.)\s]', re.MULTILINE | re.IGNORECASE)
    
    # Divide texto em blocos por questão
    matches = list(question_pattern.finditer(text))
    
    for i, match in enumerate(matches):
        question_num = int(match.group(1))
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        
        # Extrai alternativas (A) texto, B) texto, etc.)
        alt_pattern = re.compile(r'^([A-E])\)\s*(.+?)(?=\n[A-E]\)|$)', re.MULTILINE | re.DOTALL)
        alternatives_matches = list(alt_pattern.finditer(block))
        
        if not alternatives_matches:
            print(f"⚠️  Questão {question_num}: não encontrei alternativas, pulando.", file=sys.stderr)
            continue
        
        # Enunciado é tudo antes da primeira alternativa
        first_alt_pos = alternatives_matches[0].start()
        statement = block[:first_alt_pos].strip()
        
        alternatives = []
        for alt_match in alternatives_matches:
            key = alt_match.group(1)
            text_alt = alt_match.group(2).strip()
            alternatives.append({"key": key, "text": text_alt})
        
        questions.append({
            "number": question_num,
            "statement": statement,
            "alternatives": alternatives,
            "answer": None,  # Preenchido depois com gabarito
            "materia": "Geral",  # Pode ser refinado manualmente ou por IA depois
            "subtema": None,
            "explanation": None,
        })
    
    return questions


def parse_gabarito(text: str) -> Dict[int, str]:
    """
    Parseia gabarito do texto.
    
    Padrão esperado:
    1. C
    2. A
    3. B
    ou
    QUESTÃO 1: C
    QUESTÃO 2: A
    """
    gabarito = {}
    
    # Tenta vários padrões
    patterns = [
        re.compile(r'^(?:QUESTÃO\s+)?(\d+)[.:\s]+([A-E])', re.MULTILINE | re.IGNORECASE),
        re.compile(r'^(\d+)\s*[–-]\s*([A-E])', re.MULTILINE),
    ]
    
    for pattern in patterns:
        matches = pattern.findall(text)
        if matches:
            for num_str, answer in matches:
                gabarito[int(num_str)] = answer.upper()
            break
    
    if not gabarito:
        print("⚠️  Não consegui parsear o gabarito automaticamente.", file=sys.stderr)
    
    return gabarito


def merge_questions_with_gabarito(questions: List[Dict], gabarito: Dict[int, str]) -> List[Dict]:
    """Adiciona gabarito às questões."""
    for q in questions:
        num = q["number"]
        if num in gabarito:
            q["answer"] = gabarito[num]
        else:
            print(f"⚠️  Questão {num}: gabarito não encontrado.", file=sys.stderr)
    return questions


def generate_json(
    questions: List[Dict],
    exam_name: str,
    banca: Optional[str],
    year: Optional[int],
    duration_minutes: Optional[int],
    plan_id: Optional[str],
) -> Dict:
    """Gera JSON no formato esperado pelo import_exam.ts"""
    
    # Remove campo "number" e garante estrutura final
    final_questions = []
    for q in questions:
        if not q.get("answer"):
            print(f"⚠️  Questão {q['number']}: sem gabarito, pulando.", file=sys.stderr)
            continue
        
        final_questions.append({
            "statement": q["statement"],
            "alternatives": q["alternatives"],
            "answer": q["answer"],
            "materia": q.get("materia", "Geral"),
            "subtema": q.get("subtema"),
            "banca": banca,
            "year": year,
            "difficulty": "médio",  # Pode ser ajustado manualmente
            "tags": [],
            "explanation": q.get("explanation"),
        })
    
    return {
        "exam": {
            "name": exam_name,
            "planId": plan_id,
            "banca": banca,
            "year": year,
            "durationMinutes": duration_minutes,
        },
        "questions": final_questions,
    }


def main():
    parser = argparse.ArgumentParser(description="Parseia PDF de prova e gabarito para JSON.")
    parser.add_argument("--prova", required=True, help="Caminho do PDF da prova")
    parser.add_argument("--gabarito", required=True, help="Caminho do PDF do gabarito")
    parser.add_argument("--output", required=True, help="Caminho de saída do JSON")
    parser.add_argument("--nome", required=True, help="Nome da prova (ex: TJBA Juiz 2026)")
    parser.add_argument("--banca", help="Banca organizadora (ex: FCC)")
    parser.add_argument("--ano", type=int, help="Ano da prova")
    parser.add_argument("--duracao", type=int, help="Duração em minutos")
    parser.add_argument("--plan-id", help="ID do plano no Firestore (opcional)")
    
    args = parser.parse_args()
    
    print(f"📄 Lendo prova: {args.prova}")
    prova_text = extract_text_from_pdf(args.prova)
    
    print(f"📝 Lendo gabarito: {args.gabarito}")
    gabarito_text = extract_text_from_pdf(args.gabarito)
    
    print("🔍 Parseando questões...")
    questions = parse_questions(prova_text)
    print(f"✓ Encontradas {len(questions)} questões")
    
    print("🔍 Parseando gabarito...")
    gabarito = parse_gabarito(gabarito_text)
    print(f"✓ Gabarito com {len(gabarito)} respostas")
    
    print("🔗 Mesclando questões com gabarito...")
    questions = merge_questions_with_gabarito(questions, gabarito)
    
    print("📦 Gerando JSON...")
    output_data = generate_json(
        questions,
        args.nome,
        args.banca,
        args.ano,
        args.duracao,
        args.plan_id,
    )
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON salvo em: {args.output}")
    print(f"📊 Total de questões válidas: {len(output_data['questions'])}")


if __name__ == "__main__":
    main()
