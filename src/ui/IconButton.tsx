import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'type'> {
  label: string
  children?: ReactNode
}

/** Accessible 44×44 icon button; focus ring comes from the global `:focus-visible` rule. */
export function IconButton({ label, className, children, ...rest }: Props) {
  return (
    <button type="button" aria-label={label} className={className ? `${styles.button} ${className}` : styles.button} {...rest}>
      {children}
    </button>
  )
}
