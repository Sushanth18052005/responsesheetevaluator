import { useState } from 'react';
import type { LoadingStage } from '../types';
import { LoadingProgress } from './LoadingProgress';

interface Props {
  onFetch: (url: string) => void;
  loading: boolean;
  loadingStage: LoadingStage;
}

export function UrlInput({ onFetch, loading, loadingStage }: Props) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onFetch(url.trim());
  };

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Response Sheet URL</h2>
      <p className="text-sm text-slate-500 mb-4">
        Paste the full CDN response sheet link below. The answer key and your responses will be auto-extracted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cdn-url" className="label">CDN Response Sheet URL</label>
          <input
            id="cdn-url"
            type="url"
            className="input-field font-mono text-sm"
            placeholder="https://cdn3.digialm.com/.../.html"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
            autoComplete="url"
            spellCheck={false}
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={loading || !url.trim()}
        >
          {loading ? 'Fetching & Evaluating...' : 'Fetch & Evaluate'}
        </button>
      </form>

      {loading && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <LoadingProgress stage={loadingStage} />
        </div>
      )}
    </div>
  );
}
