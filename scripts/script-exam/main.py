"""
FastAPI microservice for exam question extraction.

Usage:
    cd scripts/script-exam
    python -m venv venv && source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env  # Edit with your GEMINI_API_KEY
    uvicorn main:app --reload --port 8000
"""
import os
import json
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from extractor import extract_questions_with_ai
from models import ExtractionResponse

load_dotenv()

app = FastAPI(
    title="AprovaMind - Extrator de Provas",
    description="Microserviço Python para extração inteligente de questões de provas de concursos",
    version="1.0.0",
)

# Allow Next.js frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "script-exam"}


@app.post("/extract", response_model=ExtractionResponse)
async def extract_questions(
    exam: UploadFile = File(..., description="PDF da prova"),
    gabarito: Optional[UploadFile] = File(None, description="PDF do gabarito (opcional)"),
    exam_name: str = Form("", description="Nome da prova"),
    banca: str = Form("", description="Banca examinadora"),
    year: Optional[int] = Form(None, description="Ano da prova"),
):
    """Extract all questions from an exam PDF with matéria/subtema classification.

    Accepts:
    - **exam**: PDF file of the exam (required)
    - **gabarito**: PDF file of the official answer key (optional)
    - **exam_name, banca, year**: metadata for context

    Returns structured JSON with all questions, alternatives, answers, matéria and subtema.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

    # Validate exam file
    if not exam.content_type or "pdf" not in exam.content_type:
        raise HTTPException(status_code=400, detail="O arquivo da prova deve ser um PDF")

    exam_bytes = await exam.read()

    # Read gabarito if provided
    gabarito_bytes = None
    if gabarito and gabarito.content_type and "pdf" in gabarito.content_type:
        gabarito_bytes = await gabarito.read()

    try:
        questions, metadata = await extract_questions_with_ai(
            exam_pdf_bytes=exam_bytes,
            gabarito_pdf_bytes=gabarito_bytes,
            exam_name=exam_name,
            banca=banca,
            year=year,
            api_key=api_key,
        )

        return ExtractionResponse(
            questions=questions,
            total_extracted=metadata["total_extracted"],
            gabarito_parsed=metadata["gabarito_parsed"],
            model_used=metadata["model_used"],
            latency_ms=metadata["latency_ms"],
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=422,
            detail=f"A IA retornou um formato inválido de JSON: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na extração: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
