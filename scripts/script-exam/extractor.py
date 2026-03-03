"""
Core extraction logic: PDF text extraction, gabarito parsing, and Gemini AI integration.
"""
import base64
import json
import re
import time
from typing import Optional

import fitz  # PyMuPDF
from google import genai

from models import Alternative, Question
from prompts import SYSTEM_INSTRUCTION, build_extraction_prompt


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF (fitz).

    PyMuPDF preserves layout much better than other Python PDF parsers,
    which is critical for exams with complex formatting.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n".join(pages)


def parse_gabarito(pdf_bytes: bytes) -> list[str]:
    """Parse gabarito PDF and extract answer letters in order.

    Handles CEBRASPE format where numbers and letters appear in columns:
        1       E
        2       A
        3       C
        ...     ...
    PyMuPDF extracts them as: numbers block, then letters block.
    """
    text = extract_text_from_pdf(pdf_bytes)
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Strategy: collect all isolated letters (A-E or X) that appear
    # after blocks of numbers. CEBRASPE format: 20 numbers, then 20 letters, repeat.
    all_letters: list[str] = []
    i = 0
    while i < len(lines):
        num_count = 0
        j = i
        while j < len(lines) and re.match(r"^\d+$", lines[j]):
            num_count += 1
            j += 1

        if num_count >= 5:
            letters_in_block = []
            k = j
            while k < len(lines) and re.match(r"^[A-EX]$", lines[k]) and len(letters_in_block) < num_count:
                letters_in_block.append(lines[k])
                k += 1

            if len(letters_in_block) == num_count:
                all_letters.extend(letters_in_block)
                i = k
                continue

        i += 1

    # Fallback: single-line clusters
    if not all_letters:
        for line in lines:
            matches = re.findall(r"\b([A-EX])\b", line)
            if matches and len(matches) >= 5:
                all_letters.extend(matches)

    return all_letters


def build_gabarito_mapping(letters: list[str]) -> str:
    """Convert a list of answer letters into a human-readable mapping."""
    if not letters:
        return ""
    return "\n".join(
        f"Questão {i + 1}: {letter}" for i, letter in enumerate(letters)
    )


def repair_truncated_json(text: str) -> str:
    """Attempt to repair truncated JSON by closing open brackets/braces."""
    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"```\s*$", "", text.strip())

    # Find the array
    start = text.find("[")
    if start == -1:
        return "[]"

    text = text[start:]

    # Try parsing as-is
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    # Remove trailing incomplete content after last complete object
    last_close_brace = text.rfind("}")
    if last_close_brace != -1:
        text = text[:last_close_brace + 1]
        # Close the array
        text = text.rstrip().rstrip(",") + "\n]"

    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        # More aggressive: find all complete objects
        objects = []
        depth = 0
        obj_start = None
        for i, ch in enumerate(text):
            if ch == "{" and depth == 0:
                obj_start = i
                depth = 1
            elif ch == "{":
                depth += 1
            elif ch == "}" and depth == 1:
                depth = 0
                if obj_start is not None:
                    try:
                        obj = json.loads(text[obj_start:i + 1])
                        objects.append(obj)
                    except json.JSONDecodeError:
                        pass
                obj_start = None
            elif ch == "}":
                depth -= 1

        return json.dumps(objects, ensure_ascii=False)


async def _extract_batch(
    client: genai.Client,
    model: str,
    exam_pdf_b64: str,
    gabarito_pdf_b64: str | None,
    prompt: str,
) -> str:
    """Send a single extraction request to Gemini and return raw text."""
    parts = [
        {
            "inline_data": {
                "mime_type": "application/pdf",
                "data": exam_pdf_b64,
            }
        },
    ]

    if gabarito_pdf_b64:
        parts.append({
            "inline_data": {
                "mime_type": "application/pdf",
                "data": gabarito_pdf_b64,
            }
        })

    parts.append({"text": prompt})

    response = client.models.generate_content(
        model=model,
        contents=[{"role": "user", "parts": parts}],
        config={
            "temperature": 0.1,
            "max_output_tokens": 65536,
            "system_instruction": SYSTEM_INSTRUCTION,
        },
    )

    return response.text.strip() if response.text else ""


async def extract_questions_with_ai(
    exam_pdf_bytes: bytes,
    gabarito_pdf_bytes: Optional[bytes],
    exam_name: str = "",
    banca: str = "",
    year: Optional[int] = None,
    api_key: str = "",
    model: str = "gemini-2.5-flash",
    batch_size: int = 50,
) -> tuple[list[Question], dict]:
    """Full extraction pipeline with batch processing for large exams.

    Splits extraction into batches of `batch_size` questions to avoid
    Gemini's output token limit truncation.
    """
    start_time = time.time()

    # 1. Extract text from exam PDF
    exam_text = extract_text_from_pdf(exam_pdf_bytes)
    print(f"[Extractor] Exam text extracted: {len(exam_text)} chars")

    # 2. Parse gabarito if provided
    gabarito_letters: list[str] = []
    gabarito_mapping = ""
    if gabarito_pdf_bytes:
        gabarito_letters = parse_gabarito(gabarito_pdf_bytes)
        gabarito_mapping = build_gabarito_mapping(gabarito_letters)
        print(f"[Extractor] Gabarito parsed: {len(gabarito_letters)} answers")

    # 3. Determine total questions and batch ranges
    total_questions = len(gabarito_letters) if gabarito_letters else 100
    batches = []
    for start in range(0, total_questions, batch_size):
        end = min(start + batch_size, total_questions)
        batches.append((start + 1, end))  # 1-indexed

    print(f"[Extractor] Will extract in {len(batches)} batch(es): {batches}")

    # 4. Prepare base64 PDFs
    exam_b64 = base64.b64encode(exam_pdf_bytes).decode("utf-8")
    gab_b64 = base64.b64encode(gabarito_pdf_bytes).decode("utf-8") if gabarito_pdf_bytes else None

    client = genai.Client(api_key=api_key)
    all_raw_questions: list[dict] = []

    for batch_idx, (q_start, q_end) in enumerate(batches):
        # Build batch-specific gabarito
        batch_gab = ""
        if gabarito_letters:
            batch_gab = "\n".join(
                f"Questão {i + 1}: {gabarito_letters[i]}"
                for i in range(q_start - 1, min(q_end, len(gabarito_letters)))
            )

        prompt = build_extraction_prompt(
            exam_text=exam_text,
            gabarito_mapping=batch_gab or None,
            exam_name=exam_name,
            banca=banca,
            year=year,
        )

        # Add batch instruction
        if len(batches) > 1:
            prompt += f"\n\nATENÇÃO: Extraia SOMENTE as questões {q_start} a {q_end}. Ignore as demais."

        print(f"[Extractor] Batch {batch_idx + 1}/{len(batches)}: questões {q_start}-{q_end}...")

        raw_text = await _extract_batch(client, model, exam_b64, gab_b64, prompt)
        print(f"[Extractor] Batch {batch_idx + 1} response: {len(raw_text)} chars")

        # Parse JSON (with repair)
        repaired = repair_truncated_json(raw_text)
        batch_questions = json.loads(repaired)
        print(f"[Extractor] Batch {batch_idx + 1} parsed: {len(batch_questions)} questions")
        all_raw_questions.extend(batch_questions)

    elapsed_ms = int((time.time() - start_time) * 1000)
    print(f"[Extractor] Total extraction: {len(all_raw_questions)} questions in {elapsed_ms}ms")

    # 5. Validate with Pydantic and apply gabarito override
    questions: list[Question] = []
    for i, q in enumerate(all_raw_questions):
        if "number" not in q:
            q["number"] = i + 1

        # Override answer from gabarito (the definitive source)
        if gabarito_letters and i < len(gabarito_letters):
            gab_letter = gabarito_letters[i]
            q["answer"] = "?" if gab_letter == "X" else gab_letter

        alts = []
        for alt in q.get("alternatives", []):
            if isinstance(alt, dict) and "key" in alt and "text" in alt:
                alts.append(Alternative(key=alt["key"], text=alt["text"]))
        q["alternatives"] = alts

        try:
            questions.append(Question(**q))
        except Exception as e:
            print(f"[Extractor] Warning: Skipping question {i + 1}: {e}")

    metadata = {
        "model_used": model,
        "latency_ms": elapsed_ms,
        "total_extracted": len(questions),
        "gabarito_parsed": len(gabarito_letters),
        "exam_text_length": len(exam_text),
        "batches_used": len(batches),
    }

    return questions, metadata
