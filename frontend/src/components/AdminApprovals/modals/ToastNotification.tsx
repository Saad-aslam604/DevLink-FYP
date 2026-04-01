import React, { useEffect } from 'react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose?: (id: string) => void
}

const bgFor = (t: ToastProps['type']) => {
  if (t === 'success') return 'bg-green-600'
  if (t === 'error') return 'bg-red-600'
  if (t === 'warning') return 'bg-yellow-600'
  return 'bg-blue-600'
}

const ToastNotification: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
  useEffect(()=>{
    const t = setTimeout(()=> onClose && onClose(id), duration)
    return () => clearTimeout(t)
  }, [id, duration, onClose])

  return (
    <div className={`text-white px-4 py-2 rounded shadow ${bgFor(type)}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}

export default ToastNotification
