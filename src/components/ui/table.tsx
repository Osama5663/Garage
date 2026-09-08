import React from 'react'

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function Table({ className = '', ...rest }: TableProps) {
  return <table className={`min-w-full divide-y divide-gray-200 ${className}`} {...rest} />
}

export function TableHeader({ className = '', ...rest }: TableHeaderProps) {
  return <thead className={className} {...rest} />
}

export function TableBody({ className = '', ...rest }: TableBodyProps) {
  return <tbody className={`divide-y divide-gray-200 ${className}`} {...rest} />
}

export function TableRow({ className = '', ...rest }: TableRowProps) {
  return <tr className={className} {...rest} />
}

export function TableHead({ className = '', ...rest }: TableHeadProps) {
  return <th className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`} {...rest} />
}

export function TableCell({ className = '', ...rest }: TableCellProps) {
  return <td className={`px-3 py-2 text-sm text-gray-700 ${className}`} {...rest} />
}

