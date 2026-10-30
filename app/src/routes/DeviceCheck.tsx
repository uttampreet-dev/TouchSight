import { useEffect, useState } from 'react'
import { Brand } from '../components/Brand'
import { hapticsSupported, vibrate, TEXTURE_PULSE, CORRECT_PULSE } from '../device/haptics'
import { speechSupported, speak } from '../device/speech'
import { db } from '../store/db'

const LANGS: [string, string][] = [['en', 'English'], ['hi', 'Hindi'], ['pa', 'Punjabi']]

/** Stage 0 gate, on the device itself: installed? offline-capable? vibrates? speaks? stores? */
export function DeviceCheck() {
  const [standalone, setStandalone] = useState(false)
  const [sw, setSw] = useState<'checking' | 'active' | 'none'>('checking')
  const [online, setOnline] = useState(navigator.onLine)
  const [dbOk, setDbOk] = useState<'checking' | 'ok' | 'fail'>('checking')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setStandalone(mq.matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
    navigator.serviceWorker?.getRegistration().then((r) => setSw(r?.active ? 'active' : 'none')).catch(() => setSw('none'))
    db().then(() => setDbOk('ok')).catch(() => setDbOk('fail'))
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const vc = () => setVoices(window.speechSynthesis?.getVoices() ?? [])
    vc()
    if (speechSupported()) window.speechSynthesis.onvoiceschanged = vc
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const Row = ({ label, ok, note }: { label: string; ok: boolean | null; note?: string }) => (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {note && <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{note}</div>}
      </div>
      <span className="mono" style={{ fontWeight: 700, color: ok === null ? 'var(--muted)' : ok ? 'var(--green)' : 'var(--coral)' }}>
        {ok === null ? '…' : ok ? 'PASS' : 'FAIL'}
      </span>
    </div>
  )

  return (
    <main style={{ padding: 20, display: 'grid', gap: 12, maxWidth: 560 }}>
      <Brand />
      <div className="kicker">Device check</div>
      <Row label="Opened from home-screen icon" ok={standalone} note={standalone ? 'display-mode: standalone' : 'open the installed app, not a browser tab'} />
      <Row label="Offline capable (service worker)" ok={sw === 'checking' ? null : sw === 'active'} note={`network: ${online ? 'online' : 'offline'}`} />
      <Row label="Local store (IndexedDB)" ok={dbOk === 'checking' ? null : dbOk === 'ok'} />
      <Row label="Vibration API" ok={hapticsSupported()} note={hapticsSupported() ? 'navigator.vibrate present' : 'not on this browser (iOS Safari has none)'} />
      <Row label="Speech synthesis" ok={speechSupported()} note={`${voices.length} voices loaded`} />
      {LANGS.map(([code, label]) => {
        const found = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(code))
        return <Row key={code} label={`Voice · ${label}`} ok={voices.length === 0 ? null : found.length > 0} note={found.length ? found.map((v) => v.name).slice(0, 3).join(', ') : `no ${code}-* voice installed; the app falls back to the default voice`} />
      })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {Object.entries(TEXTURE_PULSE).filter(([, p]) => p !== 0).map(([name, p]) => (
          <button key={name} className="btn" onClick={() => vibrate(p)}>
            buzz · {name}
          </button>
        ))}
        <button className="btn primary" onClick={() => vibrate(CORRECT_PULSE)}>buzz · correct</button>
        <button className="btn coral" onClick={() => speak('Left ventricle. Pumps oxygenated blood into the aorta.', 'en')}>speak · English</button>
        <button className="btn" onClick={() => speak('बायाँ निलय', 'hi')}>speak · हिन्दी</button>
        <button className="btn" onClick={() => speak('ਖੱਬਾ ਨਿਲਯ', 'pa')}>speak · ਪੰਜਾਬੀ</button>
      </div>
      <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
        Gate: every row PASS with Wi-Fi off, and every buzz button is felt. A missing Hindi or Punjabi voice is a phone setting (Settings → Text-to-speech → install the language), not an app fault.
      </p>
    </main>
  )
}
