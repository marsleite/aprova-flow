"""
Pydantic models for the exam extraction microservice.
"""
from pydantic import BaseModel, Field
from typing import Optional


class Alternative(BaseModel):
    """A single answer alternative (A-E)."""
    key: str = Field(..., description="Letter of the alternative (A, B, C, D, E)")
    text: str = Field(..., description="Full text of the alternative")


class Question(BaseModel):
    """A fully extracted exam question."""
    number: int = Field(..., description="Question number in the exam")
    statement: str = Field(..., description="Full question statement/enunciado")
    alternatives: list[Alternative] = Field(..., description="List of alternatives")
    answer: str = Field("?", description="Correct answer letter (A-E) or '?' if unknown")
    materia: str = Field("Não identificada", description="Subject/discipline")
    subtema: str = Field("Geral", description="Specific topic within the subject")
    difficulty: str = Field("médio", description="Difficulty level")


class ExtractionRequest(BaseModel):
    """Request metadata for extraction."""
    exam_name: str = Field("", description="Name of the exam")
    banca: str = Field("", description="Exam board (e.g., CEBRASPE)")
    year: Optional[int] = Field(None, description="Exam year")


class ExtractionResponse(BaseModel):
    """Full response from the extraction service."""
    questions: list[Question] = Field(default_factory=list)
    total_extracted: int = Field(0)
    gabarito_parsed: int = Field(0, description="Number of answers parsed from gabarito")
    model_used: str = Field("")
    latency_ms: int = Field(0)
