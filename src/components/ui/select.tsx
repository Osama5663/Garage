import React, { createContext, useContext } from 'react'

interface SelectContextValue {
  value: string
  onValueChange: (v: string) => void
}

const SelectCtx = createContext<SelectContextValue | null>(null)

interface SelectProps {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  required?: boolean
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return <SelectCtx.Provider value={{ value, onValueChange }}>{children}</SelectCtx.Provider>
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function SelectTrigger({ children, className = '', ...rest }: SelectTriggerProps) {
  return <button type="button" className={`w-full border border-gray-300 rounded px-3 py-2 text-left ${className}`} {...rest}>{children}</button>
}

interface SelectValueProps {
  placeholder?: string
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const ctx = useContext(SelectCtx)
  return <span className="text-gray-700">{ctx?.value || placeholder || ''}</span>
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SelectContent({ children, className = '', ...rest }: SelectContentProps) {
  return <div className={`mt-2 border border-gray-200 rounded bg-white shadow-sm ${className}`} {...rest}>{children}</div>
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function SelectItem({ value, children, className = '', ...rest }: SelectItemProps) {
  const ctx = useContext(SelectCtx)
  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange(value)}
      className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

