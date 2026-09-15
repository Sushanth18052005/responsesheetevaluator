import type { LoadingStage } from '../types';

const STAGES: { key: LoadingStage; label: string }[] = [
  { key: 'fetching', label: 'Fetching response sheet' },
  { key: 'evaluating', label: 'Extracting answers & evaluating' },
  { key: 'done', label: 'Evaluation complete' },
];

interface Props {
  stage: LoadingStage;
}

function stageIndex(stage: LoadingStage): number {
  return STAGES.findIndex(s => s.key === stage);
}

export function LoadingProgress({ stage }: Props) {
  const currentIdx = stageIndex(stage);

  return (
    <div className="space-y-2 p-4" role="status" aria-live="polite">
      {STAGES.map((s, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-3 text-sm">
            {isPast ? (
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold" aria-label="Done">✓</span>
            ) : isCurrent ? (
              <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" aria-label="In progress" />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-slate-200" aria-label="Waiting" />
            )}
            <span className={
              isPast ? 'text-green-700' :
              isCurrent ? 'text-blue-700 font-medium' :
              'text-slate-400'
            }>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
