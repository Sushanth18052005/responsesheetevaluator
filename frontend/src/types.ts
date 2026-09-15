export interface QuestionResponse {
  question_number: number;
  question_id?: string | null;
  correct_answer?: string | null;
  chosen_option?: string | null;
  section?: string | null;
  question_html?: string | null;
  options?: Record<string, string> | null;
}

export interface CDNResponse {
  cdn_id: string;
  candidate_name?: string | null;
  candidate_id?: string | null;
  exam_name?: string | null;
  exam_date?: string | null;
  subject?: string | null;
  base_url?: string | null;
  sections: string[];
  questions: QuestionResponse[];
  parser_warnings: string[];
  parsed_questions: number;
  detected_answers: number;
  unanswered: number;
}

export interface MarkingScheme {
  correct: number;
  wrong: number;
  unanswered: number;
}

export interface QuestionResult {
  question_number: number;
  question_id?: string | null;
  section?: string | null;
  correct_answer?: string | null;
  candidate_response?: string | null;
  result: 'Correct' | 'Wrong' | 'Unanswered' | 'Not in Key' | 'Unclear' | 'No Key';
  marks: number;
  question_html?: string | null;
  options?: Record<string, string> | null;
}

export interface EvaluationSummary {
  total_questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  unclear: number;
  no_key: number;
  score: number;
  maximum_score: number;
  percentage: number;
  accuracy: number;
}

export interface SectionSummary {
  section: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  percentage: number;
}

export interface EvaluationResult {
  summary: EvaluationSummary;
  section_summaries: SectionSummary[];
  questions: QuestionResult[];
}

export interface ParseResponse {
  success: boolean;
  response_sheet?: CDNResponse | null;
  evaluation?: EvaluationResult | null;
  error?: string | null;
}

export type LoadingStage =
  | 'idle'
  | 'validating'
  | 'fetching'
  | 'parsing'
  | 'evaluating'
  | 'done'
  | 'error';
