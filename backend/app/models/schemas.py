"""Pydantic models for CDN response sheet evaluator."""

from typing import Optional
from pydantic import BaseModel, Field


class QuestionResponse(BaseModel):
    question_number: int
    question_id: Optional[str] = None
    correct_answer: Optional[str] = None   # from tick.png icon: "1","2","3","4"
    chosen_option: Optional[str] = None    # from "Chosen Option : X" text
    section: Optional[str] = None
    question_html: Optional[str] = None    # inner HTML of question content cell
    options: Optional[dict[str, str]] = None  # option number -> inner HTML


class CDNResponse(BaseModel):
    cdn_id: str
    candidate_name: Optional[str] = None
    candidate_id: Optional[str] = None
    exam_name: Optional[str] = None
    exam_date: Optional[str] = None
    subject: Optional[str] = None
    base_url: Optional[str] = None
    sections: list[str] = Field(default_factory=list)
    questions: list[QuestionResponse] = Field(default_factory=list)
    parser_warnings: list[str] = Field(default_factory=list)
    parsed_questions: int = 0
    detected_answers: int = 0
    unanswered: int = 0


class MarkingScheme(BaseModel):
    correct: float = 1.0
    wrong: float = 0.0
    unanswered: float = 0.0


class QuestionResult(BaseModel):
    question_number: int
    question_id: Optional[str] = None
    section: Optional[str] = None
    correct_answer: Optional[str] = None
    candidate_response: Optional[str] = None
    result: str     # Correct, Wrong, Unanswered, Unclear, No Key
    marks: float
    question_html: Optional[str] = None
    options: Optional[dict[str, str]] = None


class EvaluationSummary(BaseModel):
    total_questions: int
    attempted: int
    correct: int
    wrong: int
    unanswered: int
    unclear: int = 0
    no_key: int = 0
    score: float
    maximum_score: float
    percentage: float
    accuracy: float


class SectionSummary(BaseModel):
    section: str
    total: int
    correct: int
    wrong: int
    unanswered: int
    score: float
    percentage: float


class EvaluationResult(BaseModel):
    summary: EvaluationSummary
    section_summaries: list[SectionSummary] = Field(default_factory=list)
    questions: list[QuestionResult] = Field(default_factory=list)


class ParseRequest(BaseModel):
    url: str


class ParseResponse(BaseModel):
    success: bool
    response_sheet: Optional[CDNResponse] = None
    evaluation: Optional[EvaluationResult] = None
    error: Optional[str] = None


class TgtetRequest(BaseModel):
    journal_number: str
    hallticket_number: str
    dob: str
    paper: str
