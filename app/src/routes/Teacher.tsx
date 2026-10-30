import { Link, Route, Routes } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Understand } from './teacher/Understand'

export function Teacher() {
  return (
    <main>
      <header style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ textDecoration: 'none' }}><Brand /></Link>
        <span className="kicker">Teacher console</span>
        <nav style={{ display: 'flex', gap: 14, marginLeft: 'auto' }} className="mono">
          <Link to="/teacher/understand">understand</Link>
        </nav>
      </header>
      <Routes>
        <Route index element={<p style={{ padding: 20, color: 'var(--slate)' }}>Capture → review → validate → publish.</p>} />
        <Route path="understand" element={<Understand />} />
      </Routes>
    </main>
  )
}
