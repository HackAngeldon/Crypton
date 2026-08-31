import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block, loading, className = '', children, disabled, ...rest }: Props) {
  const sizes = {
    sm: 'h-9 px-3.5 text-sm rounded-xl',
    md: 'h-11 px-5 text-sm rounded-2xl',
    lg: 'h-12 px-6 text-base rounded-2xl',
    xl: 'h-14 px-6 text-base rounded-2xl',
  }
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'border border-brand/40 text-brand bg-brand/10',
  }
  return (
    <button
      className={`btn ${sizes[size]} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}

export function IconButton({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`press inline-flex h-10 w-10 items-center justify-center rounded-xl bg-fill/10 border border-hairlinestrong text-content ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
