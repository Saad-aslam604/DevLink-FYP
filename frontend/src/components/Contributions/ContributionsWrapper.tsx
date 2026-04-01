import React, { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

// ContributionsWrapper: non-invasive wrapper that adds subtle visual cues to
// the contributions area using Tailwind utility classes only. It is additive
// and does not modify inner markup or classes.
export default function ContributionsWrapper({ children, className = '' }: Props) {
  const wrapperCls = `contrib-wrapper border-l-4 border-blue-200 bg-blue-50 bg-opacity-30 pl-4 rounded-r-lg space-y-2 text-sm text-gray-600 ${className}`.trim()
  return (
    <div className={wrapperCls} aria-hidden={false}>
      {children}
    </div>
  )
}
