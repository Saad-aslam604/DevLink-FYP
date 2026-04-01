import React, { useEffect } from 'react'

const STYLE_ID = 'devlink-enhancements-icons-style'

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const css = `
  :root{
    --primary: #2563eb;
    --success: #10b981;
    --error: #ef4444;
    --neutral: #6b7280;
    --background: #1e293b;
  }
  .devlink-spinner{ width:16px; height:16px; border:2px solid #ffffff; border-top-color: transparent; border-radius:50%; animation: devlink-spin 1s linear infinite; }
  @keyframes devlink-spin { 0%{ transform: rotate(0deg); } 100%{ transform: rotate(360deg); } }
  .devlink-icon{ display:inline-flex; align-items:center; justify-content:center; }
  `
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.innerHTML = css
  document.head.appendChild(style)
}

export const PlayIcon = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return (
    <svg className="devlink-icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

export const UsersIcon = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return (
    <svg className="devlink-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" />
    </svg>
  )
}

export const CheckCircleIcon = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return (
    <svg className="devlink-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" />
    </svg>
  )
}

export const AlertCircleIcon = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return (
    <svg className="devlink-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M12 8v4" stroke="currentColor" />
      <path d="M12 16h.01" stroke="currentColor" />
    </svg>
  )
}

export const ClearIcon = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return (
    <svg className="devlink-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" />
    </svg>
  )
}

export const Spinner = ({ size = 16 }: { size?: number }) => {
  useEffect(() => { injectStyles() }, [])
  return <div className="devlink-spinner" style={{ width: size, height: size }} aria-hidden />
}

export default {
  PlayIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClearIcon,
  Spinner,
}
