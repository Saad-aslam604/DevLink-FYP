import { useEffect } from 'react'

export default function useFocusTrap(ref: React.RefObject<HTMLElement> | null, active: boolean) {
  useEffect(() => {
    if (!active || !ref || !ref.current) return
    const node = ref.current
    const focusable = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex], [contenteditable]'
    const elements = Array.from(node.querySelectorAll<HTMLElement>(focusable)).filter(el => el.tabIndex !== -1)
    if (elements.length === 0) return
    const first = elements[0]
    const last = elements[elements.length - 1]

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    // focus first
    setTimeout(()=> first.focus(), 0)
    return () => document.removeEventListener('keydown', handler)
  }, [ref, active])
}
