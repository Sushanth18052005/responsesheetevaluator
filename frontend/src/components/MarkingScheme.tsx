import type { MarkingScheme } from '../types';

interface Props {
  scheme: MarkingScheme;
  onChange: (s: MarkingScheme) => void;
  disabled?: boolean;
}

const PRESETS = [
  { label: 'Simple (+1/0/0)', scheme: { correct: 1, wrong: 0, unanswered: 0 } },
  { label: 'JEE (+4/−1/0)', scheme: { correct: 4, wrong: -1, unanswered: 0 } },
  { label: 'NEET (+4/−1/0)', scheme: { correct: 4, wrong: -1, unanswered: 0 } },
  { label: 'Mild negative (+1/−0.25/0)', scheme: { correct: 1, wrong: -0.25, unanswered: 0 } },
];

function SchemeField({
  label, value, onChange, disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input
        type="number"
        step="0.01"
        className="input-field text-sm"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
      />
    </div>
  );
}

export function MarkingSchemeInput({ scheme, onChange, disabled }: Props) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Marking Scheme</h2>
      <p className="text-sm text-slate-500 mb-4">Configure marks for each outcome.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.scheme)}
            disabled={disabled}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              scheme.correct === p.scheme.correct &&
              scheme.wrong === p.scheme.wrong &&
              scheme.unanswered === p.scheme.unanswered
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SchemeField
          label="Correct"
          value={scheme.correct}
          onChange={v => onChange({ ...scheme, correct: v })}
          disabled={disabled}
        />
        <SchemeField
          label="Wrong"
          value={scheme.wrong}
          onChange={v => onChange({ ...scheme, wrong: v })}
          disabled={disabled}
        />
        <SchemeField
          label="Unanswered"
          value={scheme.unanswered}
          onChange={v => onChange({ ...scheme, unanswered: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
