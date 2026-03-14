import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/shared/Header'
import { PlanningPage } from './pages/PlanningPage'
import { ActualsPage } from './pages/ActualsPage'
import { SettingsPage } from './pages/SettingsPage'
import { HolidayProvider } from './contexts/HolidayContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const isConfigured = SUPABASE_URL && !SUPABASE_URL.includes('placeholder')

function SetupScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">MFG Planner</h1>
            <p className="text-sm text-slate-500">One-time setup required</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Connect your Supabase database to get started:</p>
          <ol className="space-y-3 list-decimal list-inside text-slate-600">
            <li>Go to <span className="font-mono text-indigo-600">supabase.com</span> → create a free account and new project</li>
            <li>In the SQL Editor, paste and run the contents of <span className="font-mono bg-slate-100 px-1 rounded">supabase-schema.sql</span> (in the project folder)</li>
            <li>Copy your project URL and anon key from <span className="font-mono bg-slate-100 px-1 rounded">Project Settings → API</span></li>
            <li>
              Edit <span className="font-mono bg-slate-100 px-1 rounded">mfg-planner/.env</span> and set:
              <pre className="bg-slate-900 text-green-400 rounded-lg p-3 mt-2 text-xs overflow-x-auto">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
            </li>
            <li>Save the file — the dev server will hot-reload automatically</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <SetupScreen />

  return (
    <HolidayProvider>
      <BrowserRouter>
        <div className="flex flex-col h-screen overflow-hidden">
          <Header />
          <Routes>
            <Route path="/" element={<PlanningPage />} />
            <Route path="/actuals" element={<ActualsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </HolidayProvider>
  )
}
