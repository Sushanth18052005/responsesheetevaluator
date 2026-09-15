import type { EvaluationSummary as SummaryType } from '../types';

interface Props {
  summary: SummaryType;
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${color ?? 'text-slate-800'}`}>{value}</dd>
      {sub && <dd className="text-xs text-slate-400 mt-0.5">{sub}</dd>}
    </div>
  );
}

export function EvaluationSummaryCards({ summary }: Props) {
  const s = summary;
  const pctBar = Math.max(0, Math.min(100, s.percentage));

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-base font-semibold text-slate-800">Performance Summary</h2>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={s.total_questions} />
        <StatCard label="Attempted" value={s.attempted} />
        <StatCard label="Correct" value={s.correct} color="text-green-600" />
        <StatCard label="Wrong" value={s.wrong} color="text-red-600" />
        <StatCard label="Unanswered" value={s.unanswered} color="text-slate-500" />
        <StatCard label="Score" value={`${s.score} / ${s.maximum_score}`} color="text-blue-700" />
        <StatCard label="Percentage" value={`${s.percentage.toFixed(1)}%`} color="text-blue-700" />
        <StatCard label="Accuracy" value={`${s.accuracy.toFixed(1)}%`} sub="correct / attempted" color="text-indigo-600" />
      </dl>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Score</span>
          <span>{s.percentage.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pctBar}%`,
              background: pctBar >= 80 ? '#16a34a' : pctBar >= 50 ? '#2563eb' : pctBar >= 30 ? '#d97706' : '#dc2626',
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600">Correct {s.correct}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-600">Wrong {s.wrong}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="text-slate-600">Unanswered {s.unanswered}</span>
        </div>
      </div>
    </div>
  );
}
