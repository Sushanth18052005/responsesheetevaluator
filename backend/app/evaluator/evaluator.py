"""Deterministic evaluation engine.

Compares correct_answer (from tick.png) with chosen_option (candidate response)
for each question. No external answer key needed.
"""

from ..models.schemas import (
    QuestionResponse, MarkingScheme, QuestionResult,
    EvaluationSummary, EvaluationResult, SectionSummary,
)


def evaluate(
    questions: list[QuestionResponse],
    marking_scheme: MarkingScheme,
) -> EvaluationResult:
    question_results: list[QuestionResult] = []
    attempted = 0
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    unclear_count = 0
    no_key_count = 0
    score = 0.0

    for q in sorted(questions, key=lambda r: r.question_number):
        correct = q.correct_answer
        chosen = q.chosen_option

        if correct is None:
            result_label = "No Key"
            marks = 0.0
            no_key_count += 1
        elif chosen is None or chosen == "" or chosen == "--":
            result_label = "Unanswered"
            marks = marking_scheme.unanswered
            unanswered_count += 1
            score += marks
        elif chosen == "UNCLEAR":
            result_label = "Unclear"
            marks = 0.0
            unclear_count += 1
        elif str(chosen).strip() == str(correct).strip():
            result_label = "Correct"
            marks = marking_scheme.correct
            correct_count += 1
            attempted += 1
            score += marks
        else:
            result_label = "Wrong"
            marks = marking_scheme.wrong
            wrong_count += 1
            attempted += 1
            score += marks

        question_results.append(QuestionResult(
            question_number=q.question_number,
            question_id=q.question_id,
            section=q.section,
            correct_answer=correct,
            candidate_response=chosen,
            result=result_label,
            marks=marks,
            question_html=q.question_html,
            options=q.options,
        ))

    question_results.sort(key=lambda r: r.question_number)

    total_questions = len(question_results)
    keyed_questions = total_questions - no_key_count
    maximum_score = marking_scheme.correct * keyed_questions if keyed_questions > 0 else float(total_questions)
    percentage = (score / maximum_score * 100) if maximum_score > 0 else 0.0
    accuracy = (correct_count / attempted * 100) if attempted > 0 else 0.0
    percentage = max(0.0, percentage)

    summary = EvaluationSummary(
        total_questions=total_questions,
        attempted=attempted,
        correct=correct_count,
        wrong=wrong_count,
        unanswered=unanswered_count,
        unclear=unclear_count,
        no_key=no_key_count,
        score=round(score, 2),
        maximum_score=round(maximum_score, 2),
        percentage=round(percentage, 2),
        accuracy=round(accuracy, 2),
    )

    # Section-wise summaries
    section_map: dict[str, list[QuestionResult]] = {}
    for qr in question_results:
        sec = qr.section or "General"
        section_map.setdefault(sec, []).append(qr)

    section_summaries = []
    for sec_name, sec_questions in section_map.items():
        sec_correct = sum(1 for q in sec_questions if q.result == "Correct")
        sec_wrong = sum(1 for q in sec_questions if q.result == "Wrong")
        sec_unanswered = sum(1 for q in sec_questions if q.result == "Unanswered")
        sec_score = sum(q.marks for q in sec_questions)
        sec_total = len(sec_questions)
        sec_max = marking_scheme.correct * sec_total
        sec_pct = (sec_score / sec_max * 100) if sec_max > 0 else 0.0
        section_summaries.append(SectionSummary(
            section=sec_name,
            total=sec_total,
            correct=sec_correct,
            wrong=sec_wrong,
            unanswered=sec_unanswered,
            score=round(sec_score, 2),
            percentage=round(max(0, sec_pct), 2),
        ))

    return EvaluationResult(
        summary=summary,
        section_summaries=section_summaries,
        questions=question_results,
    )
