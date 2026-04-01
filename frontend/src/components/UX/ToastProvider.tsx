import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastAction = { label: string; onClick: () => void }
type Toast = { id: string; type?: 'success' | 'error' | 'info'; message: string; action?: ToastAction; duration?: number }

type ToastShow = (message: string, type?: Toast['type'], opts?: { action?: ToastAction; duration?: number }) => void

const ToastContext = createContext<{ show: ToastShow } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, number>>({})

  const remove = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id))
    if (timers.current[id]) {
      try { window.clearTimeout(timers.current[id]) } catch (e) {}
      delete timers.current[id]
    }
  }, [])

  const show: ToastShow = useCallback((message, type = 'info', opts) => {
    const id = String(Date.now()) + Math.random().toString(16).slice(2)
    const t: Toast = { id, type, message, action: opts?.action, duration: opts?.duration ?? 4000 }
    setToasts((s) => [...s, t])
    timers.current[id] = window.setTimeout(() => remove(id), t.duration)
  }, [remove])

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((tid) => { try { window.clearTimeout(tid) } catch (e) {} })
    }
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className="transform transition-all duration-200 ease-out">
            <div className={`px-4 py-2 rounded-md shadow-lg text-white flex items-center gap-4 ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
              <div className="flex-1 text-sm">{t.message}</div>
                {t.action ? (
                <button
                  type="button"
                  onClick={() => { t.action?.onClick(); remove(t.id) }}
                  className="text-white/90 underline text-sm"
                >
                  {t.action.label}
                </button>
              ) : null}
              <button type="button" onClick={() => remove(t.id)} className="text-white/70 text-xs px-2">✕</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
