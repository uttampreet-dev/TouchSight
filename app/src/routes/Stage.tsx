import { Brand } from '../components/Brand'

export function Stage() {
  return (
    <main className="dark" style={{ minHeight: '100%', padding: 24 }}>
      <Brand />
      <h1 className="h1" style={{ marginTop: 16 }}>Projector view</h1>
      <p style={{ color: '#9fb8b8' }}>Mirrors the student's finger. Built in Stage 7.</p>
    </main>
  )
}
