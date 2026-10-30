export function Brand({ size = 1 }: { size?: number }) {
  return (
    <span className="brand" style={{ transform: `scale(${size})`, transformOrigin: 'left center' }}>
      <span className="mark" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <b>TouchSight</b>
    </span>
  )
}
