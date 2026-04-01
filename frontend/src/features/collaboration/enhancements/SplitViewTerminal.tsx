import React, { useEffect, useState } from 'react'
import CodeExecutor from './CodeExecutor'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const SplitViewTerminal: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [terminalHeight, setTerminalHeight] = useState<number>(300)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isResizing, setIsResizing] = useState<boolean>(false)

  useEffect(() => {
    try {
      const savedHeight = localStorage.getItem('terminal-split-height')
      const savedCollapsed = localStorage.getItem('terminal-collapsed')
      if (savedHeight) setTerminalHeight(clamp(parseInt(savedHeight, 10) || 300, 200, 600))
      if (savedCollapsed) setIsCollapsed(savedCollapsed === 'true')
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('terminal-split-height', String(terminalHeight))
      localStorage.setItem('terminal-collapsed', String(isCollapsed))
    } catch (e) {
      // ignore
    }
  }, [terminalHeight, isCollapsed])

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return
      const windowHeight = window.innerHeight
      const newHeight = clamp(windowHeight - e.clientY, 200, 600)
      setTerminalHeight(newHeight)
    }

    const handleResizeEnd = () => setIsResizing(false)

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing])

  const handleReset = () => {
    setTerminalHeight(300)
    setIsCollapsed(false)
  }

  if (isCollapsed) {
    return (
      <div className="terminal-split border-t border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <span>▶</span>
            <span>Show Terminal</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="terminal-split terminal-bottom border-t border-gray-700 bg-gray-900"
      style={{
        height: `${terminalHeight}px`,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {/* Resize Handle */}
      <div
        className="h-2 w-full bg-gray-800 hover:bg-gray-700 cursor-ns-resize flex items-center justify-center"
        onMouseDown={handleResizeStart}
      >
        <div className="w-24 h-1 bg-gray-600 rounded-full" />
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="font-medium text-white">Terminal</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-1 bg-gray-900 rounded">{language}</span>
            <span className="px-2 py-1 bg-gray-900 rounded">Output</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTerminalHeight((h) => Math.max(200, h - 50))}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            title="Decrease height"
          >
            -
          </button>
          <button
            onClick={() => setTerminalHeight((h) => Math.min(600, h + 50))}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            title="Increase height"
          >
            +
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            title="Hide terminal"
          >
            ↓
          </button>
          <button onClick={handleReset} className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm">
            Reset
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-auto">
        <CodeExecutor code={code} language={language} />
      </div>
    </div>
  )
}

export default SplitViewTerminal
