import React from 'react'
import { Link } from 'react-router-dom'

type BreadcrumbItem = { to?: string; label: string }
type BreadcrumbsProps = { items: BreadcrumbItem[] }

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="text-sm text-gray-600 dark:text-gray-300 mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {it.to ? <Link to={it.to} className="hover:underline">{it.label}</Link> : <span>{it.label}</span>}
            {idx < items.length - 1 ? <span className="opacity-50">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}
