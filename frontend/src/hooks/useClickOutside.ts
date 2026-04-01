import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement = HTMLElement>(callback: () => void, closeOnEsc = true) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') callback()
    }

    document.addEventListener('mousedown', handleClick)
    if (closeOnEsc) document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      if (closeOnEsc) document.removeEventListener('keydown', handleKey)
    }
  }, [callback, closeOnEsc])

  return ref
}

export default useClickOutside
