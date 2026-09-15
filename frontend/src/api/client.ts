import type { ParseResponse, QuestionResponse, MarkingScheme } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Could not connect to the evaluation server. Is the backend running?',
      'CONNECTION_ERROR'
    );
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new ApiError(data?.detail || `Server error (${resp.status})`, `HTTP_${resp.status}`);
  }
  return data as T;
}

export async function parseResponseSheet(url: string): Promise<ParseResponse> {
  return post('/api/parse', { url });
}

export async function reEvaluate(
  questions: QuestionResponse[],
  markingScheme: MarkingScheme,
): Promise<{ success: boolean; result?: any; error?: string }> {
  return post('/api/evaluate', {
    questions,
    marking_scheme: markingScheme,
  });
}
