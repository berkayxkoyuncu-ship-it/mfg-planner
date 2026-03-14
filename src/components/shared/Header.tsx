import { NavLink } from 'react-router-dom'

export function Header() {
  return (
    <header
      className="flex items-center px-5 h-13 gap-6 flex-shrink-0"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        height: '52px',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: '#2563eb' }}
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: '#111827', fontFamily: "'DM Sans', sans-serif" }}
        >
          Üretim Planlama
        </span>
      </div>

      {/* Nav */}
      <nav className="flex gap-0.5">
        {[
          { to: '/', label: 'Planlama', end: true },
          { to: '/actuals', label: 'Gerçekleşen' },
          { to: '/settings', label: 'Ayarlar' },
        ].map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-[#2563eb] bg-[#eff6ff]'
                  : 'text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]'
              }`
            }
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
