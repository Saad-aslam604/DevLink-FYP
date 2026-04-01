import React, { useEffect, useRef, useState } from 'react'
import CodeExecutor from './CodeExecutor'

type Position = 'bottom' | 'middle' | 'top'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const DraggableTerminal: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [position, setPosition] = useState<Position>('bottom')
  const [height, setHeight] = useState<number>(300)
  const [isDragging, setIsDragging] = useState(false)
  const terminalRef = useRef<HTMLDivElement | null>(null)

  // Load saved position from localStorage
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('terminal-position')
      const savedHeight = localStorage.getItem('terminal-height')
      if (savedPosition && (savedPosition === 'bottom' || savedPosition === 'middle' || savedPosition === 'top')) {
        setPosition(savedPosition)
      }
      if (savedHeight) {
        const h = parseInt(savedHeight, 10)
        if (!isNaN(h)) setHeight(clamp(h, 150, 800))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Save position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('terminal-position', position)
      localStorage.setItem('terminal-height', String(height))
    } catch (e) {
      // ignore
    }
  }, [position, height])

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    let raf = 0
    const handleDrag = (e: MouseEvent) => {
      if (!isDragging) return
      if (!terminalRef.current) return
      // Use requestAnimationFrame for smoothness
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const containerHeight = window.innerHeight
        const mouseY = e.clientY
        // If mouse near top 30% => top; near bottom 30% => bottom; else middle
        if (mouseY < containerHeight * 0.3) setPosition('top')
        else if (mouseY > containerHeight * 0.7) setPosition('bottom')
        else setPosition('middle')
        // Also adjust height relative to bottom when dragging near bottom
        const newHeight = clamp(containerHeight - mouseY, 150, containerHeight - 100)
        setHeight(newHeight)
      })
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', handleDragEnd)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging])

  const positionClasses: Record<Position, string> = {
    bottom: 'bottom-0 translate-y-0',
    middle: 'top-1/2 -translate-y-1/2',
    top: 'top-0 translate-y-0',
  }

  const positionLabels: Record<Position, string> = {
    bottom: 'Bottom',
    middle: 'Middle',
    top: 'Top',
  }

  return (
    <div
      ref={terminalRef}
      className={`draggable-terminal fixed left-0 right-0 border-t border-gray-700 bg-gray-900 transition-all duration-200 ${positionClasses[position]}`}
      style={{ height: `${height}px` }}
    >
      {/* Drag Handle */}
      <div
        className="resize-handle h-3 w-full bg-gray-800 hover:bg-gray-700 cursor-ns-resize flex items-center justify-center"
        onMouseDown={handleDragStart}
        role="separator"
        aria-orientation="vertical"
      >
        <div className="w-24 h-1 bg-gray-600 rounded-full" />
      </div>

      {/* Terminal Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">Terminal</span>

          {/* Position Selector */}
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            {(['bottom', 'middle', 'top'] as Position[]).map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`px-3 py-1 rounded-md text-sm ${
                  position === pos ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {positionLabels[pos]}
              </button>
            ))}
          </div>
        </div>

        {/* Height Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHeight((h) => clamp(h - 50, 150, 800))}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            aria-label="Decrease height"
          >
            -
          </button>
          <span className="text-gray-300 text-sm">{height}px</span>
          <button
            onClick={() => setHeight((h) => clamp(h + 50, 150, 800))}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
            aria-label="Increase height"
          >
            +
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setPosition('bottom')
              setHeight(300)
            }}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div style={{ height: `calc(100% - 56px)` }} className="overflow-auto">
        <CodeExecutor code={code} language={language} />
      </div>
    </div>
  )
}

export default DraggableTerminal
