import { Brand } from '../components/Brand'

export function Teacher() {
  return (
    <main style={{ padding: 24 }}>
      <Brand />
      <h1 className="h1" style={{ marginTop: 16 }}>Teacher console</h1>
      <p style={{ color: 'var(--slate)' }}>Capture → review → validate → publish. Built in Stage 5.</p>
    </main>
  )
}
