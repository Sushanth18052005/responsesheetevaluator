import type { SectionSummary } from '../types';

interface Props {
  sections: SectionSummary[];
}

export function SectionBreakdown({ sections }: Props) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Section-wise Breakdown</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Section</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Correct</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Wrong</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Unanswered</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(s => (
              <tr key={s.section} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-700">{s.section}</td>
                <td className="py-2 px-3 text-center text-slate-600">{s.total}</td>
                <td className="py-2 px-3 text-center text-green-600 font-medium">{s.correct}</td>
                <td className="py-2 px-3 text-center text-red-600 font-medium">{s.wrong}</td>
                <td className="py-2 px-3 text-center text-slate-400">{s.unanswered}</td>
                <td className="py-2 px-3 text-center font-medium text-slate-700">{s.score}</td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, s.percentage))}%`,
                          background: s.percentage >= 80 ? '#16a34a' : s.percentage >= 50 ? '#2563eb' : s.percentage >= 30 ? '#d97706' : '#dc2626',
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-12 text-right">{s.percentage.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
