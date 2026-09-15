import type { CDNResponse } from '../types';

interface Props {
  sheet: CDNResponse;
}

const Field = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  ) : null;

export function CandidateInfo({ sheet }: Props) {
  const hasInfo = sheet.candidate_name || sheet.candidate_id || sheet.exam_name || sheet.exam_date;

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              CDN ID
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">{sheet.cdn_id}</span>
          </div>
          {hasInfo && (
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Candidate Name" value={sheet.candidate_name} />
              <Field label="Candidate ID" value={sheet.candidate_id} />
              <Field label="Exam" value={sheet.exam_name} />
              <Field label="Date" value={sheet.exam_date} />
              <Field label="Subject" value={sheet.subject} />
            </dl>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs text-slate-400">Questions parsed</span>
          <p className="text-2xl font-bold text-slate-700">{sheet.parsed_questions}</p>
        </div>
      </div>

      {sheet.parser_warnings.length > 0 && (
        <div className="mt-4 space-y-1">
          {sheet.parser_warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
