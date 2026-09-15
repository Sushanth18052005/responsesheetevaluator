import { useState, useMemo } from 'react';
import type { QuestionResult } from '../types';

interface Props {
  questions: QuestionResult[];
}

type Filter = 'all' | 'Correct' | 'Wrong' | 'Unanswered' | 'Unclear' | 'No Key';

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'bg-slate-100 text-slate-700' },
  { key: 'Correct', label: 'Correct', color: 'bg-green-100 text-green-700' },
  { key: 'Wrong', label: 'Wrong', color: 'bg-red-100 text-red-700' },
  { key: 'Unanswered', label: 'Unanswered', color: 'bg-slate-100 text-slate-500' },
  { key: 'No Key', label: 'No Key', color: 'bg-yellow-100 text-yellow-700' },
];

const PAGE_SIZE = 25;

function resultBadge(result: string) {
  const map: Record<string, string> = {
    Correct: 'bg-green-100 text-green-700',
    Wrong: 'bg-red-100 text-red-700',
    Unanswered: 'bg-slate-100 text-slate-500',
    'No Key': 'bg-yellow-100 text-yellow-700',
    Unclear: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[result] ?? 'bg-slate-100 text-slate-700'}`}>
      {result === 'Correct' && '✓ '}
      {result === 'Wrong' && '✗ '}
      {result === 'Unanswered' && '— '}
      {result === 'Unclear' && '? '}
      {result}
    </span>
  );
}

export function QuestionTable({ questions }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = questions;
    if (filter !== 'all') list = list.filter(q => q.result === filter);
    if (search.trim()) {
      const n = parseInt(search.trim(), 10);
      if (!isNaN(n)) list = list.filter(q => q.question_number === n);
    }
    return list;
  }, [questions, filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const changeFilter = (f: Filter) => { setFilter(f); setPage(0); };

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Question-wise Analysis</h2>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : `${f.color} border-transparent hover:border-slate-300`
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({questions.filter(q => q.result === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search question #"
          className="input-field text-sm max-w-[180px]"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Q</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Section</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Key</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Response</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Result</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Marks</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(q => (
              <tr
                key={q.question_number}
                className={`border-b border-slate-100 ${
                  q.result === 'Correct' ? 'bg-green-50/40' :
                  q.result === 'Wrong' ? 'bg-red-50/40' :
                  q.result === 'Unclear' ? 'bg-amber-50/40' : ''
                }`}
              >
                <td className="py-2 px-3 font-medium text-slate-700">{q.question_number}</td>
                <td className="py-2 px-3 text-xs text-slate-400">{q.section ?? ''}</td>
                <td className="py-2 px-3 font-mono">{q.correct_answer ?? '—'}</td>
                <td className="py-2 px-3 font-mono">{q.candidate_response ?? '—'}</td>
                <td className="py-2 px-3">{resultBadge(q.result)}</td>
                <td className={`py-2 px-3 text-right font-medium ${
                  q.marks > 0 ? 'text-green-600' : q.marks < 0 ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {q.marks > 0 ? `+${q.marks}` : q.marks}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No questions match the current filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <button
              className="btn-secondary text-xs px-3 py-1"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>
            <button
              className="btn-secondary text-xs px-3 py-1"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
