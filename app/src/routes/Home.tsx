import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

export function Home() {
  return (
    <main className="dark" style={{ minHeight: '100%', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Brand size={1.4} />
      <div>
        <div className="kicker">See the diagram with your hands</div>
        <h1 className="h1" style={{ margin: '8px 0 0', fontSize: 34 }}>
          A textbook can have a braille edition.
          <br />
          A blackboard can't.
        </h1>
      </div>
      <nav style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <Link className="btn primary" to="/teacher" style={{ padding: 16, fontSize: 17 }}>
          Teacher console
        </Link>
        <Link className="btn coral" to="/student" style={{ padding: 16, fontSize: 17 }}>
          Student app
        </Link>
        <Link className="btn ghost" to="/stage" style={{ color: '#eaf4f3', borderColor: 'rgba(127,212,203,.35)' }}>
          Projector view
        </Link>
        <Link className="btn ghost" to="/device" style={{ color: '#9fb8b8', borderColor: 'transparent' }}>
          Device check
        </Link>
      </nav>
    </main>
  )
}
