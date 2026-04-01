import React, { useEffect, useState } from 'react'

export default function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 300)
    }
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed right-6 bottom-20 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-lg">
      ↑ Top
    </button>
  )
}
