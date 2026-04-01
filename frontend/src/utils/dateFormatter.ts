export function timeAgo(iso?: string | Date | number) {
  if (!iso) return ''
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
  const weeks = Math.floor(diff / (7 * 86400))
  if (weeks < 5) return `${weeks}w ago`
  // fallback to locale date
  try { return d.toLocaleString() } catch (e) { return String(d) }
}

export function fullDate(iso?: string | Date | number) {
  if (!iso) return ''
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso
  try { return d.toLocaleString() } catch (e) { return String(d) }
}
