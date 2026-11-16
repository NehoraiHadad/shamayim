import { conditionLabel, type ConditionKind } from '../domain/conditions'

interface Props {
  kind: ConditionKind
  isDay?: boolean
  size?: number
  className?: string
}

const SUN = (
  <g>
    <circle cx="12" cy="12" r="4.2" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a} x1="12" y1="2.6" x2="12" y2="4.8" transform={`rotate(${a} 12 12)`} />
    ))}
  </g>
)
const MOON = <path d="M15.5 4.5a7.5 7.5 0 1 0 4 12.6A6.2 6.2 0 0 1 15.5 4.5z" />
const CLOUD = <path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .4-7.6 5.2 5.2 0 0 0-10-.9A3.9 3.9 0 0 0 7.5 18.5z" />
const SMALL_SUN = (
  <g transform="translate(-3.5 -4) scale(0.72)">{SUN}</g>
)
const SMALL_MOON = <g transform="translate(-3 -3.5) scale(0.7)">{MOON}</g>
const drops = (n: number) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const x = 8.5 + i * (7 / Math.max(1, n - 1))
      return <line key={i} x1={x} y1="20" x2={x - 1} y2="22.6" />
    })}
  </g>
)

/** Hand-drawn 24px line icons. Stroke inherits `currentColor`. */
export function WeatherIcon({ kind, isDay = true, size = 28, className }: Props) {
  const label = conditionLabel(kind, isDay)
  const body = (() => {
    switch (kind) {
      case 'clear':
        return isDay ? SUN : MOON
      case 'partly':
        return (
          <>
            {isDay ? SMALL_SUN : SMALL_MOON}
            <g transform="translate(1.5 1)">{CLOUD}</g>
          </>
        )
      case 'cloudy':
        return <g transform="translate(0 -2)">{CLOUD}</g>
      case 'fog':
        return (
          <g>
            {[8, 12, 16].map((y, i) => (
              <line key={y} x1={4 + i} y1={y} x2={20 - i} y2={y} />
            ))}
          </g>
        )
      case 'drizzle':
        return <><g transform="translate(0 -3)">{CLOUD}</g>{drops(2)}</>
      case 'rain':
      case 'showers':
        return <><g transform="translate(0 -3)">{CLOUD}</g>{drops(3)}</>
      case 'thunder':
        return (
          <>
            <g transform="translate(0 -3)">{CLOUD}</g>
            <path d="M12.5 17l-2 3.2h3l-2 3.3" />
          </>
        )
      case 'snow':
        return <><g transform="translate(0 -3)">{CLOUD}</g><g>{[9, 12, 15].map((x) => <circle key={x} cx={x} cy="21" r="0.7" />)}</g></>
    }
  })()
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {body}
    </svg>
  )
}
