import { useState } from 'react'
import { ErrorMessage } from './ErrorMessage'

interface Props {
  onCdnUrl: (url: string) => void
  loading: boolean
}

export function TgtetForm({ onCdnUrl, loading }: Props) {
  const [journal, setJournal] = useState('')
  const [hallticket, setHallticket] = useState('')
  const [dob, setDob] = useState('')
  const [paper, setPaper] = useState('Paper-I')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!journal.trim() || !hallticket.trim() || !dob.trim()) {
      setError('Please fill in all fields.')
      return
    }

    // Validate DOB format dd/MM/yyyy
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob.trim())) {
      setError('DOB must be in dd/MM/yyyy format (e.g. 15/06/1995).')
      return
    }

    setSubmitting(true)
    try {
      const resp = await fetch('/api/fetch-tgtet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journal_number: journal.trim(),
          hallticket_number: hallticket.trim(),
          dob: dob.trim(),
          exam_paper: paper,
        }),
      })
      const data = await resp.json()
      if (data.success && data.cdn_url) {
        onCdnUrl(data.cdn_url)
      } else {
        setError(data.error || 'Could not retrieve response sheet link.')
      }
    } catch {
      setError('Failed to connect to server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">TGTET Response Sheet Lookup</h2>
      <p className="text-sm text-slate-500 mb-4">
        Enter your TGTET details to automatically fetch your response sheet.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tgtet-journal" className="label">Journal Number</label>
            <input
              id="tgtet-journal"
              type="text"
              className="input-field text-sm"
              placeholder="Enter Journal Number"
              value={journal}
              onChange={e => setJournal(e.target.value)}
              disabled={submitting || loading}
            />
          </div>
          <div>
            <label htmlFor="tgtet-hallticket" className="label">HallTicket Number</label>
            <input
              id="tgtet-hallticket"
              type="text"
              className="input-field text-sm"
              placeholder="Enter HallTicket Number"
              value={hallticket}
              onChange={e => setHallticket(e.target.value)}
              disabled={submitting || loading}
            />
          </div>
          <div>
            <label htmlFor="tgtet-dob" className="label">Date of Birth (dd/MM/yyyy)</label>
            <input
              id="tgtet-dob"
              type="text"
              className="input-field text-sm"
              placeholder="15/06/1995"
              value={dob}
              onChange={e => setDob(e.target.value)}
              disabled={submitting || loading}
            />
          </div>
          <div>
            <label htmlFor="tgtet-paper" className="label">Exam Paper</label>
            <select
              id="tgtet-paper"
              className="input-field text-sm"
              value={paper}
              onChange={e => setPaper(e.target.value)}
              disabled={submitting || loading}
            >
              <option value="Paper-I">Paper-I</option>
              <option value="Paper-II">Paper-II</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={submitting || loading || !journal.trim() || !hallticket.trim() || !dob.trim()}
        >
          {submitting ? 'Fetching...' : 'Fetch Response Sheet'}
        </button>
      </form>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}
    </div>
  )
}
