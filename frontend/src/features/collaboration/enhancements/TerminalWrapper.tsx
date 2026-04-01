import React from 'react'
import CodeExecutor from './CodeExecutor'

interface TerminalWrapperProps {
  code: string
  language: string
}

const TerminalWrapper: React.FC<TerminalWrapperProps> = ({ code, language }) => {
  return (
    <div
      className="terminal-fix"
      style={{
        height: '300px',
        minHeight: '300px',
        maxHeight: '300px',
        flexShrink: 0,
        backgroundColor: '#111827',
        borderTop: '1px solid #374151',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <CodeExecutor code={code} language={language} />
    </div>
  )
}

export default TerminalWrapper
