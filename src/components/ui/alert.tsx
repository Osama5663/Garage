import React from 'react'

type Variant = 'default' | 'destructive'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

export function Alert({ variant = 'default', className = '', ...rest }: AlertProps) {
  const styles = variant === 'destructive' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gray-50 border border-gray-200 text-gray-700'
  return <div className={`flex items-center gap-2 p-3 rounded ${styles} ${className}`} {...rest} />
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription(props: AlertDescriptionProps) {
  const { className = '', ...rest } = props
  return <p className={`text-sm ${className}`} {...rest} />
}

