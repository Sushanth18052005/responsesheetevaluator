import { Home } from './pages/Home'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">CDN Response Sheet Evaluator</h1>
            <p className="text-xs text-slate-500 mt-0.5">Parse, evaluate & export CDN3 response sheets</p>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">Made by P. Sushanth Reddy</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Home />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-600">Made by P. Sushanth Reddy</p>
          <p className="text-xs text-slate-400 mt-1">CDN Response Sheet Evaluator v1.0</p>
        </div>
      </footer>
    </div>
  )
}
