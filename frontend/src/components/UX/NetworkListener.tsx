import React, { useEffect, useRef } from 'react'
import { useToast } from './ToastProvider'

export default function NetworkListener() {
  const toast = useToast()
  const offlineToastId = useRef<string | null>(null)

  useEffect(() => {
    function onOffline() {
      // show a persistent-ish error toast for offline
      toast.show("You're offline — some actions may not work", 'error', { duration: 8000 })
    }

    function onOnline() {
      toast.show("You're back online", 'success', { duration: 3000 })
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    // initial state
    if (!navigator.onLine) {
      onOffline()
    }

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [toast])

  return null
}
