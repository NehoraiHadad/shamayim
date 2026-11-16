/** Loading and error placeholders for the first load (no cached data yet). */

export function LoadingState() {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="skeleton skeleton-temp" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <span className="visually-hidden">טוען את התחזית…</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="state-title">לא הצלחנו להביא את התחזית</p>
      <p className="state-text">בדקו את החיבור לאינטרנט ונסו שוב.</p>
      {message && <p className="state-detail" dir="ltr">{message}</p>}
      <button type="button" className="state-button" onClick={onRetry}>נסו שוב</button>
    </div>
  )
}
