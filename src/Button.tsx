import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  highlighted?: boolean
  loading?: boolean
  children: ReactNode
}

/** Shared action button. Native `disabled` also blocks clicks and keyboard activation. */
export function Button({
  variant = 'primary',
  highlighted = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'action-button',
    `action-button--${variant}`,
    highlighted && 'action-button--highlighted',
    className,
  ].filter(Boolean).join(' ')

  return <button
    type="button"
    {...rest}
    className={classes}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
  >{children}</button>
}
