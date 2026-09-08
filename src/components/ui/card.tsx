import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card(props: CardProps) {
  const { className = '', ...rest } = props
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`} {...rest} />
}

export function CardHeader(props: CardHeaderProps) {
  const { className = '', ...rest } = props
  return <div className={`p-4 border-b border-gray-200 ${className}`} {...rest} />
}

export function CardTitle(props: CardTitleProps) {
  const { className = '', ...rest } = props
  return <h3 className={`text-lg font-medium text-gray-900 ${className}`} {...rest} />
}

export function CardDescription(props: CardDescriptionProps) {
  const { className = '', ...rest } = props
  return <p className={`text-sm text-gray-600 ${className}`} {...rest} />
}

export function CardContent(props: CardContentProps) {
  const { className = '', ...rest } = props
  return <div className={`p-4 ${className}`} {...rest} />
}

