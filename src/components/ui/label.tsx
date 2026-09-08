import React from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label(props: LabelProps) {
  const { className = '', ...rest } = props
  return <label className={`block text-sm font-medium text-gray-700 mb-2 ${className}`} {...rest} />
}

