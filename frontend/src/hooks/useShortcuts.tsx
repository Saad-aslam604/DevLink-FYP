import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function useShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    let keys: string[] = []
    function onKey(e: KeyboardEvent) {
      // Don't trigger shortcuts while typing into form controls or content editable areas
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        const isFormControl = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
        if (isFormControl) return
      }

      const k = e.key.toLowerCase()
      keys.push(k)
      // keep only last 2
      keys = keys.slice(-2)
      const combo = keys.join(' ')
      // g m -> go mentors, g s -> sessions, g i -> inbox/messages
      if (combo === 'g m') {
        navigate('/app/mentors')
        keys = []
      }
      if (combo === 'g s') {
        navigate('/app/sessions')
        keys = []
      }
      if (combo === 'g i') {
        navigate('/app/messages')
        keys = []
      }
      // ESC clears
      if (k === 'escape') keys = []
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
