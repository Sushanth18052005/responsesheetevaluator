import { useState, useMemo, useRef } from 'react'
import type { QuestionResult, EvaluationResult, CDNResponse, SectionSummary } from '../types'

interface Props {
  result: EvaluationResult
  sheet: CDNResponse
}

type StatusFilter = 'all' | 'Correct' | 'Wrong' | 'Unanswered' | 'Bonus'

const STATUS_FILTERS: { key: StatusFilter; label: string; icon: string; bg: string; activeBg: string }[] = [
  { key: 'all', label: 'All', icon: '', bg: 'bg-slate-100 text-slate-700', activeBg: 'bg-slate-700 text-white' },
  { key: 'Correct', label: 'Correct', icon: '✓', bg: 'bg-green-100 text-green-700', activeBg: 'bg-green-600 text-white' },
  { key: 'Wrong', label: 'Wrong', icon: '✗', bg: 'bg-red-100 text-red-700', activeBg: 'bg-red-600 text-white' },
  { key: 'Unanswered', label: 'Skipped', icon: '—', bg: 'bg-slate-100 text-slate-500', activeBg: 'bg-slate-500 text-white' },
  { key: 'Bonus', label: 'Bonus', icon: '★', bg: 'bg-amber-100 text-amber-700', activeBg: 'bg-amber-500 text-white' },
]

function getQuestionColor(result: string): string {
  switch (result) {
    case 'Correct': return 'bg-green-500 text-white hover:bg-green-600 ring-green-300'
    case 'Wrong': return 'bg-red-500 text-white hover:bg-red-600 ring-red-300'
    case 'Unanswered': return 'bg-slate-300 text-slate-700 hover:bg-slate-400 ring-slate-200'
    case 'No Key': return 'bg-amber-400 text-white hover:bg-amber-500 ring-amber-200'
    case 'Unclear': return 'bg-orange-400 text-white hover:bg-orange-500 ring-orange-200'
    default: return 'bg-slate-200 text-slate-600 hover:bg-slate-300 ring-slate-200'
  }
}

function getQuestionIcon(result: string): string {
  switch (result) {
    case 'Correct': return '✓'
    case 'Wrong': return '✗'
    case 'Unanswered': return '—'
    case 'No Key': return '★'
    default: return '?'
  }
}

function SectionStatBar({ section }: { section: SectionSummary }) {
  const total = section.total || 1
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600 truncate">{section.section}</span>
        <span className="text-xs text-slate-500 ml-2 shrink-0">{section.correct}/{section.total}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${(section.correct / total) * 100}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-500"
          style={{ width: `${(section.wrong / total) * 100}%` }}
        />
        <div
          className="h-full bg-slate-300 transition-all duration-500"
          style={{ width: `${(section.unanswered / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

function OptionLabel({ num }: { num: string }) {
  const labels: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' }
  return <span className="font-bold text-slate-600">{labels[num] || num}.</span>
}

function QuestionDetail({ q, onClose }: { q: QuestionResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 animate-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✗
        </button>

        <div className="text-center mb-5">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-bold mb-2 ${
            q.result === 'Correct' ? 'bg-green-100 text-green-600' :
            q.result === 'Wrong' ? 'bg-red-100 text-red-600' :
            'bg-slate-100 text-slate-500'
          }`}>
            {q.question_number}
          </div>
          <p className="text-sm text-slate-500">
            Question {q.question_number}{q.section ? ` • ${q.section}` : ''}
          </p>
        </div>

        {/* Question text */}
        {q.question_html && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div
              className="text-sm text-slate-700 leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:inline"
              dangerouslySetInnerHTML={{ __html: q.question_html }}
            />
          </div>
        )}

        {/* Answer options */}
        {q.options && Object.keys(q.options).length > 0 && (
          <div className="mb-4 space-y-2">
            {Object.entries(q.options)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([num, html]) => {
                const isCorrect = num === q.correct_answer
                const isChosen = num === q.candidate_response
                let borderClass = 'border-slate-200 bg-white'
                if (isCorrect && isChosen) borderClass = 'border-green-400 bg-green-50'
                else if (isCorrect) borderClass = 'border-green-400 bg-green-50'
                else if (isChosen) borderClass = 'border-red-400 bg-red-50'
                return (
                  <div key={num} className={`flex items-start gap-2 p-2.5 rounded-lg border ${borderClass}`}>
                    <div className="shrink-0 mt-0.5">
                      <OptionLabel num={num} />
                    </div>
                    <div
                      className="flex-1 text-sm text-slate-700 [&_img]:max-w-full [&_img]:h-auto [&_img]:inline overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                    <div className="shrink-0 flex gap-1">
                      {isCorrect && <span className="text-green-600 text-xs font-bold px-1.5 py-0.5 bg-green-100 rounded">Key</span>}
                      {isChosen && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isCorrect ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>Yours</span>}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
            <span className="text-sm text-slate-500">Correct Answer</span>
            <span className="text-sm font-bold text-slate-800 font-mono">{q.correct_answer ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
            <span className="text-sm text-slate-500">Your Answer</span>
            <span className={`text-sm font-bold font-mono ${
              q.result === 'Correct' ? 'text-green-600' :
              q.result === 'Wrong' ? 'text-red-600' :
              'text-slate-400'
            }`}>{q.candidate_response ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
            <span className="text-sm text-slate-500">Result</span>
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${
              q.result === 'Correct' ? 'text-green-600' :
              q.result === 'Wrong' ? 'text-red-600' :
              'text-slate-500'
            }`}>
              <span>{getQuestionIcon(q.result)}</span>
              {q.result}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
            <span className="text-sm text-slate-500">Marks</span>
            <span className={`text-sm font-bold ${
              q.marks > 0 ? 'text-green-600' : q.marks < 0 ? 'text-red-600' : 'text-slate-400'
            }`}>{q.marks > 0 ? `+${q.marks}` : q.marks}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PaperReview({ result, sheet }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [selectedQ, setSelectedQ] = useState<QuestionResult | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const sections = result.section_summaries
  const s = result.summary

  const filtered = useMemo(() => {
    let list = result.questions
    if (statusFilter === 'Bonus') {
      list = list.filter(q => q.result === 'No Key')
    } else if (statusFilter !== 'all') {
      list = list.filter(q => q.result === statusFilter)
    }
    if (sectionFilter !== 'all') {
      list = list.filter(q => q.section === sectionFilter)
    }
    return list
  }, [result.questions, statusFilter, sectionFilter])

  const counts = useMemo(() => ({
    all: result.questions.length,
    Correct: s.correct,
    Wrong: s.wrong,
    Unanswered: s.unanswered,
    Bonus: result.questions.filter(q => q.result === 'No Key').length,
  }), [result.questions, s])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div ref={printRef} className="space-y-5 print-review">
        {/* Score Header */}
        <div className="card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-1">
                <h2 className="text-lg font-bold text-slate-800">Paper Review</h2>
                {sheet.exam_name && (
                  <span className="text-sm text-slate-500">{sheet.exam_name}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {sheet.candidate_name && <span>{sheet.candidate_name}</span>}
                {sheet.candidate_id && <span>ID: {sheet.candidate_id}</span>}
                {sheet.subject && <span>{sheet.subject}</span>}
                {sheet.exam_date && <span>{sheet.exam_date}</span>}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700">{s.score}<span className="text-sm text-slate-400">/{s.maximum_score}</span></div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  s.percentage >= 60 ? 'text-green-600' : s.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>{s.percentage.toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Percentage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{s.accuracy.toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {s.correct} Correct
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {s.wrong} Wrong
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              {s.unanswered} Skipped
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {s.total_questions} Total
            </span>
          </div>

          {/* Section bars */}
          {sections.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4">
              {sections.map(sec => (
                <SectionStatBar key={sec.section} section={sec} />
              ))}
            </div>
          )}
        </div>

        {/* Filters + Print */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5 flex-1">
              {STATUS_FILTERS.map(f => {
                if (f.key === 'Bonus' && counts.Bonus === 0) return null
                return (
                  <button
                    key={f.key}
                    onClick={() => { setStatusFilter(f.key); }}
                    className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all ${
                      statusFilter === f.key ? f.activeBg : f.bg
                    }`}
                  >
                    {f.icon && <span className="mr-1">{f.icon}</span>}
                    {f.label}
                    <span className="ml-1 opacity-80">({counts[f.key]})</span>
                  </button>
                )
              })}
            </div>

            {/* Section filter */}
            {sections.length > 1 && (
              <select
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
                className="input-field text-sm py-1.5 max-w-[220px]"
              >
                <option value="all">All Sections</option>
                {sections.map(sec => (
                  <option key={sec.section} value={sec.section}>{sec.section}</option>
                ))}
              </select>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="btn-secondary text-sm flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        {/* Question Grid */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              {statusFilter === 'all' && sectionFilter === 'all'
                ? `All Questions (${filtered.length})`
                : `Filtered: ${filtered.length} question${filtered.length !== 1 ? 's' : ''}`}
            </h3>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Correct</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Wrong</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300" /> Skipped</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No questions match the current filters.</p>
          ) : (
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
              {filtered.map(q => (
                <button
                  key={q.question_number}
                  onClick={() => setSelectedQ(q)}
                  className={`relative w-full aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all hover:scale-105 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 ${getQuestionColor(q.result)}`}
                  title={`Q${q.question_number}: ${q.result} | Key: ${q.correct_answer ?? '-'} | Ans: ${q.candidate_response ?? '-'}`}
                >
                  <span className="text-[0.65rem] leading-none opacity-70 absolute top-0.5">{getQuestionIcon(q.result)}</span>
                  <span>{q.question_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Question List (for print & detailed view) */}
        <div className="card p-5 print-only-detail">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Detailed Question List</h3>
          <div className="divide-y divide-slate-100">
            {filtered.map(q => (
              <div
                key={q.question_number}
                className={`py-3 px-2 rounded ${
                  q.result === 'Correct' ? 'hover:bg-green-50' :
                  q.result === 'Wrong' ? 'hover:bg-red-50' :
                  'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    q.result === 'Correct' ? 'bg-green-100 text-green-700' :
                    q.result === 'Wrong' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {q.question_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Key:</span>
                      <span className="font-mono font-semibold text-slate-800">{q.correct_answer ?? '—'}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">Ans:</span>
                      <span className={`font-mono font-semibold ${
                        q.result === 'Correct' ? 'text-green-600' :
                        q.result === 'Wrong' ? 'text-red-600' :
                        'text-slate-400'
                      }`}>{q.candidate_response ?? '—'}</span>
                    </div>
                    {q.section && <span className="text-xs text-slate-400">{q.section}</span>}
                  </div>
                  <div className={`text-lg font-bold shrink-0 ${
                    q.result === 'Correct' ? 'text-green-500' :
                    q.result === 'Wrong' ? 'text-red-500' :
                    'text-slate-300'
                  }`}>
                    {getQuestionIcon(q.result)}
                  </div>
                  <div className={`text-sm font-bold w-10 text-right shrink-0 ${
                    q.marks > 0 ? 'text-green-600' : q.marks < 0 ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {q.marks > 0 ? `+${q.marks}` : q.marks}
                  </div>
                </div>
                {q.question_html && (
                  <div className="mt-2 ml-12 p-2 bg-slate-50 rounded text-xs text-slate-600 [&_img]:max-w-full [&_img]:h-auto [&_img]:inline" dangerouslySetInnerHTML={{ __html: q.question_html }} />
                )}
                {q.options && Object.keys(q.options).length > 0 && (
                  <div className="mt-1 ml-12 space-y-1">
                    {Object.entries(q.options)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([num, html]) => {
                        const isCorrect = num === q.correct_answer
                        const isChosen = num === q.candidate_response
                        const labels: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' }
                        return (
                          <div key={num} className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                            isCorrect ? 'bg-green-50 border border-green-300' :
                            isChosen ? 'bg-red-50 border border-red-300' :
                            'bg-white'
                          }`}>
                            <span className="font-bold text-slate-500 shrink-0">{labels[num] || num}.</span>
                            <span className="text-slate-600 [&_img]:max-w-full [&_img]:h-auto [&_img]:inline overflow-hidden" dangerouslySetInnerHTML={{ __html: html }} />
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question detail modal */}
      {selectedQ && <QuestionDetail q={selectedQ} onClose={() => setSelectedQ(null)} />}

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-review, .print-review * { visibility: visible !important; }
          .print-review {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .print-review .card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            break-inside: avoid;
          }
          .print-review button { display: none !important; }
          .print-review select { display: none !important; }
          .print-only-detail { display: block !important; }
          @page { margin: 1cm; }
        }
        @media screen {
          .print-only-detail { display: block; }
        }
        .animate-in {
          animation: scaleIn 0.15s ease-out;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
