import React from 'react'

type Variant = 'default' | 'destructive' | 'success' | 'secondary' | 'outline'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

export function Badge({ variant = 'default', className = '', ...rest }: BadgeProps) {
  const styles =
    variant === 'destructive'
      ? 'bg-red-100 text-red-700'
      : variant === 'success'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles} ${className}`} {...rest} />
}
