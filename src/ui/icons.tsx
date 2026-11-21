import styles from './icons.module.css'

interface IconProps {
  size?: number
  className?: string
}

export function CloseIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Points forward in reading order: right in LTR, flipped left in RTL via CSS. */
export function PlayIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className ? `${styles.play} ${className}` : styles.play} aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

export function PauseIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5 5.5h3.5v13H6.5zm7.5 0h3.5v13H14z" />
    </svg>
  )
}
