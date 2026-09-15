import { useState, useCallback } from 'react'
import type {
  CDNResponse, MarkingScheme, EvaluationResult, LoadingStage,
} from '../types'
import { parseResponseSheet, reEvaluate } from '../api/client'
import { UrlInput } from '../components/UrlInput'
import { TgtetForm } from '../components/TgtetForm'
import { CandidateInfo } from '../components/CandidateInfo'
import { MarkingSchemeInput } from '../components/MarkingScheme'
import { EvaluationSummaryCards } from '../components/EvaluationSummary'
import { SectionBreakdown } from '../components/SectionBreakdown'
import { QuestionTable } from '../components/QuestionTable'
import { PaperReview } from '../components/PaperReview'
import { ErrorMessage } from '../components/ErrorMessage'
import { exportCSV, exportPDF } from '../utils/export'

type InputMode = 'url' | 'tgtet'
type ResultView = 'summary' | 'review'

export function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('tgtet')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<CDNResponse | null>(null)
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null)
  const [marking, setMarking] = useState<MarkingScheme>({ correct: 1, wrong: 0, unanswered: 0 })
  const [reEvalLoading, setReEvalLoading] = useState(false)
  const [resultView, setResultView] = useState<ResultView>('summary')

  const fetchSheet = useCallback(async (url: string) => {
    setLoading(true)
    setError(null)
    setSheet(null)
    setEvalResult(null)
    setLoadingStage('fetching')

    try {
      const resp = await parseResponseSheet(url)
      if (!resp.success || !resp.response_sheet) {
        setError(resp.error || 'Failed to parse response sheet.')
        setLoadingStage('error')
        return
      }
      setLoadingStage('done')
      setSheet(resp.response_sheet)
      if (resp.evaluation) {
        setEvalResult(resp.evaluation)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setLoadingStage('error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTgtetUrl = useCallback((url: string) => {
    fetchSheet(url)
  }, [fetchSheet])

  const handleReEvaluate = useCallback(async (newScheme: MarkingScheme) => {
    if (!sheet) return
    setMarking(newScheme)
    setReEvalLoading(true)
    try {
      const resp = await reEvaluate(sheet.questions, newScheme)
      if (resp.success && resp.result) {
        setEvalResult(resp.result)
      }
    } catch (e: unknown) {
      console.error('Re-evaluation failed:', e)
    } finally {
      setReEvalLoading(false)
    }
  }, [sheet])

  return (
    <div className="space-y-6">
      {/* Input mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('tgtet')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            inputMode === 'tgtet'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:border-blue-400'
          }`}
        >
          TGTET Lookup
        </button>
        <button
          onClick={() => setInputMode('url')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            inputMode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:border-blue-400'
          }`}
        >
          Direct CDN URL
        </button>
      </div>

      {/* Error display */}
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Input section */}
      {inputMode === 'tgtet' ? (
        <TgtetForm onCdnUrl={handleTgtetUrl} loading={loading} />
      ) : (
        <UrlInput
          onFetch={fetchSheet}
          loading={loading}
          loadingStage={loadingStage}
        />
      )}

      {/* Candidate info */}
      {sheet && <CandidateInfo sheet={sheet} />}

      {/* Results */}
      {evalResult && sheet && (
        <>
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
              <button
                onClick={() => setResultView('summary')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                  resultView === 'summary'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setResultView('review')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                  resultView === 'review'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Paper Review
              </button>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportCSV(evalResult.questions, evalResult.summary, evalResult.section_summaries)}
                className="btn-secondary text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportPDF(evalResult, sheet)}
                className="btn-primary text-sm"
              >
                Download Scorecard
              </button>
            </div>
          </div>

          {resultView === 'summary' ? (
            <>
              <EvaluationSummaryCards summary={evalResult.summary} />

              {evalResult.section_summaries.length > 1 && (
                <SectionBreakdown sections={evalResult.section_summaries} />
              )}

              <MarkingSchemeInput
                scheme={marking}
                onChange={handleReEvaluate}
                disabled={reEvalLoading}
              />

              <QuestionTable questions={evalResult.questions} />
            </>
          ) : (
            <PaperReview result={evalResult} sheet={sheet} />
          )}
        </>
      )}

      {/* Show message when parsed but no evaluation (no answer key in sheet) */}
      {sheet && !evalResult && !loading && (
        <div className="card p-6 text-center">
          <p className="text-slate-600">Response sheet parsed but no answer key found in the sheet.</p>
          <p className="text-sm text-slate-400 mt-1">The sheet does not contain tick/cross answer markers.</p>
        </div>
      )}
    </div>
  )
}
